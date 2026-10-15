// leave-alerts — scheduled (pg_cron) edge function.
//
// Announces to ALL active staff, by personalized email + SMS, when a colleague
// is about to go on leave (a few days ahead), when they start leave, and when
// they return. Also writes in-app notifications.
//
// Auth: requires `Authorization: Bearer <CRON_SECRET>` (or the service role key).
// Idempotent: each (leave_id, event) is sent at most once via staff_notification_log.
// Self-healing: runs on a schedule and only sends on working days, so a missed
// run or a same-day approval is picked up on the next run instead of being lost.
//
// Env vars: CRON_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//           RESEND_API_KEY, INTECH_SMS_APP_KEY, INTECH_SMS_SENDER, INTECH_SMS_URL
//
// Deploy with JWT verification OFF (pg_cron sends a custom bearer secret, not a
// Supabase JWT):
//   supabase functions deploy leave-alerts --no-verify-jwt
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { getAdminClient, sendTemplatedEmail } from "../_shared/email.ts";
import { sendTemplatedSms, normalizePhone } from "../_shared/sms.ts";

const ORG_TIMEZONE = "Africa/Lagos";
const SEND_CONCURRENCY = 5;
// How far back to look for "returned" events. A leave's return is announced on
// the first working day after its end date, so the only gap a missed run needs
// to bridge is a long weekend / public holiday (~3 days). Keeping this small
// prevents the first deployment from emailing everyone who returned in the last
// two weeks.
const RETURNED_LOOKBACK_DAYS = 4;
// How many days ahead of a leave's start date to remind the team. The reminder
// is actually sent on the last working day on or before (start_date - this),
// so a Monday leave is announced on the previous working day, not a weekend.
const REMINDER_DAYS_BEFORE = 2;
// How far ahead to look for leaves that might need a reminder.
const REMINDER_WINDOW_DAYS = 10;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

function todayInOrgTz(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ORG_TIMEZONE }).format(new Date());
}

function daysBefore(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function daysAfter(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function isWeekend(isoDate: string): boolean {
  const dow = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return dow === 0 || dow === 6;
}

// The latest working day (not weekend, not holiday) on or before the given date.
// Used so a reminder is always delivered on a real working day.
function lastWorkingDayOnOrBefore(isoDate: string, holidays: any[]): string {
  const isHolidayDate = (iso: string) =>
    holidays.some((h) => h.date <= iso && (h.end_date || h.date) >= iso);
  let d = isoDate;
  let guard = 0;
  while ((isWeekend(d) || isHolidayDate(d)) && guard < 14) {
    d = daysBefore(d, 1);
    guard++;
  }
  return d;
}

async function mapLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = items[index++];
      try {
        await fn(current);
      } catch (err) {
        console.error("mapLimit item failed:", err);
      }
    }
  });
  await Promise.all(workers);
}

type Recipient = { id: number; name: string; email: string | null; phone: string | null };

