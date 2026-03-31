import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ymd } from "../lib/dates.js";
import { playBell } from "../lib/sounds.js";

const focusApi = typeof window !== "undefined" ? window.focusApi : null;
const notificationApi = typeof window !== "undefined" ? window.notificationApi : null;

const MODES = {
  work: { label: "Work", duration: 25 * 60 },
  shortBreak: { label: "Short Break", duration: 5 * 60 },
  longBreak: { label: "Long Break", duration: 15 * 60 },
};

/**
 * Shared focus timer hook — lives in App.jsx so it persists across page navigation.
 */
export default function useFocusTimer() {
  const todayStr = useMemo(() => ymd(new Date()), []);

  const [mode, setMode] = useState("work");
  const [customDuration, setCustomDuration] = useState("");
  const [timeLeft, setTimeLeft] = useState(MODES.work.duration);
  const [running, setRunning] = useState(false);
  const [task, setTask] = useState("");
  const [sessions, setSessions] = useState([]);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  const modeDuration = useMemo(() => {
    if (customDuration && Number(customDuration) > 0) return Number(customDuration) * 60;
    return MODES[mode].duration;
  }, [mode, customDuration]);

  // Load today's sessions
  const loadSessions = useCallback(async () => {
    if (!focusApi) return;
    const data = await focusApi.getByDate(todayStr);
    setSessions(data || []);
  }, [todayStr]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  // Reset time when mode/duration changes (only if not running)
  useEffect(() => {
    if (!running) setTimeLeft(modeDuration);
  }, [modeDuration, running]);

  // Tick
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            setRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  // Session completion
  useEffect(() => {
    if (timeLeft === 0 && !running && startTimeRef.current) {
      playBell();
      if (notificationApi) {
        notificationApi.send("Focus Timer", "Session complete! Great work.");
      }
      const durationMin = Math.round(modeDuration / 60);
      const session = {
        task: task || MODES[mode].label,
        mode,
        duration: durationMin,
        durationMin,
        completedAt: new Date().toISOString(),
      };
      if (focusApi) {
        focusApi.add(crypto.randomUUID(), todayStr, session).then(() => loadSessions());
      }
      startTimeRef.current = null;
    }
  }, [timeLeft, running, modeDuration, todayStr, task, mode, loadSessions]);

  const start = useCallback(() => {
    if (timeLeft === 0) setTimeLeft(modeDuration);
    startTimeRef.current = Date.now();
    setRunning(true);
  }, [timeLeft, modeDuration]);

  const pause = useCallback(() => setRunning(false), []);

  const reset = useCallback(() => {
    setRunning(false);
    startTimeRef.current = null;
    setTimeLeft(modeDuration);
  }, [modeDuration]);

  const changeMode = useCallback((m) => {
    setRunning(false);
    startTimeRef.current = null;
    setMode(m);
    setCustomDuration("");
  }, []);

  const totalMin = useMemo(
    () => sessions.reduce((sum, s) => sum + (s.durationMin || s.duration || 0), 0),
    [sessions]
  );

  const progress = modeDuration > 0 ? timeLeft / modeDuration : 0;
  const isBreak = mode !== "work";

  return {
    // State
    mode, timeLeft, running, task, sessions, modeDuration,
    customDuration, progress, isBreak, totalMin, todayStr,
    // Actions
    start, pause, reset, changeMode,
    setTask, setCustomDuration, loadSessions,
    // Constants
    MODES,
  };
}
