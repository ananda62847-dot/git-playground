// Supabase Edge Function: create-user
// Creates admin/moderator/department accounts without switching the current session.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AppRole = "admin" | "moderator" | "department";

interface CreateUserBody {
  email: string;
  password: string;
  displayName: string;
  role: AppRole;
  constituencies?: string[];
  department?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Server misconfiguration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authHeader = req.headers.get("authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: roleRow } = await adminClient
      .from("user_roles").select("role").eq("user_id", userData.user.id).maybeSingle();

    if (!roleRow || roleRow.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = (await req.json()) as CreateUserBody;
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    const displayName = (body.displayName ?? "").trim();
    const role = body.role;
    const constituencies = Array.isArray(body.constituencies) ? body.constituencies : [];
    const department = (body.department ?? "").trim();

    if (!email || !password || !displayName || !["admin", "moderator", "department"].includes(role)) {
      return new Response(JSON.stringify({ error: "Invalid input" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (role === "moderator" && constituencies.length === 0) {
      return new Response(JSON.stringify({ error: "Select at least one constituency for moderator" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (role === "department" && !department) {
      return new Response(JSON.stringify({ error: "Select a department" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { display_name: displayName },
    });
    if (createErr || !created.user) {
      return new Response(JSON.stringify({ error: createErr?.message ?? "Failed to create user" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const newUserId = created.user.id;

    const { error: insertRoleErr } = await adminClient.from("user_roles").insert({ user_id: newUserId, role });
    if (insertRoleErr) {
      await adminClient.auth.admin.deleteUser(newUserId);
      return new Response(JSON.stringify({ error: insertRoleErr.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await adminClient.from("profiles").insert({ user_id: newUserId, display_name: displayName, email });

    if (role === "moderator") {
      const rows = constituencies.map((c) => ({ user_id: newUserId, constituency: c }));
      const { error: mapErr } = await adminClient.from("moderator_constituencies").insert(rows);
      if (mapErr) {
        return new Response(JSON.stringify({ error: mapErr.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    } else if (role === "department") {
      const { error: deptErr } = await adminClient.from("department_officers").insert({
        user_id: newUserId, department, display_name: displayName,
      });
      if (deptErr) {
        return new Response(JSON.stringify({ error: deptErr.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    return new Response(JSON.stringify({ user_id: newUserId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
