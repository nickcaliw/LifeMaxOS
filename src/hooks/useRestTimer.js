import { useCallback, useEffect, useRef, useState } from "react";
import { playBell } from "../lib/sounds.js";

export function useRestTimer(defaultSeconds = 120) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            setIsRunning(false);
            playBell();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, timeRemaining]);

  const startTimer = useCallback((seconds) => {
    setTimeRemaining(seconds || defaultSeconds);
    setIsRunning(true);
  }, [defaultSeconds]);

  const skipTimer = useCallback(() => {
    setTimeRemaining(0);
    setIsRunning(false);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const addTime = useCallback((seconds) => {
    setTimeRemaining(prev => prev + seconds);
  }, []);

  const progress = isRunning || timeRemaining > 0
    ? 1 - (timeRemaining / (defaultSeconds || 120))
    : 0;

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  return {
    timeRemaining,
    isRunning,
    progress,
    formattedTime: formatTime(timeRemaining),
    startTimer,
    skipTimer,
    addTime,
  };
}
