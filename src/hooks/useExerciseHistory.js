import { useCallback, useEffect, useState } from "react";

const workoutApi = typeof window !== "undefined" ? window.workoutApi : null;

/**
 * Fetch all historical sessions for a given exercise name or ID.
 * Returns sorted array of { date, sets[] } most recent first.
 */
export function useExerciseHistory(exerciseName) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!exerciseName || !workoutApi) { setLoading(false); return; }
    let cancelled = false;

    async function load() {
      const dates = await workoutApi.allDates();
      if (cancelled) return;

      // Load last 30 workout dates to find matching exercises
      const recentDates = (dates || []).sort().reverse().slice(0, 60);
      const sessions = [];

      for (const date of recentDates) {
        const log = await workoutApi.get(date);
        if (cancelled) return;
        if (!log?.exercises) continue;
        const match = log.exercises.find(e =>
          e.name === exerciseName || e.exerciseId === exerciseName
        );
        if (match) {
          sessions.push({ date, sets: match.sets || [] });
        }
        if (sessions.length >= 10) break; // limit to last 10 sessions
      }

      if (!cancelled) {
        setHistory(sessions);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [exerciseName]);

  // Get the most recent session (for "last time" display)
  const lastSession = history.length > 0 ? history[0] : null;

  return { history, lastSession, loading };
}
