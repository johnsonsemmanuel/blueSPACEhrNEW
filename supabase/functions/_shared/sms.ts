// Shared SMS sending for BlueSPACE HR edge functions.
// Provider: Intek SMS (https://inteksms.top). API key passed as Bearer token.
// Endpoint configurable via env so the provider can be swapped without code changes.
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_SMS_URL = "https://inteksms.top/api/v1/messages/send";
const DEFAULT_SENDER_ID = Deno.env.get("INTEK_SMS_SENDER_ID") || "1"; // Use sender_id from approved list

export function normalizePhone(raw: string | null | undefined, countryCode = "234"): string | null {
  if (!raw) return null;
  let s = String(raw).trim().replace(/[\s().-]/g, "");
  if (!s) return null;

  if (s.startsWith("00")) s = "+" + s.slice(2);

  if (s.startsWith("+")) {
    // already international
  } else if (s.startsWith("0")) {
    // local format e.g. 0803... -> +234803...
    const national = s.slice(1);
    if (national.length < 7) return null;
    s = "+" + countryCode + national;
  } else if (s.startsWith(countryCode)) {
    // country code without +
    s = "+" + s;
  } else {
    // fall back to assuming the default country code
    if (s.length < 7) return null;
    s = "+" + countryCode + s;
  }

  const digits = s.slice(1);
  if (!/^\d{7,15}$/.test(digits)) return null;
  return s.replace("+", "");
}

export function buildSmsContent(type: string, data: Record<string, any>): string | null {
  const greet = data.recipient_name ? `Hi ${data.recipient_name}, ` : "";
  if (type === "staff_on_leave") {
    const handover = data.handover_name ? ` Kindly direct urgent matters to ${data.handover_name}.` : "";
    return `${greet}${data.employee_name} is now on ${data.leave_type} leave until ${data.end_date}.${handover} - BlueSPACE HR`;
  }
  if (type === "staff_returned") {
    return `${greet}${data.employee_name} is back from ${data.leave_type} leave as of today. - BlueSPACE HR`;
  }
  if (type === "payment_reminder") {
    let msg = `${greet}PAYMENT REMINDER: ${data.title} due ${data.due_date}`;
    if (data.amount) msg += ` - Amount: ₵${data.amount}`;
    if (data.description) msg += `. ${data.description}`;
    msg += " - BlueSPACE HR";
    return msg;
  }
  if (type === "expense_reminder") {
    let msg = `${greet}EXPENSE REMINDER: ${data.category} - ${data.description} due ${data.due_date}`;
    if (data.amount) msg += ` - ₵${data.amount}`;
    msg += " - BlueSPACE HR";
    return msg;
  }
  return null;
}

// Sends a single SMS through Intek SMS. Returns a status: sent | skipped | failed.
export type SmsSendStatus = "sent" | "skipped" | "failed";

export async function sendSms({
  to,
  content,
}: {
  to: string;
  content: string;
}): Promise<{ status: SmsSendStatus; error?: string }> {
  const apiKey = Deno.env.get("INTEK_SMS_API_KEY");
  if (!apiKey) {
    console.log(`[sms] Skipped (no INTEK_SMS_API_KEY): to=${to}`);
    return { status: "skipped" };
  }

  const msisdn = normalizePhone(to);
  if (!msisdn) {
    return { status: "failed", error: `Invalid phone number: ${to}` };
  }

  const senderId = Deno.env.get("INTEK_SMS_SENDER_ID") || DEFAULT_SENDER_ID;
  const url = Deno.env.get("INTEK_SMS_URL") || DEFAULT_SMS_URL;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender_id: parseInt(senderId),
        message: content,
        recipients: [msisdn],
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) {
      return { status: "failed", error: "Invalid API key" };
    }
    if (res.status === 402) {
      return { status: "failed", error: "Insufficient SMS credits" };
    }
    if (res.status === 403) {
      return { status: "failed", error: "Sender ID not approved" };
    }
    if (res.status === 422) {
      return { status: "failed", error: body?.message || "Validation error" };
    }
    if (!res.ok) {
      return { status: "failed", error: body?.message || `HTTP ${res.status}` };
    }
    return { status: "sent" };
  } catch (err) {
    return { status: "failed", error: (err as Error).message };
  }
}

export async function logSms(
  supabase: SupabaseClient,
  to: string,
  content: string,
  status: "sent" | "failed" | "skipped",
  errorMessage?: string | null
): Promise<void> {
  try {
    await supabase.from("sms_logs").insert({
      to_phone: to,
      content,
      status,
      error_message: errorMessage || null,
    });
  } catch (logErr) {
    console.error("Failed to log SMS:", logErr);
  }
}

// High-level helper: build + send + log. Never throws. SMS is optional.
export async function sendTemplatedSms(
  supabase: SupabaseClient,
  type: string,
  to: string,
  data: Record<string, any>
): Promise<boolean> {
  const content = buildSmsContent(type, data);
  if (!content) {
    console.error(`[sms] Unknown SMS type: ${type}`);
    return false;
  }
  const { status, error } = await sendSms({ to, content });
  if (status !== "skipped") {
    await logSms(supabase, to, content, status, error ?? null);
  }
  return status === "sent";
}
