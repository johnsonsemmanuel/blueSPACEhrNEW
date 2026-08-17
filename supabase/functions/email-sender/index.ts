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
    return `${base}
      <h2 style="font-size: 16px; margin: 0 0 16px;">New Leave Request</h2>
      <p style="font-size: 14px; margin: 0 0 16px;">A new leave request has been submitted and requires your review.</p>
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #64748b;">Employee</td><td style="padding: 8px 0; font-weight: 600;">${data.employee_name}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Leave Type</td><td style="padding: 8px 0; font-weight: 600;">${data.leave_type}${data.is_half_day ? " (Half Day)" : ""}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Duration</td><td style="padding: 8px 0; font-weight: 600;">${data.start_date} to ${data.end_date}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Days</td><td style="padding: 8px 0; font-weight: 600;">${data.total_days}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Reason</td><td style="padding: 8px 0;">${data.reason || "Not provided"}</td></tr>
        ${data.handover_name ? `<tr><td style="padding: 8px 0; color: #64748b;">Handover To</td><td style="padding: 8px 0;">${data.handover_name}</td></tr>` : ""}
      </table>
      <p style="font-size: 13px; color: #64748b; margin: 20px 0 0;">Please log in to the HR portal to review and action this request.</p>
    ${footer}`;
  }

  if (type === "leave_approved") {
    return `${base}
      <h2 style="font-size: 16px; margin: 0 0 16px; color: #059669;">Leave Approved</h2>
      <p style="font-size: 14px; margin: 0 0 16px;">Your leave request has been approved.</p>
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #64748b;">Leave Type</td><td style="padding: 8px 0; font-weight: 600;">${data.leave_type}${data.is_half_day ? " (Half Day)" : ""}</td></tr>
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

  return null;
}

function buildSubject(type, data) {
  if (type === "leave_submitted") return `New Leave Request — ${data.employee_name}`;
  if (type === "leave_approved") return `Leave Approved — ${data.leave_type}`;
  if (type === "leave_rejected") return `Leave Rejected — ${data.leave_type}`;
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
