import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ymd, addDays } from "../lib/dates.js";

const aiApi = typeof window !== "undefined" ? window.aiApi : null;
const settingsApi = typeof window !== "undefined" ? window.settingsApi : null;
const plannerApi = typeof window !== "undefined" ? window.plannerApi : null;
const sleepApi = typeof window !== "undefined" ? window.sleepApi : null;
const waterApi = typeof window !== "undefined" ? window.waterApi : null;
const focusApi = typeof window !== "undefined" ? window.focusApi : null;
const goalsApi = typeof window !== "undefined" ? window.goalsApi : null;
const bodyApi = typeof window !== "undefined" ? window.bodyApi : null;

const PRESET_QUESTIONS = [
  "How did I do this week?",
  "What habits am I struggling with?",
  "Analyze my sleep patterns",
  "What should I focus on today?",
  "Give me a weekly summary",
];

function buildSystemPrompt(context) {
  const { plannerData, sleepData, waterData, focusData, goals, bodyData } = context;
  const today = new Date();
  const todayStr = ymd(today);

  // Summarize last 7 days of planner data
  let habitSummary = "";
  let moodSummary = "";
  let agendaSummary = "";
  const last7 = [];
  for (let i = 0; i < 7; i++) {
    last7.push(ymd(addDays(today, -i)));
  }

  if (plannerData && typeof plannerData === "object") {
    const entries = last7.map(d => ({ date: d, ...(plannerData[d] || {}) })).filter(e => e);
    // Habits
    const habitDays = entries.filter(e => e.habits && typeof e.habits === "object");
    if (habitDays.length > 0) {
      const allHabitKeys = new Set();
      habitDays.forEach(e => Object.keys(e.habits).forEach(k => allHabitKeys.add(k)));
      const habitStats = [];
      for (const key of allHabitKeys) {
        const done = habitDays.filter(e => e.habits[key]).length;
        habitStats.push(`${key}: ${done}/${habitDays.length} days`);
      }
      habitSummary = `Habit completion (last 7 days): ${habitStats.join(", ")}`;
    }
    // Mood
    const moods = entries.filter(e => e.mood).map(e => `${e.date}: ${e.mood}`);
    if (moods.length) moodSummary = `Mood log: ${moods.join(", ")}`;
    // Agenda/goals
    const agendas = entries.filter(e => e.agenda).map(e => `${e.date}: ${e.agenda}`);
    if (agendas.length) agendaSummary = `Recent agenda items: ${agendas.slice(0, 3).join(" | ")}`;
  }

  // Sleep summary
  let sleepSummary = "";
  if (sleepData && sleepData.length > 0) {
    const recent = sleepData.slice(-7);
    const durations = recent
      .map(s => {
        if (s.duration != null) return s.duration;
        if (s.bedtime && s.waketime) {
          const [bh, bm] = s.bedtime.split(":").map(Number);
          const [wh, wm] = s.waketime.split(":").map(Number);
          let bed = bh * 60 + bm;
          let wake = wh * 60 + wm;
          if (wake <= bed) wake += 24 * 60;
          return (wake - bed) / 60;
        }
        return null;
      })
      .filter(d => d != null);
    if (durations.length) {
      const avg = (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1);
      sleepSummary = `Sleep (last ${durations.length} nights): avg ${avg}h`;
      const qualities = recent.filter(s => s.quality).map(s => s.quality);
      if (qualities.length) {
        const avgQ = (qualities.reduce((a, b) => a + b, 0) / qualities.length).toFixed(1);
        sleepSummary += `, avg quality ${avgQ}/5`;
      }
    }
  }

  // Water summary
  let waterSummary = "";
  if (waterData && waterData.length > 0) {
    const recent = waterData.slice(-7);
    const totals = recent.map(w => w.total || w.amount || 0).filter(t => t > 0);
    if (totals.length) {
      const avg = (totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(0);
      waterSummary = `Water intake (last ${totals.length} days): avg ${avg}oz`;
    }
  }

  // Focus summary
  let focusSummary = "";
  if (focusData && focusData.length > 0) {
    const recent = focusData.slice(-7);
    const totalMins = recent.reduce((sum, f) => sum + (f.duration || 0), 0);
    focusSummary = `Focus sessions (last 7 days): ${recent.length} sessions, ${Math.round(totalMins / 60)}h total`;
  }

  // Goals summary
  let goalsSummary = "";
  if (goals && goals.length > 0) {
    const active = goals.filter(g => !g.completed && !g.archived);
    goalsSummary = `Active goals (${active.length}): ${active.slice(0, 5).map(g => g.title || g.name).join(", ")}`;
  }

  // Body stats summary
  let bodySummary = "";
  if (bodyData && bodyData.length > 0) {
    const latest = bodyData[bodyData.length - 1];
    const parts = [];
    if (latest.weight) parts.push(`weight: ${latest.weight}lbs`);
    if (latest.bodyFat) parts.push(`body fat: ${latest.bodyFat}%`);
    if (parts.length) bodySummary = `Latest body stats: ${parts.join(", ")}`;
  }

  const sections = [
    habitSummary,
    moodSummary,
    agendaSummary,
    sleepSummary,
    waterSummary,
    focusSummary,
    goalsSummary,
    bodySummary,
  ].filter(Boolean);

  return `You are an insightful life coach and data analyst embedded in a personal operating system called LifeMax OS. The user tracks their habits, sleep, water, focus sessions, goals, body stats, mood, and more. Today is ${todayStr}.

Here is a summary of the user's recent data:
${sections.length > 0 ? sections.join("\n") : "No recent data available yet."}

Guidelines:
- Reference their actual data when answering questions. Be specific.
- Be warm, supportive, and concise. Avoid generic platitudes.
- When analyzing patterns, note both strengths and areas for improvement.
- Keep responses focused and actionable.
- Use plain text, no emojis.`;
}

export default function AiChatPage() {
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => ymd(today), [today]);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState(null);
  const [provider, setProvider] = useState("openai");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [dataLoaded, setDataLoaded] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load settings
  useEffect(() => {
    if (!settingsApi) return;
    let cancelled = false;
    Promise.all([
      settingsApi.get("ai_api_key").catch(() => null),
      settingsApi.get("ai_provider").catch(() => "openai"),
    ]).then(([key, prov]) => {
      if (cancelled) return;
      setApiKey(key || null);
      setProvider(prov || "openai");
    });
    return () => { cancelled = true; };
  }, []);

  // Load user data and build system prompt
  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      const thirtyAgo = ymd(addDays(today, -30));
      const [plannerData, sleepData, waterData, focusData, goals, bodyData] = await Promise.all([
        plannerApi ? plannerApi.getAll().catch(() => ({})) : {},
        sleepApi ? sleepApi.range(thirtyAgo, todayStr).catch(() => []) : [],
        waterApi ? waterApi.range(thirtyAgo, todayStr).catch(() => []) : [],
        focusApi ? focusApi.getRange(thirtyAgo, todayStr).catch(() => []) : [],
        goalsApi ? goalsApi.list().catch(() => []) : [],
        bodyApi ? bodyApi.range(thirtyAgo, todayStr).catch(() => []) : [],
      ]);
      if (cancelled) return;
      const prompt = buildSystemPrompt({ plannerData, sleepData, waterData, focusData, goals, bodyData });
      setSystemPrompt(prompt);
      setDataLoaded(true);
    }
    loadData();
    return () => { cancelled = true; };
  }, [today, todayStr]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || loading || !aiApi || !apiKey) return;

    const userMsg = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const chatMessages = [
        { role: "system", content: systemPrompt },
        ...newMessages,
      ];
      const result = await aiApi.chat(chatMessages, {
        provider,
        apiKey,
        maxTokens: 1024,
        temperature: 0.7,
      });
      if (result.error) {
        setMessages([...newMessages, { role: "assistant", content: `Error: ${result.error}` }]);
      } else {
        setMessages([...newMessages, { role: "assistant", content: result.content }]);
      }
    } catch (err) {
      setMessages([...newMessages, { role: "assistant", content: `Something went wrong: ${err.message || "Unknown error"}` }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, apiKey, provider, systemPrompt]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }, [input, sendMessage]);

  const handlePreset = useCallback((q) => {
    sendMessage(q);
  }, [sendMessage]);

  // No API key state
  if (!apiKey && dataLoaded) {
    return (
      <div className="daysPage">
        <style>{acStyles}</style>
        <div className="ac-header">
          <h1 className="ac-title">AI Chat</h1>
          <p className="ac-subtitle">Ask questions about your life data</p>
        </div>
        <div className="ac-no-key">
          <div className="ac-no-key-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
          </div>
          <h2>API Key Required</h2>
          <p>To use AI Chat, add your API key in Settings under the AI section.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="daysPage">
      <style>{acStyles}</style>
      <div className="ac-container">
        <div className="ac-header">
          <h1 className="ac-title">AI Chat</h1>
          <p className="ac-subtitle">Ask questions about your life data</p>
        </div>

        <div className="ac-messages">
          {messages.length === 0 && !loading && (
            <div className="ac-empty">
              <div className="ac-empty-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <p className="ac-empty-text">Start a conversation about your data</p>
              <div className="ac-presets">
                {PRESET_QUESTIONS.map((q) => (
                  <button key={q} className="ac-preset-chip" onClick={() => handlePreset(q)}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`ac-msg ac-msg-${msg.role}`}>
              <div className={`ac-bubble ac-bubble-${msg.role}`}>
                {msg.role === "assistant" && (
                  <div className="ac-bubble-label">LifeMax AI</div>
                )}
                <div className="ac-bubble-content">{msg.content}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="ac-msg ac-msg-assistant">
              <div className="ac-bubble ac-bubble-assistant">
                <div className="ac-bubble-label">LifeMax AI</div>
                <div className="ac-typing">
                  <span className="ac-dot" />
                  <span className="ac-dot" />
                  <span className="ac-dot" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="ac-input-bar">
          <textarea
            ref={inputRef}
            className="ac-input"
            placeholder="Ask about your habits, sleep, goals..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={loading}
          />
          <button
            className="ac-send-btn"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

const acStyles = `
  .ac-container {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 64px);
    max-width: 800px;
    margin: 0 auto;
  }
  .ac-header {
    padding: 8px 0 12px;
    flex-shrink: 0;
  }
  .ac-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text);
    margin: 0;
  }
  .ac-subtitle {
    font-size: 0.85rem;
    color: var(--muted);
    margin: 4px 0 0;
  }
  .ac-messages {
    flex: 1;
    overflow-y: auto;
    padding: 12px 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .ac-msg {
    display: flex;
    width: 100%;
  }
  .ac-msg-user {
    justify-content: flex-end;
  }
  .ac-msg-assistant {
    justify-content: flex-start;
  }
  .ac-bubble {
    max-width: 75%;
    padding: 10px 14px;
    border-radius: 12px;
    font-size: 0.9rem;
    line-height: 1.55;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  .ac-bubble-user {
    background: var(--accent);
    color: #fff;
    border-bottom-right-radius: 4px;
  }
  .ac-bubble-assistant {
    background: var(--paper);
    color: var(--text);
    border: 1px solid var(--border);
    border-bottom-left-radius: 4px;
  }
  .ac-bubble-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--muted);
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .ac-bubble-content {
    white-space: pre-wrap;
  }
  .ac-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    text-align: center;
    padding: 40px 20px;
  }
  .ac-empty-icon {
    margin-bottom: 16px;
    opacity: 0.5;
  }
  .ac-empty-text {
    color: var(--muted);
    font-size: 0.95rem;
    margin: 0 0 24px;
  }
  .ac-presets {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    max-width: 480px;
  }
  .ac-preset-chip {
    background: var(--paper);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 8px 16px;
    font-size: 0.82rem;
    color: var(--text);
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .ac-preset-chip:hover {
    border-color: var(--accent);
    color: var(--accent);
    background: var(--bg);
  }
  .ac-input-bar {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    padding: 12px 0 8px;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  .ac-input {
    flex: 1;
    resize: none;
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 10px 14px;
    font-size: 0.9rem;
    font-family: inherit;
    line-height: 1.45;
    background: var(--paper);
    color: var(--text);
    outline: none;
    max-height: 120px;
    overflow-y: auto;
    transition: border-color 0.15s ease;
  }
  .ac-input:focus {
    border-color: var(--accent);
  }
  .ac-input:disabled {
    opacity: 0.6;
  }
  .ac-send-btn {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    border: none;
    background: var(--accent);
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: opacity 0.15s ease;
  }
  .ac-send-btn:hover:not(:disabled) {
    opacity: 0.85;
  }
  .ac-send-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .ac-typing {
    display: flex;
    gap: 5px;
    padding: 4px 0;
  }
  .ac-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--muted);
    animation: acBounce 1.2s infinite ease-in-out;
  }
  .ac-dot:nth-child(2) { animation-delay: 0.15s; }
  .ac-dot:nth-child(3) { animation-delay: 0.3s; }
  @keyframes acBounce {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
    30% { transform: translateY(-6px); opacity: 1; }
  }
  .ac-no-key {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 20px;
    text-align: center;
  }
  .ac-no-key-icon {
    margin-bottom: 16px;
    opacity: 0.5;
  }
  .ac-no-key h2 {
    font-size: 1.15rem;
    color: var(--text);
    margin: 0 0 8px;
  }
  .ac-no-key p {
    color: var(--muted);
    font-size: 0.9rem;
    margin: 0;
  }
`;
