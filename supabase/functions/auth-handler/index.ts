import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.1/mod.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const JWT_SECRET = Deno.env.get("JWT_SECRET") || "bluespace-hr-jwt-secret-2026";

function normalizeType(type) {
  const t = (type || "").toLowerCase();
  if (t === "manager" || t === "company") return "Management";
  if (t === "employee") return "Staff";
  return t;
}

function normalizeHash(storedHash) {
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

      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(JWT_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );

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
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "No token" }), {
          status: 401, headers: corsHeaders,
        });
      }

      const tokenStr = authHeader.split(" ")[1];
      const [, payloadB64] = tokenStr.split(".");
      const payload = JSON.parse(atob(payloadB64));

      const { data: user } = await supabase
        .from("users")
        .select("id, name, email, type, avatar, phone, address, force_password_change")
        .eq("id", payload.sub)
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
      const { user_id, current_password, new_password } = await req.json();
      if (!user_id || !new_password) {
        return new Response(JSON.stringify({ error: "user_id and new_password required" }), {
          status: 400, headers: corsHeaders,
        });
      }

      if (new_password.length < 4) {
        return new Response(JSON.stringify({ error: "Password must be at least 4 characters" }), {
          status: 400, headers: corsHeaders,
        });
      }

      const { data: user } = await supabase
        .from("users")
        .select("id, password")
        .eq("id", user_id)
        .single();

      if (!user) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404, headers: corsHeaders,
        });
      }

      if (current_password) {
        const storedHash = normalizeHash(user.password);
        let valid = false;
        try { valid = bcrypt.compareSync(current_password, storedHash); } catch { valid = false; }
        if (!valid) {
          return new Response(JSON.stringify({ error: "Current password is incorrect" }), {
            status: 401, headers: corsHeaders,
          });
        }
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
      const body = await req.json();
      const { user_id, new_password } = body;
      if (!user_id || !new_password) {
        return new Response(JSON.stringify({ error: "user_id and new_password required" }), {
          status: 400, headers: corsHeaders,
        });
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
