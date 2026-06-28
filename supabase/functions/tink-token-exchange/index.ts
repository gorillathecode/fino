// Supabase Edge Function: tink-token-exchange
//
// Tauscht den `code` aus dem Tink-Link-Callback serverseitig gegen ein
// access_token. Der TINK_CLIENT_SECRET bleibt ausschließlich hier auf dem
// Server und gelangt nie in die App.
//
// Sicherheit: Diese Function wird NUR von der eingeloggten App aufgerufen
// (der Tink-Callback geht per Deep-Link an die App, nicht hierher). Daher
// KEIN --no-verify-jwt: Das Supabase-Gateway verifiziert die JWT-Signatur,
// und wir holen zusätzlich den User via getUser() ab.
//
// Der von Tink zurückgegebene refresh_token wird auf Anwendungsebene
// verschlüsselt (AES-GCM) und in public.tink_credentials abgelegt, damit das
// Konto nicht bei jedem App-Start neu verbunden werden muss. Der Schlüssel
// (TOKEN_ENCRYPTION_KEY) liegt nur als Secret hier, nie in der DB.
//
// Deploy:
//   supabase functions deploy tink-token-exchange
// Secrets setzen (TOKEN_ENCRYPTION_KEY = base64 von 32 zufälligen Bytes,
//   z.B.:  openssl rand -base64 32 ):
//   supabase secrets set TINK_CLIENT_ID=... TINK_CLIENT_SECRET=... TOKEN_ENCRYPTION_KEY=...

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TINK_TOKEN_URL = "https://api.tink.com/api/v1/oauth/token";

// EIN zentraler Schalter für das temporäre [TINK]-Logging (erster Sandbox-Test).
// Auf false setzen, um es wieder abzuschalten.
const TINK_DEBUG = true;
function tlog(...args: unknown[]): void {
  if (TINK_DEBUG) console.log("[TINK]", ...args);
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // Verify the caller is an authenticated FINO user (defense in depth on top
  // of the gateway JWT check) and get their user id.
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Missing Authorization header" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    tlog("auth: getUser fehlgeschlagen:", userError?.message);
    return json({ error: "Unauthorized" }, 401);
  }
  tlog("auth: user ok", user.id);

  const clientId = Deno.env.get("TINK_CLIENT_ID");
  const clientSecret = Deno.env.get("TINK_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    tlog("config: TINK_CLIENT_ID/SECRET fehlt als Secret");
    return json({ error: "Server misconfigured: missing Tink credentials" }, 500);
  }

  let code: string | undefined;
  try {
    const body = await req.json();
    code = body?.code;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!code) {
    tlog("request: kein code im Body");
    return json({ error: "Missing 'code' in request body" }, 400);
  }
  tlog("request: code empfangen (len =", code.length, ")");

  // Exchange authorization code for an access token (server-to-server).
  const form = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
  });

  const tinkRes = await fetch(TINK_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  const data = await tinkRes.json();

  if (!tinkRes.ok) {
    tlog("tink: token exchange fehlgeschlagen, HTTP", tinkRes.status, data);
    return json(
      { error: "Tink token exchange failed", detail: data },
      tinkRes.status,
    );
  }
  tlog(
    "tink: token erhalten (access_token:", !!data.access_token,
    ", refresh_token:", !!data.refresh_token, ")",
  );

  // Persist the long-lived refresh_token (encrypted) so the user does not have
  // to reconnect on every app start. Written via service-role (bypasses RLS).
  // Tink may omit it for one-time access — then we simply skip storage.
  if (data.refresh_token) {
    try {
      const refreshTokenEnc = await encrypt(data.refresh_token);
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { error: storeError } = await admin.from("tink_credentials").upsert({
        user_id: user.id,
        refresh_token_enc: refreshTokenEnc,
        scope: data.scope ?? null,
        updated_at: new Date().toISOString(),
      });
      if (storeError) {
        tlog("store: refresh_token konnte nicht gespeichert werden:", storeError.message);
      } else {
        tlog("store: refresh_token verschlüsselt gespeichert");
      }
    } catch (e) {
      // Don't fail the whole exchange if storage hiccups — the session token
      // still works; the user just reconnects next time.
      tlog("store: Verschlüsselung/Upsert fehlgeschlagen:", String(e));
      console.error("Failed to store tink refresh token:", e);
    }
  }

  // Return only what the app needs for the session. The access_token is held
  // in memory in the app for the session, never persisted on the device.
  return json({
    access_token: data.access_token,
    token_type: data.token_type,
    expires_in: data.expires_in,
    scope: data.scope,
  });
});

// AES-GCM encryption using a 32-byte key (base64) from TOKEN_ENCRYPTION_KEY.
// Output: base64( iv(12) || ciphertext ).
async function encrypt(plaintext: string): Promise<string> {
  const b64Key = Deno.env.get("TOKEN_ENCRYPTION_KEY");
  if (!b64Key) throw new Error("Missing TOKEN_ENCRYPTION_KEY");

  const rawKey = Uint8Array.from(atob(b64Key), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(plaintext),
    ),
  );

  const combined = new Uint8Array(iv.length + cipher.length);
  combined.set(iv, 0);
  combined.set(cipher, iv.length);
  return btoa(String.fromCharCode(...combined));
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
