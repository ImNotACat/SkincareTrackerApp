// ─── Gemini Availability Check ──────────────────────────────────────────────
// The Gemini API is accessed via the gemini-proxy Supabase Edge Function.
// The API key lives server-side as a Supabase secret.

/**
 * Whether the Gemini integration is available.
 * Always true — the key is stored server-side in the edge function.
 */
export function isGeminiAvailable(): boolean {
  return true;
}
