import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM_EMAIL = "BlueSPACE HR <noreply@control.bihlabs.com>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

function buildEmail(type, data) {
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

  if (type === "holiday_reminder") {
    const holidayRows = (data.holidays || [])
      .map(
        (h) =>
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

  return null;
}

function buildSubject(type, data) {
  if (type === "leave_submitted") return `New Leave Request - ${data.employee_name}`;
  if (type === "leave_approved") return `Leave Approved - ${data.leave_type}`;
  if (type === "leave_rejected") return `Leave Rejected - ${data.leave_type}`;
  if (type === "employee_created") return `Welcome to BlueSPACE HR - ${data.employee_name}`;
  if (type === "leave_cancelled") return `Leave Cancelled - ${data.employee_name}`;
  if (type === "holiday_reminder") return `Upcoming Public Holidays`;
  if (type === "password_reset") return `Password Reset - ${data.employee_name}`;
  return "HR Notification";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const { type, to_email, data } = await req.json();

    if (!type || !to_email || !data) {
      return new Response(
        JSON.stringify({ error: "type, to_email, and data are required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const html = buildEmail(type, data);
    if (!html) {
      return new Response(
        JSON.stringify({ error: `Unknown email type: ${type}` }),
        { status: 400, headers: corsHeaders }
      );
    }

    const subject = buildSubject(type, data);

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to_email],
        subject,
        html,
      }),
    });

    const resendBody = await resendRes.json();
    const sent = resendRes.ok;

    // Log to email_logs table (best-effort, don't fail the request)
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      await supabase.from("email_logs").insert({
        recipient_email: to_email,
        subject,
        body: html,
        status: sent ? "sent" : "failed",
        error_message: sent ? null : resendBody.message || JSON.stringify(resendBody),
        sent_at: sent ? new Date().toISOString() : null,
      });
    } catch (logErr) {
      console.error("Failed to log email:", logErr);
    }

    if (!sent) {
      console.error("Resend error:", resendBody);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: resendBody }),
        { status: 502, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: resendBody.id }),
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("Email sender error:", err);
    return new Response(
      JSON.stringify({ error: "Server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
