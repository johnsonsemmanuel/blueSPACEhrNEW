// Shared SMS sending for BlueSPACE HR edge functions.
// Provider: Intech SMS (https://doc.intech.sn). Endpoint/app-key/sender are
// configurable via env so the provider can be swapped without code changes.
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_SMS_URL = "https://gateway.intechsms.sn/api/send-sms";
const DEFAULT_SENDER = "BlueSPACE"; // Intech requires <= 11 chars
const DEFAULT_COUNTRY_CODE = Deno.env.get("SMS_DEFAULT_COUNTRY_CODE") || "234";

export function normalizePhone(raw: string | null | undefined, countryCode = DEFAULT_COUNTRY_CODE): string | null {
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
  return s;
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
  return null;
}

// Sends a single SMS through Intech SMS. Returns a status: sent | skipped | failed.
export type SmsSendStatus = "sent" | "skipped" | "failed";

export async function sendSms({
  to,
  content,
}: {
  to: string;
  content: string;
}): Promise<{ status: SmsSendStatus; error?: string }> {
  const appKey = Deno.env.get("INTECH_SMS_APP_KEY");
  if (!appKey) {
    // SMS is optional/deferred: skip quietly rather than logging a failure.
    console.log(`[sms] Skipped (no INTECH_SMS_APP_KEY): to=${to}`);
    return { status: "skipped" };
  }

  const msisdn = normalizePhone(to);
  if (!msisdn) {
    return { status: "failed", error: `Invalid phone number: ${to}` };
  }

  const sender = (Deno.env.get("INTECH_SMS_SENDER") || DEFAULT_SENDER).slice(0, 11);
  const url = Deno.env.get("INTECH_SMS_URL") || DEFAULT_SMS_URL;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_key: appKey,
        sender,
        content,
        msisdn: [msisdn],
      }),
    });
    const body = await res.json().catch(() => ({}));
    // Intech returns { code, error: boolean, msg, data }
    const failed = body?.error === true || (!res.ok && body?.error !== false);
    if (failed) {
      return { status: "failed", error: body?.msg || `HTTP ${res.status}` };
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
