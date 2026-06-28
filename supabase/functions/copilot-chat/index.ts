// Supabase Edge Function: copilot-chat
//
// Leitet Nutzerfragen an Claude Haiku weiter und gibt kontextbezogene
// Finanzantworten zurück. Setzt die aktuellen Finanzdaten des Nutzers als
// System-Prompt, damit Claude präzise auf Real Balance, Steuerrücklage etc.
// eingehen kann.
//
// Deploy:
//   supabase functions deploy copilot-chat
// Secret setzen:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ApiMessage = {
  role: "user" | "assistant";
  content: string;
};

type FinancialContext = {
  realBalance: number;
  taxReserve: number;
  fixedReserve: number;
  openInvoices: number;
  taxPct: number;
  fixedPct: number;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return json("ok", 200);
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

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
    return json({ error: "Unauthorized" }, 401);
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY is not set");
    return json({ error: "Server misconfigured" }, 500);
  }

  let messages: ApiMessage[];
  let context: FinancialContext;

  try {
    const body = await req.json();
    messages = body.messages;
    context = body.context;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return json({ error: "Missing messages" }, 400);
  }

  const systemPrompt = `Du bist der persoenliche Finanz-Copilot von FINO, einem Finanztracking-Tool fuer Freelancer in der DACH-Region. Du analysierst die finanziellen Daten des Nutzers und gibst klare, direkte Antworten auf Deutsch.

Aktuelle Finanzdaten des Nutzers:
- Real Balance (frei verfuegbar nach Ruecklagen): ${formatEUR(context.realBalance)}
- Steuer-Ruecklage (${context.taxPct}% der Einnahmen automatisch reserviert): ${formatEUR(context.taxReserve)}
- Fixkosten-Ruecklage (${context.fixedPct}% der Einnahmen automatisch reserviert): ${formatEUR(context.fixedReserve)}
- Offene Rechnungen (noch nicht bezahlt): ${formatEUR(context.openInvoices)}

Regeln:
- Antworte immer auf Deutsch, praesize und direkt
- Nutze die echten Zahlen des Nutzers in deinen Antworten
- Bei Leistbarkeitsfragen: beziehe dich auf die Real Balance, nicht auf das Gesamtguthaben
- Weise bei Bedarf auf Risiken fuer die Steuerruecklage hin
- Keine Emojis
- Maximal 2-3 Saetze pro Antwort`;

  const anthropicRes = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 300,
      system: systemPrompt,
      messages,
    }),
  });

  if (!anthropicRes.ok) {
    const err = await anthropicRes.json().catch(() => ({}));
    console.error("Anthropic API error:", anthropicRes.status, err);
    return json({ error: "AI service unavailable" }, 502);
  }

  const data = await anthropicRes.json();
  const text: string = data.content?.[0]?.text ??
    "Ich konnte deine Anfrage leider nicht bearbeiten.";

  return json({ text });
});

function formatEUR(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
