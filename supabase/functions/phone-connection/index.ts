// Lovable Cloud backend function: phone-connection
// Provides anonymous-safe operations for phone pairing without exposing DB RLS to the mobile browser.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";

type Action = "connect" | "ping" | "disconnect";

interface ConnectBody {
  action: "connect";
  code: string;
  deviceInfo?: Record<string, unknown>;
}

interface PingBody {
  action: "ping";
  connectionId: string;
}

interface DisconnectBody {
  action: "disconnect";
  connectionId: string;
}

type Body = ConnectBody | PingBody | DisconnectBody;

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.log("[phone-connection] Missing env SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
      return Response.json(
        { ok: false, error: "Server misconfigured" },
        { status: 500, headers: corsHeaders },
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const body = (await req.json()) as Partial<Body>;
    const action = body.action as Action | undefined;

    console.log("[phone-connection] action:", action);

    if (!action) {
      return Response.json(
        { ok: false, error: "Missing action" },
        { status: 400, headers: corsHeaders },
      );
    }

    if (action === "connect") {
      const code = String((body as Partial<ConnectBody>).code ?? "").trim().toUpperCase();
      if (code.length < 6) {
        return Response.json(
          { ok: false, error: "Invalid code" },
          { status: 400, headers: corsHeaders },
        );
      }

      // Find latest matching connection
      const { data: conn, error: findErr } = await admin
        .from("phone_connections")
        .select("id,user_id,connection_code,is_connected")
        .eq("connection_code", code)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (findErr) {
        console.log("[phone-connection] findErr:", findErr);
        return Response.json(
          { ok: false, error: "Lookup failed" },
          { status: 500, headers: corsHeaders },
        );
      }

      if (!conn) {
        return Response.json(
          { ok: false, error: "Invalid connection code" },
          { status: 404, headers: corsHeaders },
        );
      }

      const deviceInfo = (body as Partial<ConnectBody>).deviceInfo ?? {};
      const now = new Date().toISOString();

      const { error: updateErr } = await admin
        .from("phone_connections")
        .update({
          is_connected: true,
          connected_at: now,
          last_seen_at: now,
          phone_info: deviceInfo,
        })
        .eq("id", conn.id);

      if (updateErr) {
        console.log("[phone-connection] updateErr:", updateErr);
        return Response.json(
          { ok: false, error: "Failed to connect" },
          { status: 500, headers: corsHeaders },
        );
      }

      return Response.json(
        { ok: true, connectionId: conn.id, userId: conn.user_id },
        { headers: corsHeaders },
      );
    }

    if (action === "ping") {
      const connectionId = String((body as Partial<PingBody>).connectionId ?? "").trim();
      if (!connectionId) {
        return Response.json(
          { ok: false, error: "Missing connectionId" },
          { status: 400, headers: corsHeaders },
        );
      }

      const now = new Date().toISOString();
      const { error } = await admin
        .from("phone_connections")
        .update({ last_seen_at: now })
        .eq("id", connectionId);

      if (error) {
        console.log("[phone-connection] ping update error:", error);
        return Response.json(
          { ok: false, error: "Ping failed" },
          { status: 500, headers: corsHeaders },
        );
      }

      return Response.json({ ok: true }, { headers: corsHeaders });
    }

    if (action === "disconnect") {
      const connectionId = String((body as Partial<DisconnectBody>).connectionId ?? "").trim();
      if (!connectionId) {
        return Response.json(
          { ok: false, error: "Missing connectionId" },
          { status: 400, headers: corsHeaders },
        );
      }

      const { error } = await admin
        .from("phone_connections")
        .update({
          is_connected: false,
          phone_info: {},
          connected_at: null,
        })
        .eq("id", connectionId);

      if (error) {
        console.log("[phone-connection] disconnect update error:", error);
        return Response.json(
          { ok: false, error: "Disconnect failed" },
          { status: 500, headers: corsHeaders },
        );
      }

      return Response.json({ ok: true }, { headers: corsHeaders });
    }

    return Response.json(
      { ok: false, error: "Unknown action" },
      { status: 400, headers: corsHeaders },
    );
  } catch (e) {
    console.log("[phone-connection] Unhandled error:", e);
    return Response.json(
      { ok: false, error: "Unhandled error" },
      { status: 500, headers: corsHeaders },
    );
  }
});
