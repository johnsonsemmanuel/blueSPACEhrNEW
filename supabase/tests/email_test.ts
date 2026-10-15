// Deno tests for the shared email layer.
// Run: deno test --allow-env --allow-net supabase/tests/email_test.ts
import { assertEquals, assert, assertStringIncludes } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import {
  buildEmail,
  buildSubject,
  sendEmail,
  sendTemplatedEmail,
} from "../functions/_shared/email.ts";

const DATE = { start_date: "2026-01-05", end_date: "2026-01-09" };

const SAMPLES: Record<string, Record<string, any>> = {
  leave_submitted: {
    employee_name: "Ada Obi",
    leave_type: "Annual",
    total_days: "5",
    reason: "Family trip",
    handover_name: "Bob",
    recipient_name: "Manager Mike",
    ...DATE,
  },
  leave_approved: { recipient_name: "Ada Obi", leave_type: "Annual", total_days: "5", ...DATE },
  leave_rejected: { recipient_name: "Ada Obi", leave_type: "Annual", total_days: "5", remark: "Peak period", ...DATE },
  leave_cancelled: { employee_name: "Ada Obi", leave_type: "Annual", total_days: "5", recipient_name: "Manager Mike", ...DATE },
  leave_extended: {
    recipient_name: "Ada Obi",
    leave_type: "Annual",
    reviewer: "Manager Mike",
    old_end_date: "2026-01-09",
    new_end_date: "2026-01-12",
    total_days: "6",
  },
  employee_created: { employee_name: "Ada Obi", email: "ada@bluespace.africa", password: "Temp#1234", employee_id: "BS-042" },
  holiday_reminder: {
    employee_name: "Ada Obi",
    holidays: [{ occasion: "Christmas", date: "2026-12-25", end_date: "2026-12-26" }],
  },
  password_reset: { employee_name: "Ada Obi" },
  staff_on_leave: {
    employee_name: "Ada Obi",
    department: "Operations",
    leave_type: "Annual",
    handover_name: "Bob",
    recipient_name: "Manager Mike",
    ...DATE,
  },
  staff_returned: { employee_name: "Ada Obi", leave_type: "Annual", recipient_name: "Manager Mike" },
  staff_going_on_leave: {
    employee_name: "Ada Obi",
    department: "Operations",
    leave_type: "Annual",
    handover_name: "Bob",
    recipient_name: "Manager Mike",
    ...DATE,
  },
  announcement: {
    recipient_name: "Manager Mike",
    title: "Public Holiday - Independence Day",
    body: "The office will be closed on 1 October.\nPlease plan accordingly.",
    sender_name: "HR",
  },
};

for (const [type, data] of Object.entries(SAMPLES)) {
  Deno.test(`buildEmail renders "${type}"`, () => {
    const html = buildEmail(type, data);
    assert(html, `expected HTML for ${type}`);
    assert(html!.length > 150, `HTML for ${type} looks too short`);
    assertStringIncludes(html!, "BlueSPACE HR");
    assert(buildSubject(type, data).length > 0);
  });
}

Deno.test("unknown email type returns null", () => {
  assertEquals(buildEmail("does_not_exist", {}), null);
});

Deno.test("announcement escapes HTML in title and body", () => {
  const html = buildEmail("announcement", {
    title: "<b>Hi</b>",
    body: "<script>alert(1)</script>",
    recipient_name: "A",
  })!;
  assert(!html.includes("<script>alert(1)</script>"));
  assertStringIncludes(html, "&lt;script&gt;");
  assertStringIncludes(html, "&lt;b&gt;Hi&lt;/b&gt;");
});

Deno.test("greeting is personalized with the recipient's name", () => {
  const html = buildEmail("staff_on_leave", SAMPLES.staff_on_leave)!;
  assertStringIncludes(html, "Hi Manager Mike,");
  assertStringIncludes(html, "Ada Obi");
});

Deno.test("staff_on_leave subject names the employee and range", () => {
  assertEquals(
    buildSubject("staff_on_leave", SAMPLES.staff_on_leave),
    "Ada Obi is on leave (2026-01-05 - 2026-01-09)"
  );
});

Deno.test("staff_going_on_leave subject names the employee and start date", () => {
  assertEquals(
    buildSubject("staff_going_on_leave", SAMPLES.staff_going_on_leave),
    "Ada Obi is going on leave (2026-01-05)"
  );
});

Deno.test("sendEmail skips when RESEND_API_KEY is unset", async () => {
  const prev = Deno.env.get("RESEND_API_KEY");
  Deno.env.delete("RESEND_API_KEY");
  try {
    const r = await sendEmail({ to: "a@b.com", subject: "s", html: "<p>hi</p>" });
    assertEquals(r.status, "skipped");
  } finally {
    if (prev) Deno.env.set("RESEND_API_KEY", prev);
  }
});

Deno.test("sendEmail posts correct payload to Resend", async () => {
  Deno.env.set("RESEND_API_KEY", "test_key");
  const original = globalThis.fetch;
  let captured: { url: string; init: any } | null = null;
  globalThis.fetch = ((url: string, init: any) => {
    captured = { url: String(url), init };
    return Promise.resolve(
      new Response(JSON.stringify({ id: "abc" }), { status: 200, headers: { "Content-Type": "application/json" } })
    );
  }) as unknown as typeof fetch;
  try {
    const r = await sendEmail({ to: "staff@x.com", subject: "Hello", html: "<p>hi</p>" });
    assertEquals(r.status, "sent");
    assert(captured!.url.includes("api.resend.com/emails"));
    assertEquals(captured!.init.headers.Authorization, "Bearer test_key");
    const body = JSON.parse(captured!.init.body);
    assertEquals(body.to[0], "staff@x.com");
    assertEquals(body.subject, "Hello");
    assert(String(body.from).includes("noreply@"));
  } finally {
    globalThis.fetch = original;
    Deno.env.delete("RESEND_API_KEY");
  }
});

Deno.test("sendEmail reports failure from Resend", async () => {
  Deno.env.set("RESEND_API_KEY", "test_key");
  const original = globalThis.fetch;
  globalThis.fetch = (() =>
    Promise.resolve(
      new Response(JSON.stringify({ message: "domain not verified" }), { status: 403 })
    )) as unknown as typeof fetch;
  try {
    const r = await sendEmail({ to: "x@y.com", subject: "s", html: "<p>hi</p>" });
    assertEquals(r.status, "failed");
    assertStringIncludes(r.error || "", "domain not verified");
  } finally {
    globalThis.fetch = original;
    Deno.env.delete("RESEND_API_KEY");
  }
});

Deno.test("sendTemplatedEmail builds, sends and writes an email_logs row", async () => {
  Deno.env.set("RESEND_API_KEY", "test_key");
  const original = globalThis.fetch;
  globalThis.fetch = (() =>
    Promise.resolve(new Response(JSON.stringify({ id: "1" }), { status: 200 }))) as unknown as typeof fetch;
  let logged: any = null;
  const fakeSupabase = {
    from: () => ({ insert: (row: any) => { logged = row; return Promise.resolve({ data: null, error: null }); } }),
  } as any;
  try {
    const ok = await sendTemplatedEmail(fakeSupabase, "staff_on_leave", "a@b.com", SAMPLES.staff_on_leave);
    assertEquals(ok, true);
    assertEquals(logged.to_email, "a@b.com");
    assertEquals(logged.status, "sent");
    assertStringIncludes(logged.subject, "Ada Obi");
  } finally {
    globalThis.fetch = original;
    Deno.env.delete("RESEND_API_KEY");
  }
});
