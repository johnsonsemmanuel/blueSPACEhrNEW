import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";
import { create, verify, getNumericDate } from "https://deno.land/x/djwt@v3.0.1/mod.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const JWT_SECRET = Deno.env.get("JWT_SECRET") || "bluespace-hr-jwt-secret-2026";

// One HMAC key, reused for both signing (login) and verifying (protected routes).
let hmacKey: Promise<CryptoKey> | null = null;
function getHmacKey(): Promise<CryptoKey> {
  if (!hmacKey) {
    hmacKey = crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
  }
  return hmacKey;
}

// Verify the app-issued bearer token. Returns the JWT payload, or null when the
// token is missing, malformed, expired, or not signed with JWT_SECRET.
// The anon/service keys are Supabase JWTs signed with a different secret, so
// they intentionally fail verification here.
async function verifyAuth(req: Request): Promise<any | null> {
  const header = req.headers.get("Authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  try {
    const key = await getHmacKey();
    return await verify(token, key);
  } catch (e) {
    console.warn("Auth token verification failed:", (e as Error)?.message || e);
    return null;
  }
}

function json(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers });
}

function normalizeType(type: string) {
  const t = (type || "").toLowerCase();
  if (t === "manager" || t === "company") return "Management";
  if (t === "employee") return "Staff";
  return t;
}

