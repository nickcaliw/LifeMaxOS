import { useCallback, useEffect, useState } from "react";

const settingsApi = typeof window !== "undefined" ? window.settingsApi : null;

export function useWorkoutProgram() {
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (settingsApi) {
        try {
          const raw = await settingsApi.get("workout_program");
          if (raw) {
            try {
              setProgram(JSON.parse(raw));
            } catch { /* invalid JSON, ignore */ }
          }
        } catch { /* settingsApi error, ignore */ }
      }
      setLoading(false);
    }
    load();
  }, []);

  const saveProgram = useCallback(async (prog) => {
    setProgram(prog);
    if (settingsApi) {
      await settingsApi.set("workout_program", JSON.stringify(prog));
    }
  }, []);

  const hasProgram = !!program;

  // Get workout template for a given date based on program
  const getWorkoutForDate = useCallback((date) => {
    if (!program) return null;
    const dow = date.getDay() === 0 ? 7 : date.getDay(); // 1=Mon...7=Sun
    return program.days.find(d => d.dayOfWeek === dow) || null;
  }, [program]);

  return { program, saveProgram, hasProgram, loading, getWorkoutForDate };
}
