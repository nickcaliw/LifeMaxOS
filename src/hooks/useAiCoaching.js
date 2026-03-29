import { useState, useEffect, useCallback } from "react";

const aiApi = typeof window !== "undefined" ? window.aiApi : null;
const settingsApi = typeof window !== "undefined" ? window.settingsApi : null;
const dailyPlanApi = typeof window !== "undefined" ? window.dailyPlanApi : null;

/**
 * Generates an AI coaching message based on the orchestrator plan.
 * Caches per day so it only calls the API once.
 * Falls back gracefully when no API key is set.
 */
export default function useAiCoaching(plan) {
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!plan || !aiApi || !settingsApi) return;
    let cancelled = false;

    async function generate() {
      // Check if we already have a cached AI message for today
      const todayStr = new Date().toISOString().slice(0, 10);
      const cacheKey = `ai_coaching_${todayStr}`;
      try {
        const cached = await settingsApi.get(cacheKey);
        if (cached && !cancelled) {
          setMessage(cached);
          return;
        }
      } catch {}

      // Check for API key
      const [apiKey, provider] = await Promise.all([
        settingsApi.get("ai_api_key").catch(() => null),
        settingsApi.get("ai_provider").catch(() => "openai"),
      ]);

      if (!apiKey || !cancelled === false) {
        // No key — use the plan's built-in coaching message
        if (!cancelled) setMessage(null);
        return;
      }

      setLoading(true);

      // Build the context summary for the AI
      const r = plan.readiness || {};
      const priorities = (plan.topPriorities || []).map(p => p.title).join(", ");
      const habits = (plan.habits || []).slice(0, 5).join(", ");
      const alerts = (plan.alerts || []).map(a => a.message).filter(Boolean).join(". ");
      const schedule = (plan.schedule || []).slice(0, 5).map(s => `${s.time} ${s.label}`).join(", ");

      const systemPrompt = `You are a world-class life coach embedded in a personal operating system app called LifeMax OS. You speak directly to the user like a supportive but no-nonsense coach. Be warm, concise, and actionable. 2-4 sentences max. No emojis. No generic motivation — reference their actual data.`;

      const userPrompt = `Here's my data for today:

Day type: ${r.dayType || "standard"} (readiness: ${r.score || "unknown"}/100)
Sleep: ${plan.readiness?.sleep || "unknown"}
Mood yesterday: ${plan.readiness?.mood || "unknown"}
Today's priorities: ${priorities || "none set"}
Key habits: ${habits || "none"}
Schedule: ${schedule || "not set"}
${alerts ? `Alerts: ${alerts}` : ""}
${plan.yesterdayScore ? `Yesterday's score: ${plan.yesterdayScore}/100` : ""}

Give me my daily coaching message. What should I focus on? What should I watch out for? Keep it real.`;

      try {
        const result = await aiApi.chat(
          [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          {
            provider: provider || "openai",
            apiKey,
            maxTokens: 200,
            temperature: 0.8,
          }
        );

        if (cancelled) return;

        if (result.content && !result.error) {
          setMessage(result.content);
          // Cache for today
          try { await settingsApi.set(cacheKey, result.content); } catch {}
        }
      } catch (err) {
        console.warn("[useAiCoaching] AI call failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    generate();
    return () => { cancelled = true; };
  }, [plan?.readiness?.dayType]); // only re-run when day type changes (i.e. new plan)

  const regenerate = useCallback(async () => {
    if (!settingsApi) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    try { await settingsApi.set(`ai_coaching_${todayStr}`, ""); } catch {}
    setMessage(null);
    // Will re-trigger on next render cycle if plan is still available
  }, []);

  return { message, loading, regenerate };
}