const LEAVE_SELECT =
  "id, employee_id, leave_type_id, start_date, end_date, handover_to, " +
  "employee:employees!leaves_employee_id_fkey(id, user_id, name, department:departments(name)), " +
  "leave_type:leave_types!leaves_leave_type_id_fkey(title), " +
  "handover:employees!leaves_handover_to_fkey(id, name)";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const cronSecret = Deno.env.get("CRON_SECRET");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const authorized =
      (!!cronSecret && token === cronSecret) || (!!serviceKey && token === serviceKey);

    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dryRun") === "1";
    const today = todayInOrgTz();
    const windowStart = daysBefore(today, RETURNED_LOOKBACK_DAYS);
    const supabase = getAdminClient();

    // ---- Recipients: all active users (employee phone as fallback) ----
    const [{ data: users, error: usersErr }, { data: emps, error: empsErr }] = await Promise.all([
      supabase.from("users").select("id, name, email, phone, is_active").eq("is_active", 1),
      supabase.from("employees").select("user_id, name, phone"),
    ]);
    if (usersErr || empsErr) throw new Error(usersErr?.message || empsErr?.message);

    const empByUser = new Map<number, { name: string | null; phone: string | null }>();
    for (const e of emps || []) {
      if (e.user_id) empByUser.set(e.user_id, { name: e.name, phone: e.phone });
    }
    const recipients: Recipient[] = (users || []).map((u: any) => {
      const emp = empByUser.get(u.id);
      return {
        id: u.id,
        name: u.name || emp?.name || "Colleague",
        email: u.email || null,
        phone: u.phone || emp?.phone || null,
      };
    });

    // ---- Holidays (window covering today plus reminder walk-backs) ----
    const holidayFrom = daysBefore(today, 7);
    const holidayTo = daysAfter(today, REMINDER_WINDOW_DAYS);
    const { data: holidays } = await supabase
      .from("holidays")
      .select("date, end_date")
      .lte("date", holidayTo)
      .gte("end_date", holidayFrom);
    const isHoliday = (holidays || []).some(
      (h: any) => h.date <= today && (h.end_date || h.date) >= today
    );
    const workingDay = !isWeekend(today) && !isHoliday;

    // ---- Approved leaves covering today, and recently ended ----
    const [{ data: covering, error: cErr }, { data: ended, error: enErr }] = await Promise.all([
      supabase.from("leaves").select(LEAVE_SELECT).eq("status", "Approved")
        .lte("start_date", today).gte("end_date", today),
      supabase.from("leaves").select(LEAVE_SELECT).eq("status", "Approved")
        .lt("end_date", today).gte("end_date", windowStart),
    ]);
    if (cErr || enErr) throw new Error(cErr?.message || enErr?.message);

    const coveringRows = (covering as any[]) || [];
    const endedRows = (ended as any[]) || [];

    const onLeaveUserIds = new Set<number>();
    for (const l of coveringRows) {
      if (l.employee?.user_id) onLeaveUserIds.add(l.employee.user_id);
    }

    const summary = {
      date: today,
      workingDay,
      started: 0,
      returned: 0,
      reminded: 0,
      emails: 0,
      sms: 0,
      alreadySent: 0,
      dryRun,
    };

    async function alreadySent(leaveId: number, event: string): Promise<boolean> {
      try {
        const { data } = await supabase
          .from("staff_notification_log")
          .select("id")
          .eq("leave_id", leaveId)
          .eq("event", event)
          .maybeSingle();
        return !!data;
      } catch {
        // If the ledger is unavailable, fail open (send) rather than silently skip.
        return false;
      }
    }

    async function recordSent(leaveId: number, event: string, count: number): Promise<void> {
      try {
        await supabase.from("staff_notification_log").insert({ leave_id: leaveId, event });
        const actionByEvent: Record<string, string> = {
          start: "staff_on_leave_notified",
          returned: "staff_returned_notified",
          remind: "leave_reminder_notified",
        };
        const labelByEvent: Record<string, string> = {
          start: "On-leave",
          returned: "Returned",
          remind: "Upcoming-leave",
        };
        await supabase.from("audit_logs").insert({
          action: actionByEvent[event] || "staff_notified",
          description: `${labelByEvent[event] || event} announcement sent for leave #${leaveId} to ${count} staff`,
          severity: "INFO",
          entity_type: "leave",
          entity_id: leaveId,
        });
      } catch (logErr) {
        console.error("Failed to record notification log:", logErr);
      }
    }

    async function announce(leave: any, event: "start" | "returned" | "remind"): Promise<void> {
      if (await alreadySent(leave.id, event)) {
        summary.alreadySent++;
        return;
      }

      const subjectUserId: number | undefined = leave.employee?.user_id;
      const data = {
        employee_name: leave.employee?.name || "A colleague",
        department: leave.employee?.department?.name || "",
        leave_type: leave.leave_type?.title || "leave",
        start_date: leave.start_date,
        end_date: leave.end_date,
        handover_name: leave.handover?.name || "",
      };

      // Never tell staff about their own leave.
      const audience = recipients.filter((r) => r.id !== subjectUserId);

      // Public template/type name differs from the ledger event name.
      const templateType =
        event === "start"
          ? "staff_on_leave"
          : event === "returned"
            ? "staff_returned"
            : "staff_going_on_leave";

      if (dryRun) {
        console.log(`[dryRun] ${event} for leave #${leave.id} -> ${audience.length} recipients`);
        if (event === "start") summary.started++;
        else if (event === "returned") summary.returned++;
        else summary.reminded++;
        return;
      }

      const results = { emails: 0, sms: 0 };
      await mapLimit(audience, SEND_CONCURRENCY, async (r) => {
        const payload = { ...data, recipient_name: r.name };
        if (r.email) {
          const ok = await sendTemplatedEmail(supabase, templateType, r.email, payload);
          if (ok) results.emails++;
        }
        const phone = normalizePhone(r.phone);
        if (phone) {
          const ok = await sendTemplatedSms(supabase, templateType, phone, payload);
          if (ok) results.sms++;
        }
      });

      if (audience.length > 0) {
        try {
          await supabase.from("notifications").insert(
            audience.map((r) => ({
              user_id: r.id,
              type: templateType,
              data: JSON.stringify({
                leaveId: leave.id,
                employeeName: data.employee_name,
                leaveType: data.leave_type,
                startDate: leave.start_date,
                endDate: leave.end_date,
              }),
              is_read: 0,
            }))
          );
        } catch (nErr) {
          console.error("Failed to insert in-app notifications:", nErr);
        }
      }

      await recordSent(leave.id, event, audience.length);
      summary.emails += results.emails;
      summary.sms += results.sms;
      if (event === "start") summary.started++;
      else if (event === "returned") summary.returned++;
      else summary.reminded++;
    }

    if (workingDay) {
      // "Going on leave" reminder: for approved leaves starting in the next few
      // days, send on the last working day on/before (start_date - N days).
      const reminderWindowEnd = daysAfter(today, REMINDER_WINDOW_DAYS);
      const { data: upcoming, error: upErr } = await supabase
        .from("leaves")
        .select(LEAVE_SELECT)
        .eq("status", "Approved")
        .gt("start_date", today)
        .lte("start_date", reminderWindowEnd);
      if (upErr) throw new Error(upErr.message);
      for (const l of (upcoming as any[]) || []) {
        const target = lastWorkingDayOnOrBefore(
          daysBefore(l.start_date, REMINDER_DAYS_BEFORE),
          holidays || []
        );
        if (target === today) await announce(l, "remind");
      }

      // "On leave" for every approved leave covering today.
      for (const l of coveringRows) await announce(l, "start");

      // "Returned" for the most recent ended leave per employee who is not
      // currently on leave (i.e. this is their first day back).
      const latestByUser = new Map<number, any>();
      for (const l of endedRows) {
        const uid = l.employee?.user_id;
        if (!uid || onLeaveUserIds.has(uid)) continue;
        const prev = latestByUser.get(uid);
        if (!prev || l.end_date > prev.end_date) latestByUser.set(uid, l);
      }
      for (const l of latestByUser.values()) await announce(l, "returned");
    }

    return new Response(JSON.stringify({ success: true, ...summary }), {
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("leave-alerts error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
