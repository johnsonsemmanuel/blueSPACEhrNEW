import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import {
  buildEmail,
  buildSubject,
  sendEmail,
  logEmail,
  getAdminClient,
} from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

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

    if (!Deno.env.get("RESEND_API_KEY")) {
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
    const { status, error } = await sendEmail({ to: to_email, subject, html });

    await logEmail(getAdminClient(), to_email, subject, status, error ?? null);

    if (status !== "sent") {
      console.error("Email send failed:", status, error);
      return new Response(
        JSON.stringify({ error: "Failed to send email", status, details: error }),
        { status: status === "skipped" ? 500 : 502, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
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
