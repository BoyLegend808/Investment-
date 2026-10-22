// Crest Wealth — market-quotes
//
// A small read-only proxy for the four stock/index quotes in the site ticker.
//
// Why this exists: the Alpha Vantage key used to be shipped to the browser in
// shared-utils.js, so any visitor could open the page source and copy it. It is
// now an Edge Function secret (`ALPHA_VANTAGE_KEY`) that never leaves the
// server, and the browser only ever talks to this endpoint.
//
// Auth: 'publishable' — callers send the ordinary public Supabase key that is
// already in supabase.js. That key is not a secret; the check is only there so
// the endpoint is not an open proxy that anyone on the internet can hammer and
// burn the Alpha Vantage quota with.
//
// Setup (run once, from the repo root):
//   supabase functions deploy market-quotes --project-ref panxaqueawnqrebikwvb
//   supabase secrets set ALPHA_VANTAGE_KEY=<your-key> --project-ref panxaqueawnqrebikwvb
//
// `verify_jwt = false` is required for this function and is set in
// supabase/config.toml — without it the platform rejects the request before the
// handler runs, because the caller sends a public key rather than a user JWT.

import { withSupabase } from "npm:@supabase/server@1";

const SYMBOLS = ["SPY", "AAPL", "MSFT", "TSLA"];

// Alpha Vantage's free tier allows roughly 25 requests/day for the whole key, so
// a short in-memory cache stops a burst of visitors from each spending a call.
// Best-effort only: it lives per isolate and is reset on cold start.
const CACHE_TTL_MS = 15 * 60 * 1000;
let cache: { at: number; body: unknown } | null = null;

type Quote = { symbol: string; price: number; change: number };

async function fetchQuote(symbol: string, apiKey: string): Promise<Quote | null> {
  const url =
    `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  // Rate-limited and error responses omit "Global Quote" entirely.
  const quote = json["Global Quote"];
  if (!quote || !quote["05. price"]) return null;
  return {
    symbol,
    price: parseFloat(quote["05. price"]),
    change: parseFloat(String(quote["10. change percent"]).replace("%", "")),
  };
}

export default {
  fetch: withSupabase({ auth: "publishable" }, async () => {
    const apiKey = Deno.env.get("ALPHA_VANTAGE_KEY");
    if (!apiKey) {
      return Response.json(
        { error: "ALPHA_VANTAGE_KEY is not set on this function" },
        { status: 500 },
      );
    }

    if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
      return Response.json(cache.body);
    }

    const results = await Promise.all(
      SYMBOLS.map((s) => fetchQuote(s, apiKey).catch(() => null)),
    );

    const quotes: Record<string, Quote> = {};
    for (const q of results) {
      if (q) quotes[q.symbol] = q;
    }

    const body = { quotes };
    cache = { at: Date.now(), body };
    return Response.json(body);
  }),
};
