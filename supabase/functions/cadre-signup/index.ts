import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const body = await req.json();
    const {
      email, password, name, phone, level = "booth_volunteer",
      city, constituency, area, ward_number, polling_booth,
      role_title, skills = [], notes, source = "public_register",
      profile_photo_url,
    } = body || {};

    if (!email || !password || !name || !phone || !city || (source === "public_register" && !profile_photo_url)) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (String(password).length < 6) {
      return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 1. create auth user (auto-confirm so they can log in immediately)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { display_name: name, role_intent: "cadre" },
    });
    if (createErr || !created.user) {
      return new Response(JSON.stringify({ error: createErr?.message || "Failed to create user" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const uid = created.user.id;

    // 2. role
    await admin.from("user_roles").insert({ user_id: uid, role: "cadre" });

    // 3. cadre row
    const { data: cadre, error: cadreErr } = await admin.from("cadres").insert({
      user_id: uid, name, phone, email, level, city,
      constituency: constituency || null, area: area || null,
      ward_number: ward_number || null,
      role_title: role_title || null,
      profile_photo_url: profile_photo_url || null,
      skills, notes: notes || null, source, approved: true,
    }).select("id").single();

    if (cadreErr) {
      return new Response(JSON.stringify({ error: cadreErr.message }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true, cadre_id: cadre?.id, user_id: uid }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