function normalizeHash(storedHash: string) {
  return (storedHash || "").replace(/^\$2y\$/, "$2a$");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.replace(/^.*auth-handler\/?/, '').split('/').filter(Boolean);
  const path = pathParts[0] || '';

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
  };

  try {
    if (path === "login" && req.method === "POST") {
      const { email, password } = await req.json();
      if (!email || !password) {
        return new Response(JSON.stringify({ error: "Email and password required" }), {
          status: 400, headers: corsHeaders,
        });
      }

      const { data: user, error } = await supabase
        .from("users")
        .select("id, name, email, password, type, avatar, phone, address, force_password_change")
        .eq("email", email)
        .eq("is_active", 1)
        .single();

      if (error || !user) {
        return new Response(JSON.stringify({ error: "Invalid credentials" }), {
          status: 401, headers: corsHeaders,
        });
      }

      const storedHash = normalizeHash(user.password);
      let valid = false;
      try {
        valid = bcrypt.compareSync(password, storedHash);
      } catch (e) {
        console.error("bcrypt compare failed:", e);
      }
      if (!valid) {
        return new Response(JSON.stringify({ error: "Invalid credentials" }), {
          status: 401, headers: corsHeaders,
        });
      }

      const { data: employee } = await supabase
        .from("employees")
        .select("id, employee_id, branch_id, department_id, designation_id")
        .eq("user_id", user.id)
        .single();

      const role = normalizeType(user.type);

      const key = await getHmacKey();

      const now = Math.floor(Date.now() / 1000);
      const token = await create(
        { alg: "HS256", typ: "JWT" },
        {
          sub: user.id,
          email: user.email,
          name: user.name,
          user_role: role,
          employee_id: employee?.id || null,
          iat: now,
          exp: getNumericDate(24 * 60 * 60),
        },
        key
      );

      return new Response(JSON.stringify({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          type: role,
          avatar: user.avatar,
          phone: user.phone || "",
          address: user.address || "",
          employeeId: employee?.id || null,
          employeeCode: employee?.employee_id || null,
          forcePasswordChange: user.force_password_change === 1,
        },
      }), { headers: corsHeaders });
    }

    if (path === "me" && req.method === "GET") {
      const auth = await verifyAuth(req);
      if (!auth) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: corsHeaders,
        });
      }

      const { data: user } = await supabase
        .from("users")
        .select("id, name, email, type, avatar, phone, address, force_password_change")
        .eq("id", auth.sub)
        .single();

      if (!user) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404, headers: corsHeaders,
        });
      }

      const { data: employee } = await supabase
        .from("employees")
        .select("id, employee_id, department_id, designation_id, branch_id")
        .eq("user_id", user.id)
        .single();

      return new Response(JSON.stringify({
        ...user,
        type: normalizeType(user.type),
        employeeId: employee?.id || null,
        employeeCode: employee?.employee_id || null,
        forcePasswordChange: user.force_password_change === 1,
      }), { headers: corsHeaders });
    }

    if (path === "password" && req.method === "POST") {
      const auth = await verifyAuth(req);
      if (!auth) {
        return json({ error: "Unauthorized" }, 401, corsHeaders);
      }

      const { user_id, current_password, new_password } = await req.json();
      if (!user_id || !new_password) {
        return json({ error: "user_id and new_password required" }, 400, corsHeaders);
      }

      // A user may only change their own password; Management resets use
      // /admin/reset-password. Fail closed if the token subject doesn't match.
      if (Number(auth.sub) !== Number(user_id)) {
        return json({ error: "Forbidden" }, 403, corsHeaders);
      }

      if (new_password.length < 4) {
        return json({ error: "Password must be at least 4 characters" }, 400, corsHeaders);
      }

      if (!current_password) {
        return json({ error: "Current password is required" }, 400, corsHeaders);
      }

      const { data: user } = await supabase
        .from("users")
        .select("id, password")
        .eq("id", user_id)
        .single();

      if (!user) {
        return json({ error: "User not found" }, 404, corsHeaders);
      }

      const storedHash = normalizeHash(user.password);
      let valid = false;
      try { valid = bcrypt.compareSync(current_password, storedHash); } catch { valid = false; }
      if (!valid) {
        return json({ error: "Current password is incorrect" }, 401, corsHeaders);
      }

      const newHash = bcrypt.hashSync(new_password, 10);

      const { error } = await supabase
        .from("users")
        .update({ password: newHash, force_password_change: 0, updated_at: new Date().toISOString() })
        .eq("id", user_id);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: corsHeaders,
        });
      }

      return new Response(JSON.stringify({ message: "Password updated successfully" }), {
        headers: corsHeaders,
      });
    }

    if (path === "admin" && pathParts[1] === "reset-password" && req.method === "POST") {
      const auth = await verifyAuth(req);
      if (!auth) {
        return json({ error: "Unauthorized" }, 401, corsHeaders);
      }
      if (auth.user_role !== "Management") {
        return json({ error: "Forbidden" }, 403, corsHeaders);
      }

      const body = await req.json();
      const { user_id, new_password } = body;
      if (!user_id || !new_password) {
        return json({ error: "user_id and new_password required" }, 400, corsHeaders);
      }

      const newHash = bcrypt.hashSync(new_password, 10);

      const { error } = await supabase
        .from("users")
        .update({ password: newHash, force_password_change: 1, updated_at: new Date().toISOString() })
        .eq("id", user_id);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: corsHeaders,
        });
      }

      return new Response(JSON.stringify({ message: "Password reset. Employee must change on next login." }), {
        headers: corsHeaders,
      });
    }

    // ---- Profile (self-service) ----
    if (path === "profile" && req.method === "PUT") {
      const auth = await verifyAuth(req);
      if (!auth) {
        return json({ error: "Unauthorized" }, 401, corsHeaders);
      }

      const body = await req.json();
      const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (body.name !== undefined) update.name = body.name;
      if (body.phone !== undefined) update.phone = body.phone;
      if (body.address !== undefined) update.address = body.address;

      const { error } = await supabase.from("users").update(update).eq("id", auth.sub);
      if (error) {
        return json({ error: error.message }, 500, corsHeaders);
      }
      return json({ message: "Profile updated successfully" }, 200, corsHeaders);
    }

    // ---- Management: create / update users ----
    if (path === "admin" && pathParts[1] === "users") {
      const auth = await verifyAuth(req);
      if (!auth) {
        return json({ error: "Unauthorized" }, 401, corsHeaders);
      }
      if (auth.user_role !== "Management") {
        return json({ error: "Forbidden" }, 403, corsHeaders);
      }

      if (req.method === "POST") {
        const body = await req.json();
        if (!body.name || !body.email) {
          return json({ error: "name and email are required" }, 400, corsHeaders);
        }
        const { data, error } = await supabase
          .from("users")
          .insert({
            name: body.name,
            email: body.email,
            password: "$2a$10$placeholder",
            type: body.type || "Staff",
            phone: body.phone,
            address: body.address,
            is_active: body.is_active ?? 1,
            force_password_change: 1,
          })
          .select("id")
          .single();
        if (error) {
          return json({ error: error.message }, 500, corsHeaders);
        }
        return json({ id: data.id }, 201, corsHeaders);
      }

      if (req.method === "PUT") {
        const id = pathParts[2];
        if (!id) {
          return json({ error: "User id required" }, 400, corsHeaders);
        }
        const body = await req.json();
        const update: Record<string, unknown> = {};
        if (body.name !== undefined) update.name = body.name;
        if (body.email !== undefined) update.email = body.email;
        if (body.is_active !== undefined) update.is_active = body.is_active;
        if (body.type !== undefined) update.type = body.type;
        if (body.phone !== undefined) update.phone = body.phone;
        if (body.address !== undefined) update.address = body.address;
        if (Object.keys(update).length === 0) {
          return json({ error: "No updatable fields provided" }, 400, corsHeaders);
        }
        update.updated_at = new Date().toISOString();
        const { error } = await supabase.from("users").update(update).eq("id", id);
        if (error) {
          return json({ error: error.message }, 500, corsHeaders);
        }
        return json({ success: true }, 200, corsHeaders);
      }

      return json({ error: "Method not allowed" }, 405, corsHeaders);
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404, headers: corsHeaders,
    });
  } catch (err) {
    console.error("Auth handler error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500, headers: corsHeaders,
    });
  }
});
