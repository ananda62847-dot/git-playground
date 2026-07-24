// supabase/functions/send-push/index.ts
// Sends FCM push notifications via the HTTP v1 API.
// Targets: role, constituency, department, or specific user_id.
// Also writes to public.notifications history.
//
// Required secret: FIREBASE_SERVICE_ACCOUNT  (full JSON from Firebase Console
//   → Project Settings → Service accounts → "Generate new private key")

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const PROJECT_ID = "makkal-connect-cf0a7";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PushRequest {
  title: string;
  body: string;
  type?: string;
  severity?: "info" | "medium" | "high" | "critical";
  url?: string;
  data?: Record<string, string>;
  target: {
    role?: "cadre" | "constituency_admin" | "department_admin" | "super_admin" | string;
    roles?: string[];
    constituency?: string;
    department?: string;
    user_id?: string;
  };
}

// --- Service account → OAuth access token (cached) ---
let cachedToken: { token: string; exp: number } | null = null;

async function getAccessToken(sa: any): Promise<string> {
  if (cachedToken && cachedToken.exp > Date.now() + 60_000) return cachedToken.token;
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const enc = (o: any) => btoa(JSON.stringify(o)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const toSign = `${enc(header)}.${enc(claim)}`;

  // Import PEM private key
  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(toSign));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const jwt = `${toSign}.${sigB64}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const json = await res.json();
  if (!json.access_token) throw new Error("Failed to get access token: " + JSON.stringify(json));
  cachedToken = { token: json.access_token, exp: Date.now() + json.expires_in * 1000 };
  return cachedToken.token;
}

async function sendOne(accessToken: string, token: string, payload: PushRequest) {
  const message: any = {
    message: {
      token,
      notification: { title: payload.title, body: payload.body },
      data: {
        ...(payload.data || {}),
        ...(payload.url ? { url: payload.url } : {}),
        type: payload.type || "info",
        severity: payload.severity || "info",
      },
      webpush: {
        fcm_options: payload.url ? { link: payload.url } : undefined,
      },
    },
  };
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(message),
    }
  );
  return { ok: res.ok, status: res.status, body: await res.text() };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const saRaw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    if (!saRaw) {
      return new Response(JSON.stringify({ error: "FIREBASE_SERVICE_ACCOUNT not configured" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }
    let sa: any;
    try {
      sa = JSON.parse(saRaw);
    } catch {
      return new Response(JSON.stringify({
        error: "FIREBASE_SERVICE_ACCOUNT is not valid JSON. Paste the FULL service account JSON file content (starts with '{' and contains \"type\":\"service_account\", \"private_key\", \"client_email\", etc.) from Firebase Console → Project Settings → Service accounts → Generate new private key.",
        got_prefix: saRaw.slice(0, 40),
      }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (!sa.private_key || !sa.client_email) {
      return new Response(JSON.stringify({
        error: "FIREBASE_SERVICE_ACCOUNT JSON is missing private_key / client_email. Re-download the service account JSON from Firebase and paste the whole file."
      }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const body = (await req.json()) as PushRequest;
    if (!body?.title || !body?.body || !body?.target) {
      return new Response(JSON.stringify({ error: "title, body, target required" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Build target query
    let q = supabase.from("notification_tokens").select("fcm_token,user_id,role");
    const roles = body.target.roles || (body.target.role ? [body.target.role] : null);
    if (roles) q = q.in("role", roles);
    if (body.target.constituency) q = q.eq("constituency", body.target.constituency);
    if (body.target.department) q = q.eq("department", body.target.department);
    if (body.target.user_id) q = q.eq("user_id", body.target.user_id);

    const { data: tokens, error } = await q;
    if (error) throw error;

    const accessToken = await getAccessToken(sa);
    const results = await Promise.all((tokens || []).map(t => sendOne(accessToken, t.fcm_token, body)));

    // Remove invalid tokens
    const dead: string[] = [];
    results.forEach((r, i) => {
      if (!r.ok && (r.status === 404 || r.status === 400) && /UNREGISTERED|INVALID_ARGUMENT/.test(r.body)) {
        dead.push((tokens as any[])[i].fcm_token);
      }
    });
    if (dead.length) {
      await supabase.from("notification_tokens").delete().in("fcm_token", dead);
    }

    // Write history rows
    const rows = (tokens || []).map((t: any) => ({
      user_id: t.user_id,
      role: t.role,
      title: body.title,
      body: body.body,
      type: body.type || null,
      severity: body.severity || "info",
      constituency: body.target.constituency || null,
      department: body.target.department || null,
      data: body.data || null,
    }));
    if (rows.length) await supabase.from("notifications").insert(rows);

    const sent = results.filter(r => r.ok).length;
    return new Response(JSON.stringify({ sent, total: results.length, removed: dead.length }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[send-push]", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
