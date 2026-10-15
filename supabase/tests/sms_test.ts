// Deno tests for the shared SMS layer (deferred feature, but the adapter and
// phone normalisation should be correct).
// Run: deno test --allow-env --allow-net supabase/tests/sms_test.ts
import { assertEquals, assert, assertStringIncludes } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { normalizePhone, buildSmsContent, sendSms, sendTemplatedSms } from "../functions/_shared/sms.ts";

Deno.test("normalizePhone handles Nigerian formats", () => {
  assertEquals(normalizePhone("08031234567"), "+2348031234567");
  assertEquals(normalizePhone("2348031234567"), "+2348031234567");
  assertEquals(normalizePhone("+2348031234567"), "+2348031234567");
  assertEquals(normalizePhone("0803 123 4567"), "+2348031234567");
  assertEquals(normalizePhone("002348031234567"), "+2348031234567");
});

Deno.test("normalizePhone rejects junk", () => {
  assertEquals(normalizePhone(""), null);
  assertEquals(normalizePhone(null), null);
  assertEquals(normalizePhone("12345"), null);
});

Deno.test("buildSmsContent personalizes and names the employee", () => {
  const onLeave = buildSmsContent("staff_on_leave", {
    recipient_name: "Mike",
    employee_name: "Ada",
    leave_type: "Annual",
    end_date: "2026-01-09",
    handover_name: "Bob",
  })!;
  assertStringIncludes(onLeave, "Hi Mike");
  assertStringIncludes(onLeave, "Ada");
  assertStringIncludes(onLeave, "2026-01-09");

  const returned = buildSmsContent("staff_returned", {
    recipient_name: "Mike",
    employee_name: "Ada",
    leave_type: "Annual",
  })!;
  assertStringIncludes(returned, "Ada");
  assertStringIncludes(returned, "back");
});

Deno.test("buildSmsContent returns null for unknown types", () => {
  assertEquals(buildSmsContent("nope", {}), null);
});

Deno.test("sendSms skips without key (deferred feature)", async () => {
  const prev = Deno.env.get("INTECH_SMS_APP_KEY");
  Deno.env.delete("INTECH_SMS_APP_KEY");
  try {
    const r = await sendSms({ to: "08031234567", content: "hi" });
    assertEquals(r.status, "skipped");
  } finally {
    if (prev) Deno.env.set("INTECH_SMS_APP_KEY", prev);
  }
});

Deno.test("sendSms posts to Intech with normalized number", async () => {
  Deno.env.set("INTECH_SMS_APP_KEY", "test_app_key");
  Deno.env.set("INTECH_SMS_SENDER", "BlueSPACE");
  const original = globalThis.fetch;
  let captured: { url: string; body: any } | null = null;
  globalThis.fetch = ((url: string, init: any) => {
    captured = { url: String(url), body: JSON.parse(init.body) };
    return Promise.resolve(
      new Response(JSON.stringify({ code: 201, error: false, msg: "ok", data: [] }), { status: 201 })
    );
  }) as unknown as typeof fetch;
  try {
    const r = await sendSms({ to: "08031234567", content: "hello" });
    assertEquals(r.status, "sent");
    assertStringIncludes(captured!.url, "intechsms.sn");
    assertEquals(captured!.body.app_key, "test_app_key");
    assertEquals(captured!.body.sender, "BlueSPACE");
    assertEquals(captured!.body.msisdn[0], "+2348031234567");
  } finally {
    globalThis.fetch = original;
    Deno.env.delete("INTECH_SMS_APP_KEY");
    Deno.env.delete("INTECH_SMS_SENDER");
  }
});

Deno.test("sendSms flags Intech error responses as failed", async () => {
  Deno.env.set("INTECH_SMS_APP_KEY", "test_app_key");
  const original = globalThis.fetch;
  globalThis.fetch = (() =>
    Promise.resolve(
      new Response(JSON.stringify({ code: 400, error: true, msg: "invalid number", data: {} }), { status: 200 })
    )) as unknown as typeof fetch;
  try {
    const r = await sendSms({ to: "08031234567", content: "hello" });
    assertEquals(r.status, "failed");
    assertStringIncludes(r.error || "", "invalid number");
  } finally {
    globalThis.fetch = original;
    Deno.env.delete("INTECH_SMS_APP_KEY");
  }
});

Deno.test("sendTemplatedSms does not log when skipped", async () => {
  const prev = Deno.env.get("INTECH_SMS_APP_KEY");
  Deno.env.delete("INTECH_SMS_APP_KEY");
  let logged = false;
  const fakeSupabase = { from: () => ({ insert: () => { logged = true; return Promise.resolve({}); } }) } as any;
  try {
    const ok = await sendTemplatedSms(fakeSupabase, "staff_returned", "08031234567", {
      recipient_name: "Mike",
      employee_name: "Ada",
      leave_type: "Annual",
    });
    assertEquals(ok, false);
    assertEquals(logged, false);
  } finally {
    if (prev) Deno.env.set("INTECH_SMS_APP_KEY", prev);
  }
});
