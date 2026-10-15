// Shared email building + sending for BlueSPACE HR edge functions.
// Imported by: functions/email-sender, functions/leave-alerts
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const FROM_EMAIL = "BlueSPACE HR <noreply@control.bihlabs.com>";

export function getAdminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
}

type EmailData = Record<string, any>;

function greeting(data: EmailData): string {
  return data.recipient_name
    ? `<p style="font-size: 14px; margin: 0 0 16px;">Hi ${data.recipient_name},</p>`
    : "";
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );
}

export function buildEmail(type: string, data: EmailData): string | null {
  const base = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; color: #1e293b;">
      <div style="background: #1a365d; padding: 24px 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; font-size: 18px; margin: 0;">BlueSPACE HR</h1>
        <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0;">Leave Management System</p>
      </div>
      <div style="background: white; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
  `;

  const footer = `
      </div>
      <p style="text-align: center; color: #94a3b8; font-size: 11px; margin-top: 16px;">
        Bluespace Financial Cloud &copy; ${new Date().getFullYear()}
      </p>
    </div>
  `;

  if (type === "leave_submitted") {
    const halfDayLabel = data.half_day_type ? ` (${data.half_day_type === 'morning' ? 'Morning' : 'Afternoon'})` : '';
    return `${base}
      <h2 style="font-size: 16px; margin: 0 0 16px;">New Leave Request</h2>
      ${greeting(data)}
      <p style="font-size: 14px; margin: 0 0 16px;">A new leave request has been submitted and requires your review.</p>
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #64748b;">Employee</td><td style="padding: 8px 0; font-weight: 600;">${data.employee_name}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Leave Type</td><td style="padding: 8px 0; font-weight: 600;">${data.leave_type}${data.is_half_day ? ` (Half Day${halfDayLabel})` : ""}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Duration</td><td style="padding: 8px 0; font-weight: 600;">${data.start_date} to ${data.end_date}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Days</td><td style="padding: 8px 0; font-weight: 600;">${data.total_days}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Reason</td><td style="padding: 8px 0;">${data.reason || "Not provided"}</td></tr>
        ${data.handover_name ? `<tr><td style="padding: 8px 0; color: #64748b;">Handover To</td><td style="padding: 8px 0;">${data.handover_name}</td></tr>` : ""}
      </table>
      <p style="font-size: 13px; color: #64748b; margin: 20px 0 0;">Please log in to the HR portal to review and action this request.</p>
    ${footer}`;
  }

  if (type === "leave_approved") {
    const halfDayLabel = data.half_day_type ? ` (${data.half_day_type === 'morning' ? 'Morning' : 'Afternoon'})` : '';
    return `${base}
      <h2 style="font-size: 16px; margin: 0 0 16px; color: #059669;">Leave Approved</h2>
      ${greeting(data)}
      <p style="font-size: 14px; margin: 0 0 16px;">Your leave request has been approved.</p>
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #64748b;">Leave Type</td><td style="padding: 8px 0; font-weight: 600;">${data.leave_type}${data.is_half_day ? ` (Half Day${halfDayLabel})` : ""}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Duration</td><td style="padding: 8px 0; font-weight: 600;">${data.start_date} to ${data.end_date}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Days</td><td style="padding: 8px 0; font-weight: 600;">${data.total_days}</td></tr>
        ${data.remark ? `<tr><td style="padding: 8px 0; color: #64748b;">Remark</td><td style="padding: 8px 0;">${data.remark}</td></tr>` : ""}
      </table>
      <p style="font-size: 13px; color: #64748b; margin: 20px 0 0;">You can view your updated leave balance in the HR portal.</p>
    ${footer}`;
  }

  if (type === "leave_rejected") {
    return `${base}
      <h2 style="font-size: 16px; margin: 0 0 16px; color: #dc2626;">Leave Rejected</h2>
      ${greeting(data)}
      <p style="font-size: 14px; margin: 0 0 16px;">Your leave request has been rejected.</p>
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #64748b;">Leave Type</td><td style="padding: 8px 0; font-weight: 600;">${data.leave_type}${data.is_half_day ? " (Half Day)" : ""}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Duration</td><td style="padding: 8px 0; font-weight: 600;">${data.start_date} to ${data.end_date}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Days</td><td style="padding: 8px 0; font-weight: 600;">${data.total_days}</td></tr>
        ${data.remark ? `<tr><td style="padding: 8px 0; color: #64748b;">Reason</td><td style="padding: 8px 0;">${data.remark}</td></tr>` : ""}
      </table>
      <p style="font-size: 13px; color: #64748b; margin: 20px 0 0;">If you have questions, please contact your manager or HR administrator.</p>
    ${footer}`;
  }

  if (type === "employee_created") {
    return `${base}
      <h2 style="font-size: 16px; margin: 0 0 16px; color: #2563eb;">Welcome to BlueSPACE HR</h2>
      ${greeting(data)}
      <p style="font-size: 14px; margin: 0 0 16px;">Your account has been created. Use the credentials below to log in.</p>
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #64748b;">Name</td><td style="padding: 8px 0; font-weight: 600;">${data.employee_name}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Email</td><td style="padding: 8px 0; font-weight: 600;">${data.email}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Employee ID</td><td style="padding: 8px 0; font-weight: 600;">${data.employee_id || "Pending"}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Password</td><td style="padding: 8px 0; font-weight: 600; font-family: monospace;">${data.password}</td></tr>
      </table>
      <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 12px 16px; margin-top: 16px;">
        <p style="font-size: 13px; color: #92400e; margin: 0;">You will be prompted to change your password on first login.</p>
      </div>
      <p style="font-size: 13px; color: #64748b; margin: 16px 0 0;">Log in at <a href="https://hr.bihlabs.com" style="color: #1a365d; font-weight: 600;">hr.bihlabs.com</a></p>
    ${footer}`;
  }

  if (type === "leave_cancelled") {
    return `${base}
      <h2 style="font-size: 16px; margin: 0 0 16px; color: #d97706;">Leave Cancelled</h2>
      ${greeting(data)}
      <p style="font-size: 14px; margin: 0 0 16px;">A leave request has been cancelled.</p>
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #64748b;">Employee</td><td style="padding: 8px 0; font-weight: 600;">${data.employee_name}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Leave Type</td><td style="padding: 8px 0; font-weight: 600;">${data.leave_type}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Duration</td><td style="padding: 8px 0; font-weight: 600;">${data.start_date} to ${data.end_date}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Days</td><td style="padding: 8px 0; font-weight: 600;">${data.total_days}</td></tr>
      </table>
      <p style="font-size: 13px; color: #64748b; margin: 20px 0 0;">No further action is required.</p>
    ${footer}`;
  }

  if (type === "leave_extended") {
    return `${base}
      <h2 style="font-size: 16px; margin: 0 0 16px; color: #2563eb;">Leave Extended</h2>
      ${greeting(data)}
      <p style="font-size: 14px; margin: 0 0 16px;">Your <strong>${data.leave_type}</strong> leave has been extended by ${data.reviewer}.</p>
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #64748b;">Previous End Date</td><td style="padding: 8px 0; font-weight: 600;">${data.old_end_date}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">New End Date</td><td style="padding: 8px 0; font-weight: 600;">${data.new_end_date}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Total Days</td><td style="padding: 8px 0; font-weight: 600;">${data.total_days}</td></tr>
      </table>
    ${footer}`;
  }

  if (type === "holiday_reminder") {
    const holidayRows = (data.holidays || [])
      .map(
        (h: any) =>
          `<tr><td style="padding: 8px 0; color: #64748b;">${h.occasion}</td><td style="padding: 8px 0; font-weight: 600;">${h.date}${h.end_date && h.end_date !== h.date ? ' - ' + h.end_date : ''}</td></tr>`
      )
      .join("")
    return `${base}
      <h2 style="font-size: 16px; margin: 0 0 16px; color: #1a365d;">Upcoming Public Holidays</h2>
      <p style="font-size: 14px; margin: 0 0 16px;">Hi ${data.employee_name},</p>
      <p style="font-size: 14px; margin: 0 0 16px;">Please be informed of the upcoming public holidays. The office will be closed on these days:</p>
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        ${holidayRows}
      </table>
      <p style="font-size: 13px; color: #64748b; margin: 20px 0 0;">Plan your work and leave requests accordingly. If you have any questions, contact your manager or HR.</p>
    ${footer}`;
  }

  if (type === "password_reset") {
    return `${base}
      <h2 style="font-size: 16px; margin: 0 0 16px; color: #d97706;">Password Reset</h2>
      <p style="font-size: 14px; margin: 0 0 16px;">Hi ${data.employee_name},</p>
      <p style="font-size: 14px; margin: 0 0 16px;">Your password has been reset by an administrator. You will be prompted to set a new password on your next login.</p>
      <p style="font-size: 13px; color: #64748b; margin: 16px 0 0;">Log in at <a href="https://hr.bihlabs.com" style="color: #1a365d; font-weight: 600;">hr.bihlabs.com</a></p>
    ${footer}`;
  }

  if (type === "staff_on_leave") {
    return `${base}
      <h2 style="font-size: 16px; margin: 0 0 16px; color: #1a365d;">${data.employee_name} is on leave</h2>
      ${greeting(data)}
      <p style="font-size: 14px; margin: 0 0 16px;">Please be informed that <strong>${data.employee_name}</strong>${data.department ? ` (${data.department})` : ""} is now on ${data.leave_type} leave.</p>
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #64748b;">Duration</td><td style="padding: 8px 0; font-weight: 600;">${data.start_date} to ${data.end_date}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Expected back</td><td style="padding: 8px 0; font-weight: 600;">${data.end_date}</td></tr>
        ${data.handover_name ? `<tr><td style="padding: 8px 0; color: #64748b;">Handover to</td><td style="padding: 8px 0;">${data.handover_name}</td></tr>` : ""}
      </table>
      <p style="font-size: 13px; color: #64748b; margin: 20px 0 0;">Please direct any urgent matters to ${data.handover_name ? data.handover_name : "their manager"}.</p>
    ${footer}`;
  }

  if (type === "staff_returned") {
    return `${base}
      <h2 style="font-size: 16px; margin: 0 0 16px; color: #059669;">${data.employee_name} is back</h2>
      ${greeting(data)}
      <p style="font-size: 14px; margin: 0 0 16px;"><strong>${data.employee_name}</strong> has completed their ${data.leave_type} leave and is back at work today.</p>
      <p style="font-size: 13px; color: #64748b; margin: 20px 0 0;">Please resume handing over any pending matters to them.</p>
    ${footer}`;
  }

  if (type === "staff_going_on_leave") {
    return `${base}
      <h2 style="font-size: 16px; margin: 0 0 16px; color: #1a365d;">${data.employee_name} is going on leave</h2>
      ${greeting(data)}
      <p style="font-size: 14px; margin: 0 0 16px;">Please be informed that <strong>${data.employee_name}</strong>${data.department ? ` (${data.department})` : ""} is scheduled to go on ${data.leave_type} leave in a few days.</p>
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #64748b;">Starts</td><td style="padding: 8px 0; font-weight: 600;">${data.start_date}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Duration</td><td style="padding: 8px 0; font-weight: 600;">${data.start_date} to ${data.end_date}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Expected back</td><td style="padding: 8px 0; font-weight: 600;">${data.end_date}</td></tr>
        ${data.handover_name ? `<tr><td style="padding: 8px 0; color: #64748b;">Handover to</td><td style="padding: 8px 0;">${data.handover_name}</td></tr>` : ""}
      </table>
      <p style="font-size: 13px; color: #64748b; margin: 20px 0 0;">Please plan accordingly and direct any urgent matters to ${data.handover_name ? data.handover_name : "their manager"}.</p>
    ${footer}`;
  }

  if (type === "announcement") {
    return `${base}
      <h2 style="font-size: 16px; margin: 0 0 16px; color: #1a365d;">${escapeHtml(data.title)}</h2>
      ${greeting(data)}
      <div style="font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(data.body)}</div>
      <p style="font-size: 13px; color: #64748b; margin: 20px 0 0;">&mdash; ${escapeHtml(data.sender_name || "BlueSPACE HR")}</p>
    ${footer}`;
  }

  return null;
}

export function buildSubject(type: string, data: EmailData): string {
  if (type === "leave_submitted") return `New Leave Request - ${data.employee_name}`;
  if (type === "leave_approved") return `Leave Approved - ${data.leave_type}`;
  if (type === "leave_rejected") return `Leave Rejected - ${data.leave_type}`;
  if (type === "employee_created") return `Welcome to BlueSPACE HR - ${data.employee_name}`;
  if (type === "leave_cancelled") return `Leave Cancelled - ${data.employee_name}`;
  if (type === "holiday_reminder") return `Upcoming Public Holidays`;
  if (type === "password_reset") return `Password Reset - ${data.employee_name}`;
  if (type === "leave_extended") return `Leave Extended - ${data.leave_type}`;
  if (type === "staff_on_leave") return `${data.employee_name} is on leave (${data.start_date} - ${data.end_date})`;
  if (type === "staff_returned") return `${data.employee_name} is back from leave`;
  if (type === "staff_going_on_leave") return `${data.employee_name} is going on leave (${data.start_date})`;
  if (type === "announcement") return data.title || "Announcement";
  return "HR Notification";
}

export async function logEmail(
  supabase: SupabaseClient,
  to: string,
  subject: string,
  status: "sent" | "failed" | "skipped",
  errorMessage?: string | null
): Promise<void> {
  try {
    await supabase.from("email_logs").insert({
      to_email: to,
      subject,
      status,
      error_message: errorMessage || null,
    });
  } catch (logErr) {
    console.error("Failed to log email:", logErr);
  }
}

// Sends one email through Resend. Returns a status: sent | skipped | failed.
export type EmailSendStatus = "sent" | "skipped" | "failed";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ status: EmailSendStatus; error?: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.log(`[email] Skipped (no RESEND_API_KEY): to=${to} subject="${subject}"`);
    return { status: "skipped", error: "RESEND_API_KEY not configured" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: Deno.env.get("RESEND_FROM") || FROM_EMAIL,
        to: [to],
        subject,
        html,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { status: "failed", error: body?.message || JSON.stringify(body) };
    }
    return { status: "sent" };
  } catch (err) {
    return { status: "failed", error: (err as Error).message };
  }
}

// High-level helper: build + send + log. Never throws.
export async function sendTemplatedEmail(
  supabase: SupabaseClient,
  type: string,
  to: string,
  data: EmailData
): Promise<boolean> {
  const html = buildEmail(type, data);
  if (!html) {
    console.error(`[email] Unknown email type: ${type}`);
    return false;
  }
  const subject = buildSubject(type, data);
  const { status, error } = await sendEmail({ to, subject, html });
  await logEmail(supabase, to, subject, status, error ?? null);
  return status === "sent";
}
