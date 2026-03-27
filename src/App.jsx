import React, { useCallback, useEffect, useMemo, useState } from "react";
import { HABITS, HOURS, defaultEntry } from "./lib/constants.js";
import { ymd, addDays, startOfWeekMonday, formatRange, isoWeekYear } from "./lib/dates.js";
import { defaultHabits, progressFor, currentStreakEndingOn, bestStreakForHabit } from "./lib/habits.js";
import { useWeekData } from "./hooks/useDb.js";
import { useHabits } from "./hooks/useHabits.js";
import AutoGrowTextarea from "./components/AutoGrowTextarea.jsx";
import Sidebar from "./components/Sidebar.jsx";
import StarRating from "./components/StarRating.jsx";
import CalendarPage from "./pages/CalendarPage.jsx";
import WorkoutsPage from "./pages/WorkoutsPage.jsx";
import HabitsPage from "./pages/HabitsPage.jsx";
import JournalPage from "./pages/JournalPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import GoalsPage from "./pages/GoalsPage.jsx";
import WeeklyReviewPage from "./pages/WeeklyReviewPage.jsx";
import BodyStatsPage from "./pages/BodyStatsPage.jsx";
import FinancesPage from "./pages/FinancesPage.jsx";
import FocusTimerPage from "./pages/FocusTimerPage.jsx";
import SleepTrackerPage from "./pages/SleepTrackerPage.jsx";
import VisionBoardPage from "./pages/VisionBoardPage.jsx";
import WaterTrackerPage from "./pages/WaterTrackerPage.jsx";
import MeditationPage from "./pages/MeditationPage.jsx";
import ScoreboardPage from "./pages/ScoreboardPage.jsx";
import AffirmationsPage from "./pages/AffirmationsPage.jsx";
import SupplementsPage from "./pages/SupplementsPage.jsx";
import ReportPage from "./pages/ReportPage.jsx";
import KnowledgeVaultPage from "./pages/KnowledgeVaultPage.jsx";
import MealPlannerPage from "./pages/MealPlannerPage.jsx";
import AchievementsPage from "./pages/AchievementsPage.jsx";
import DaysSincePage from "./pages/DaysSincePage.jsx";
import ProjectsPage from "./pages/ProjectsPage.jsx";
import LifeAreasPage from "./pages/LifeAreasPage.jsx";
import LettersPage from "./pages/LettersPage.jsx";
import LifeTimelinePage from "./pages/LifeTimelinePage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import MacrosPage from "./pages/MacrosPage.jsx";
import CareerPage from "./pages/CareerPage.jsx";
import BibleStudyPage from "./pages/BibleStudyPage.jsx";
import RoutinesPage from "./pages/RoutinesPage.jsx";
import MoodTrackerPage from "./pages/MoodTrackerPage.jsx";
import FastingTrackerPage from "./pages/FastingTrackerPage.jsx";
import BudgetPage from "./pages/BudgetPage.jsx";
import NetWorthPage from "./pages/NetWorthPage.jsx";
import SideHustlesPage from "./pages/SideHustlesPage.jsx";
import NetworkingPage from "./pages/NetworkingPage.jsx";
import PrayerJournalPage from "./pages/PrayerJournalPage.jsx";
import ScriptureMemoryPage from "./pages/ScriptureMemoryPage.jsx";
import SermonNotesPage from "./pages/SermonNotesPage.jsx";
import BucketListPage from "./pages/BucketListPage.jsx";
import SkillsTrackerPage from "./pages/SkillsTrackerPage.jsx";
import RelationshipTrackerPage from "./pages/RelationshipTrackerPage.jsx";
import ChallengesPage from "./pages/ChallengesPage.jsx";
import PeoplePage from "./pages/PeoplePage.jsx";
import DateIdeasPage from "./pages/DateIdeasPage.jsx";
import GiftIdeasPage from "./pages/GiftIdeasPage.jsx";
import CleaningSchedulePage from "./pages/CleaningSchedulePage.jsx";
import SubscriptionsPage from "./pages/SubscriptionsPage.jsx";
import GlobalSearch from "./components/GlobalSearch.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import Onboarding from "./components/Onboarding.jsx";

const settingsApiApp = typeof window !== "undefined" ? window.settingsApi : null;

function PlaceholderPage({ title }) {
  return (
    <div className="placeholderPage">
      <div className="placeholderIcon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.3">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="9" y1="3" x2="9" y2="21" />
        </svg>
      </div>
      <div className="placeholderTitle">{title}</div>
      <div className="placeholderSub">Coming soon</div>
    </div>
  );
}

export default function App() {
  const { habits: HABITS_LIST } = useHabits();
  const [activePage, setActivePage] = useState("dashboard");
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()));
  const [plannerView, setPlannerView] = useState("3day"); // "3day" or "week"
  const [searchOpen, setSearchOpen] = useState(false);
  const [weightUnit, setWeightUnit] = useState("lbs");
  const todayStr = useMemo(() => ymd(new Date()), []);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [spiritualPath, setSpiritualPath] = useState("christianity");

  // Check if onboarding is needed
  useEffect(() => {
    async function checkOnboarding() {
      if (!settingsApiApp) { setOnboardingChecked(true); return; }
      const done = await settingsApiApp.get("onboarding_complete");
      if (done) { setOnboardingChecked(true); return; }
      // Check if this is an existing user with data (skip onboarding for them)
      const plannerApiCheck = typeof window !== "undefined" ? window.plannerApi : null;
      if (plannerApiCheck) {
        const allEntries = await plannerApiCheck.getAll();
        if (allEntries && Object.keys(allEntries).length > 0) {
          // Existing user — mark onboarding complete and skip
          await settingsApiApp.set("onboarding_complete", "true");
          setOnboardingChecked(true);
          return;
        }
      }
      setShowOnboarding(true);
      setOnboardingChecked(true);
    }
    checkOnboarding();
  }, []);

  // Load saved settings
  useEffect(() => {
    window.settingsApi.get("weightUnit").then((saved) => {
      if (saved) setWeightUnit(saved);
    });
    window.settingsApi.get("spiritual_path").then((saved) => {
      if (saved) setSpiritualPath(saved);
    });
  }, []);
  const toggleWeightUnit = () => {
    const next = weightUnit === "lbs" ? "kg" : "lbs";
    setWeightUnit(next);
    window.settingsApi.set("weightUnit", next);
  };

  // Responsive zoom based on window size
  useEffect(() => {
    const updateZoom = () => {
      const w = window.outerWidth;
      if (w < 1300) document.documentElement.style.zoom = "0.7";
      else if (w < 1600) document.documentElement.style.zoom = "0.8";
      else document.documentElement.style.zoom = "0.85";
    };
    updateZoom();
    window.addEventListener("resize", updateZoom);
    return () => window.removeEventListener("resize", updateZoom);
  }, []);

  // Keyboard shortcuts
  const PAGE_SHORTCUTS = useMemo(() => ({
    "1": "dashboard", "2": "planner", "3": "calendar", "4": "habits",
    "5": "workouts", "6": "journal", "7": "goals", "8": "knowledge", "9": "focus",
  }), []);

  useEffect(() => {
    const handler = (e) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === "k") {
        e.preventDefault();
        setSearchOpen(prev => !prev);
        return;
      }
      if (meta && e.key === "j") {
        e.preventDefault();
        setActivePage("journal");
        return;
      }
      if (meta && e.key === "n") {
        e.preventDefault();
        setActivePage("notes");
        return;
      }
      if (meta && e.key === "d") {
        e.preventDefault();
        setActivePage("dashboard");
        return;
      }
      if (meta && PAGE_SHORTCUTS[e.key]) {
        e.preventDefault();
        setActivePage(PAGE_SHORTCUTS[e.key]);
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [PAGE_SHORTCUTS]);

  const { weekData, allData, loading, saveDay } = useWeekData(weekStart);

  // Load Apple Health data for visible dates
  const [healthData, setHealthData] = useState({}); // dateStr → { steps, heartRate, activeCal }
  useEffect(() => {
    if (!settingsApiApp) return;
    async function loadHealth() {
      const dates = plannerView === "3day"
        ? [addDays(new Date(), -1), new Date(), addDays(new Date(), 1)]
        : Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
      const result = {};
      for (const d of dates) {
        const ds = ymd(d);
        const [stepsRaw, hrRaw, acRaw] = await Promise.all([
          settingsApiApp.get(`steps_${ds}`),
          settingsApiApp.get(`heartrate_${ds}`),
          settingsApiApp.get(`activecal_${ds}`),
        ]);
        if (stepsRaw || hrRaw || acRaw) {
          result[ds] = {
            steps: stepsRaw ? JSON.parse(stepsRaw) : null,
            heartRate: hrRaw ? JSON.parse(hrRaw) : null,
            activeCal: acRaw ? JSON.parse(acRaw) : null,
          };
        }
      }
      setHealthData(result);
    }
    loadHealth();
  }, [weekStart, plannerView]);

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const { weekNumber, weekYear } = useMemo(() => isoWeekYear(weekStart), [weekStart]);

  const bestByHabit = useMemo(() => {
    const out = {};
    for (const h of HABITS_LIST) out[h] = bestStreakForHabit(allData, h);
    return out;
  }, [allData, HABITS_LIST]);

  const updateDay = (dateStr, patch) => {
    if (loading) return; // Don't save until data is loaded
    const current = weekData[dateStr] || defaultEntry(dateStr, HABITS_LIST);
    const next = typeof patch === "function" ? patch(current) : { ...current, ...patch };
    saveDay(dateStr, next);
  };

  const weekNutritionAvg = useMemo(() => {
    let count = 0;
    let totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    for (let i = 0; i < 7; i++) {
      const key = ymd(addDays(weekStart, i));
      const n = weekData[key]?.nutrition;
      if (n && (n.calories || n.protein || n.carbs || n.fat)) {
        count++;
        totals.calories += Number(n.calories) || 0;
        totals.protein += Number(n.protein) || 0;
        totals.carbs += Number(n.carbs) || 0;
        totals.fat += Number(n.fat) || 0;
      }
    }
    if (!count) return null;
    return {
      calories: Math.round(totals.calories / count),
      protein: Math.round(totals.protein / count),
      carbs: Math.round(totals.carbs / count),
      fat: Math.round(totals.fat / count),
      days: count,
    };
  }, [weekData, weekStart]);

  // 3-day view: yesterday, today, tomorrow
  const threeDayDates = useMemo(() => {
    const now = new Date();
    return [addDays(now, -1), now, addDays(now, 1)];
  }, []);

  const goPrevWeek = () => setWeekStart((d) => addDays(d, -7));
  const goNextWeek = () => setWeekStart((d) => addDays(d, 7));
  const goToday = () => setWeekStart(startOfWeekMonday(new Date()));

  const displayDates = plannerView === "3day" ? threeDayDates : weekDates;

  if (!onboardingChecked) return null;

  if (showOnboarding) {
    return <Onboarding onComplete={() => { setShowOnboarding(false); window.location.reload(); }} />;
  }

  return (
    <div className="appShell">
      <Sidebar activePage={activePage} onNavigate={setActivePage} spiritualPath={spiritualPath} />

      <GlobalSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={(page) => { setActivePage(page); setSearchOpen(false); }}
      />

      <div className="mainArea">
        {/* Draggable title bar region */}
        <div className="titleBarDrag" />

        <ErrorBoundary key={activePage}>
        {activePage === "dashboard" ? (
          <DashboardPage onNavigate={setActivePage} spiritualPath={spiritualPath} />
        ) : activePage === "planner" ? (
          <>
            {/* Top bar */}
            <div className="topbar">
              <div className="topbarLeft">
                <h1 className="pageTitle">{plannerView === "3day" ? "Daily Planner" : "Weekly Planner"}</h1>
                <div className="weekBadge">
                  {plannerView === "3day"
                    ? new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
                    : `Week ${weekNumber} · ${weekYear}`}
                </div>
              </div>
              <div className="nav">
                <div className="plannerViewToggle">
                  <button
                    className={`plannerViewBtn ${plannerView === "3day" ? "plannerViewBtnActive" : ""}`}
                    onClick={() => setPlannerView("3day")}
                    type="button"
                  >3 Day</button>
                  <button
                    className={`plannerViewBtn ${plannerView === "week" ? "plannerViewBtnActive" : ""}`}
                    onClick={() => setPlannerView("week")}
                    type="button"
                  >Week</button>
                </div>
                {plannerView === "week" && (
                  <>
                    <button className="btn" onClick={goPrevWeek} aria-label="Previous week">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </button>
                    <div className="range">{formatRange(weekStart)}</div>
                    <button className="btn" onClick={goNextWeek} aria-label="Next week">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 6 15 12 9 18" />
                      </svg>
                    </button>
                    <button className="btn btnPrimary" onClick={goToday}>
                      Today
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Weekly nutrition averages */}
            {weekNutritionAvg && (
              <div className="nutritionAvgBar">
                <span className="nutritionAvgLabel">Weekly Avg ({weekNutritionAvg.days}d)</span>
                <span className="nutritionAvgStat"><strong>{weekNutritionAvg.calories}</strong> cal</span>
                <span className="nutritionAvgStat"><strong>{weekNutritionAvg.protein}g</strong> protein</span>
                <span className="nutritionAvgStat"><strong>{weekNutritionAvg.carbs}g</strong> carbs</span>
                <span className="nutritionAvgStat"><strong>{weekNutritionAvg.fat}g</strong> fat</span>
              </div>
            )}

            {/* Week */}
            <div className="weekViewport">
              {loading ? (
                <div className="loadingMsg">Loading…</div>
              ) : (
                <div className={`weekGrid ${plannerView === "3day" ? "threeDayGrid" : ""}`}>
                  {displayDates.map((d) => {
                    const dateStr = ymd(d);
                    const day = weekData[dateStr] || defaultEntry(dateStr, HABITS_LIST);
                    const isToday = dateStr === todayStr;

                    const dayName = plannerView === "3day"
                      ? (dateStr === ymd(addDays(new Date(), -1)) ? "Yesterday"
                        : isToday ? "Today"
                        : "Tomorrow")
                      : d.toLocaleDateString(undefined, { weekday: "long" });
                    const chip = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

                    // Ensure arrays exist (old entries may have different shape)
                    if (!Array.isArray(day.top3)) day.top3 = day.priorities || ["", "", ""];
                    if (!Array.isArray(day.wins)) day.wins = ["", "", ""];

                    const { done, total, pct } = progressFor(day, HABITS_LIST);

                    return (
                      <div className={`dayCol ${isToday ? "isToday" : ""}`} key={dateStr}>
                        <div className="dayHeader">
                          <div className="dayHeaderLeft">
                            <div className="dayName">{dayName}</div>
                            <div className={`dateChip ${isToday ? "chipToday" : ""}`}>{chip}</div>
                          </div>
                          <div className="dayHeaderRight">
                            <button
                              className={`tabBtn ${day.tab === "planner" ? "active" : ""}`}
                              onClick={() => updateDay(dateStr, (cur) => ({ ...cur, tab: "planner" }))}
                              type="button"
                              title="Planner"
                            >
                              {plannerView === "week" ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> : "Planner"}
                            </button>
                            <button
                              className={`tabBtn ${day.tab === "habits" ? "active" : ""}`}
                              onClick={() => updateDay(dateStr, (cur) => ({ ...cur, tab: "habits" }))}
                              type="button"
                              title="Habits"
                            >
                              {plannerView === "week" ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> : "Habits"}
                            </button>
                            <button
                              className={`tabBtn ${day.tab === "journal" ? "active" : ""}`}
                              onClick={() => updateDay(dateStr, (cur) => ({ ...cur, tab: "journal" }))}
                              type="button"
                              title="Journal"
                            >
                              {plannerView === "week" ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> : "Journal"}
                            </button>
                          </div>
                        </div>

                        {day.tab === "planner" ? (
                          <div className="dayBody">
                            <div className="section">
                              <div className="label">Grateful for</div>
                              <AutoGrowTextarea
                                value={day.grateful}
                                onChange={(v) => updateDay(dateStr, (cur) => ({ ...cur, grateful: v }))}
                                placeholder="What am I grateful for?"
                                className="input"
                                rows={1}
                                minHeight={34}
                                maxHeight={160}
                              />
                            </div>

                            <div className="section">
                              <div className="label">How I want to feel</div>
                              <AutoGrowTextarea
                                value={day.feel}
                                onChange={(v) => updateDay(dateStr, (cur) => ({ ...cur, feel: v }))}
                                placeholder="Calm, focused, energized…"
                                className="input"
                                rows={1}
                                minHeight={34}
                                maxHeight={160}
                              />
                            </div>

                            <div className="section">
                              <div className="label">Daily goal</div>
                              <AutoGrowTextarea
                                value={day.goal}
                                onChange={(v) => updateDay(dateStr, (cur) => ({ ...cur, goal: v }))}
                                placeholder="What matters most today?"
                                className="input"
                                rows={1}
                                minHeight={34}
                                maxHeight={160}
                              />
                            </div>

                            <div className="divider" />

                            <div className="section">
                              <div className="label">Agenda</div>
                              <div className="agenda">
                                {HOURS.map((h) => (
                                  <div className="row" key={h}>
                                    <div className="time">{h}</div>
                                    <AutoGrowTextarea
                                      value={day.agenda?.[h] || ""}
                                      onChange={(v) =>
                                        updateDay(dateStr, (cur) => ({
                                          ...cur,
                                          agenda: { ...cur.agenda, [h]: v },
                                        }))
                                      }
                                      placeholder=""
                                      className="input inputSlim"
                                      rows={1}
                                      minHeight={32}
                                      maxHeight={220}
                                      ariaLabel={`${dayName} ${h}`}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="divider" />

                            <div className="section">
                              <div className="label">Top 3 things to do</div>
                              <div className="list3">
                                {day.top3.map((t, i) => (
                                  <div className="row" key={i}>
                                    <div className="num">{i + 1}.</div>
                                    <AutoGrowTextarea
                                      value={t}
                                      onChange={(v) =>
                                        updateDay(dateStr, (cur) => {
                                          const next = [...cur.top3];
                                          next[i] = v;
                                          return { ...cur, top3: next };
                                        })
                                      }
                                      placeholder=""
                                      className="input inputSlim"
                                      rows={1}
                                      minHeight={32}
                                      maxHeight={200}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="section">
                              <div className="label">Notes</div>
                              <AutoGrowTextarea
                                value={day.notes}
                                onChange={(v) => updateDay(dateStr, (cur) => ({ ...cur, notes: v }))}
                                placeholder="Notes…"
                                className="input inputNotes"
                                rows={5}
                                minHeight={120}
                                maxHeight={420}
                              />
                            </div>

                            <div className="section">
                              <div className="label">Top 3 wins</div>
                              <div className="list3">
                                {day.wins.map((w, i) => (
                                  <div className="row" key={i}>
                                    <div className="num">{i + 1}.</div>
                                    <AutoGrowTextarea
                                      value={w}
                                      onChange={(v) =>
                                        updateDay(dateStr, (cur) => {
                                          const next = [...cur.wins];
                                          next[i] = v;
                                          return { ...cur, wins: next };
                                        })
                                      }
                                      placeholder=""
                                      className="input inputSlim"
                                      rows={1}
                                      minHeight={32}
                                      maxHeight={200}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="divider" />

                            <div className="section">
                              <div className="label">Nutrition</div>
                              <div className="nutritionGrid">
                                {[
                                  { key: "calories", label: "Cal", unit: "" },
                                  { key: "protein", label: "Protein", unit: "g" },
                                  { key: "carbs", label: "Carbs", unit: "g" },
                                  { key: "fat", label: "Fat", unit: "g" },
                                ].map(({ key, label, unit }) => (
                                  <div className="nutritionField" key={key}>
                                    <div className="nutritionLabel">{label}</div>
                                    <div className="nutritionInputWrap">
                                      <input
                                        type="number"
                                        className="nutritionInput"
                                        placeholder="—"
                                        value={day.nutrition?.[key] ?? ""}
                                        onChange={(e) =>
                                          updateDay(dateStr, (cur) => ({
                                            ...cur,
                                            nutrition: {
                                              ...(cur.nutrition || {}),
                                              [key]: e.target.value,
                                            },
                                          }))
                                        }
                                      />
                                      {unit && <span className="nutritionUnit">{unit}</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {healthData[dateStr] && (
                              <div className="section">
                                <div className="label">Health</div>
                                <div className="healthGrid">
                                  {healthData[dateStr].steps && (
                                    <div className="healthStat">
                                      <div className="healthStatValue">{healthData[dateStr].steps.count.toLocaleString()}</div>
                                      <div className="healthStatLabel">steps</div>
                                    </div>
                                  )}
                                  {healthData[dateStr].activeCal && (
                                    <div className="healthStat">
                                      <div className="healthStatValue">{healthData[dateStr].activeCal.total.toLocaleString()}</div>
                                      <div className="healthStatLabel">active cal</div>
                                    </div>
                                  )}
                                  {healthData[dateStr].heartRate && (
                                    <div className="healthStat">
                                      <div className="healthStatValue">{healthData[dateStr].heartRate.avg} <span className="healthStatUnit">bpm</span></div>
                                      <div className="healthStatLabel">{healthData[dateStr].heartRate.min}–{healthData[dateStr].heartRate.max}</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="section">
                              <div className="weightHeader">
                                <div className="label" style={{ marginBottom: 0 }}>Weight</div>
                                <button className="weightUnitToggle" onClick={toggleWeightUnit} type="button">
                                  {weightUnit}
                                </button>
                              </div>
                              <div className="weightGrid">
                                {[
                                  { key: "weightAm", label: "AM" },
                                  { key: "weightPm", label: "PM" },
                                ].map(({ key, label }) => {
                                  const val = Number(day[key]) || 0;
                                  const converted = val
                                    ? weightUnit === "lbs"
                                      ? (val / 2.20462).toFixed(1)
                                      : (val * 2.20462).toFixed(1)
                                    : null;
                                  const otherUnit = weightUnit === "lbs" ? "kg" : "lbs";
                                  return (
                                    <div className="weightField" key={key}>
                                      <div className="weightLabel">{label}</div>
                                      <div className="nutritionInputWrap">
                                        <input
                                          type="number"
                                          step="0.1"
                                          className="nutritionInput"
                                          placeholder="—"
                                          value={day[key] ?? ""}
                                          onChange={(e) =>
                                            updateDay(dateStr, (cur) => ({
                                              ...cur,
                                              [key]: e.target.value,
                                            }))
                                          }
                                        />
                                        <span className="nutritionUnit">{weightUnit}</span>
                                      </div>
                                      {converted && (
                                        <div className="weightConversion">
                                          {converted} {otherUnit}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="section rateRow">
                              <div className="label labelInline">Rate my day</div>
                              <StarRating
                                value={day.rating}
                                onChange={(v) =>
                                  updateDay(dateStr, (cur) => ({ ...cur, rating: v }))
                                }
                              />
                            </div>

                            <div className="spacer" />
                          </div>
                        ) : day.tab === "habits" ? (
                          <div className="dayBody">
                            <div className="section">
                              <div className="habitsTop">
                                <div className="label" style={{ marginBottom: 0 }}>
                                  Daily habits
                                </div>
                                <div className="habitsActions">
                                  <button
                                    className="miniBtn"
                                    onClick={() =>
                                      updateDay(dateStr, (cur) => {
                                        const next = { ...(cur.habits || defaultHabits(HABITS_LIST)) };
                                        HABITS_LIST.forEach((h) => (next[h] = true));
                                        return { ...cur, habits: next };
                                      })
                                    }
                                    type="button"
                                  >
                                    Mark all
                                  </button>
                                  <button
                                    className="miniBtn"
                                    onClick={() =>
                                      updateDay(dateStr, (cur) => {
                                        const next = { ...(cur.habits || defaultHabits(HABITS_LIST)) };
                                        HABITS_LIST.forEach((h) => (next[h] = false));
                                        return { ...cur, habits: next };
                                      })
                                    }
                                    type="button"
                                  >
                                    Clear
                                  </button>
                                </div>
                              </div>

                              <div className="progressWrap">
                                <div className="progressBar">
                                  <div className="progressFill" style={{ width: `${pct}%` }} />
                                </div>
                                <div className="progressMeta">
                                  <span className="pct">{pct}%</span>
                                  <span className="counts">
                                    {done}/{total}
                                  </span>
                                </div>
                              </div>

                              <div className="habitList">
                                {HABITS_LIST.map((h) => {
                                  const checked = !!day.habits?.[h];
                                  const curStreak = currentStreakEndingOn(allData, dateStr, h);
                                  const best = bestByHabit[h] || 0;

                                  return (
                                    <button
                                      key={h}
                                      className={`habitRow ${checked ? "checked" : ""}`}
                                      onClick={() =>
                                        updateDay(dateStr, (cur) => {
                                          const next = { ...(cur.habits || defaultHabits(HABITS_LIST)) };
                                          next[h] = !next[h];
                                          return { ...cur, habits: next };
                                        })
                                      }
                                      type="button"
                                    >
                                      <span className={`check ${checked ? "on" : ""}`}>
                                        {checked ? "✓" : ""}
                                      </span>
                                      <div className="habitMid">
                                        <div className="habitText">{h}</div>
                                        <div className="streakRow">
                                          <span className="streakBadge">🔥 {curStreak}</span>
                                          <span className="bestBadge">🏆 {best}</span>
                                        </div>
                                      </div>
                                      <span className="chev">›</span>
                                    </button>
                                  );
                                })}
                              </div>

                              <div className="hint">
                                Streaks count consecutive days. Miss a day → streak resets.
                              </div>
                            </div>
                          </div>
                        ) : day.tab === "journal" ? (
                          <div className="dayBody">
                            {healthData[dateStr] && (
                              <div className="section">
                                <div className="label">Health</div>
                                <div className="healthGrid">
                                  {healthData[dateStr].steps && (
                                    <div className="healthStat">
                                      <div className="healthStatValue">{healthData[dateStr].steps.count.toLocaleString()}</div>
                                      <div className="healthStatLabel">steps</div>
                                    </div>
                                  )}
                                  {healthData[dateStr].activeCal && (
                                    <div className="healthStat">
                                      <div className="healthStatValue">{healthData[dateStr].activeCal.total.toLocaleString()}</div>
                                      <div className="healthStatLabel">active cal</div>
                                    </div>
                                  )}
                                  {healthData[dateStr].heartRate && (
                                    <div className="healthStat">
                                      <div className="healthStatValue">{healthData[dateStr].heartRate.avg} <span className="healthStatUnit">bpm</span></div>
                                      <div className="healthStatLabel">{healthData[dateStr].heartRate.min}–{healthData[dateStr].heartRate.max}</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            <div className="section">
                              <div className="label">How are you feeling?</div>
                              <div className="jnlMoodPicker">
                                {[
                                  { value: "great", label: "Great", emoji: "😄", color: "#27ae60" },
                                  { value: "good", label: "Good", emoji: "🙂", color: "#2ecc71" },
                                  { value: "okay", label: "Okay", emoji: "😐", color: "#f1c40f" },
                                  { value: "low", label: "Low", emoji: "😔", color: "#e67e22" },
                                  { value: "tough", label: "Tough", emoji: "😢", color: "#e74c3c" },
                                ].map(m => (
                                  <button key={m.value}
                                    className={`jnlMoodBtn ${day.journalMood === m.value ? "jnlMoodActive" : ""}`}
                                    style={day.journalMood === m.value ? { background: m.color + "20", borderColor: m.color } : {}}
                                    onClick={() => updateDay(dateStr, (cur) => ({ ...cur, journalMood: m.value }))}
                                    type="button">
                                    <span className="jnlMoodEmoji">{m.emoji}</span>
                                    <span className="jnlMoodLabel">{m.label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="section">
                              <div className="label">Energy level</div>
                              <div className="jnlEnergyPicker">
                                {[{ level: 1, label: "Very Low" }, { level: 2, label: "Low" }, { level: 3, label: "Medium" }, { level: 4, label: "High" }, { level: 5, label: "Very High" }].map(e => (
                                  <button key={e.level}
                                    className={`jnlEnergyBtn ${day.journalEnergy === e.level ? "jnlEnergyActive" : ""}`}
                                    onClick={() => updateDay(dateStr, (cur) => ({ ...cur, journalEnergy: e.level }))}
                                    type="button">
                                    <div className="jnlEnergyBars">
                                      {[1,2,3,4,5].map(i => (
                                        <div key={i} className="jnlEnergyBar"
                                          style={{ height: i * 4, background: i <= e.level ? (day.journalEnergy === e.level ? "var(--accent)" : "var(--muted)") : "var(--line2)" }} />
                                      ))}
                                    </div>
                                    <span className="jnlEnergyLabel">{e.label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="section">
                              <div className="label">What's influencing your mood?</div>
                              <div className="jnlTagPicker">
                                {["Work", "Exercise", "Social", "Sleep", "Weather", "Food", "Stress", "Family", "Health", "Creativity"].map(tag => (
                                  <button key={tag}
                                    className={`jnlTag ${(day.journalTags || []).includes(tag) ? "jnlTagActive" : ""}`}
                                    onClick={() => updateDay(dateStr, (cur) => {
                                      const prev = cur.journalTags || [];
                                      const next = prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag];
                                      return { ...cur, journalTags: next };
                                    })}
                                    type="button">
                                    {tag}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="section">
                              <div className="label">Journal</div>
                              <AutoGrowTextarea
                                value={day.journal || ""}
                                onChange={(v) => updateDay(dateStr, (cur) => ({ ...cur, journal: v }))}
                                placeholder="Write your thoughts..."
                                className="input inputJournal"
                                rows={10}
                                minHeight={200}
                                maxHeight={800}
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : activePage === "calendar" ? (
          <CalendarPage
            onGoToDay={(weekStart) => {
              setWeekStart(weekStart);
              setActivePage("planner");
            }}
          />
        ) : activePage === "workouts" ? (
          <WorkoutsPage />
        ) : activePage === "habits" ? (
          <HabitsPage />
        ) : activePage === "journal" ? (
          <JournalPage />
        ) : activePage === "knowledge" ? (
          <KnowledgeVaultPage />
        ) : activePage === "goals" ? (
          <GoalsPage />
        ) : activePage === "review" ? (
          <WeeklyReviewPage />
        ) : activePage === "bodystats" ? (
          <BodyStatsPage />
        ) : activePage === "finances" ? (
          <FinancesPage />
        ) : activePage === "focus" ? (
          <FocusTimerPage />
        ) : activePage === "sleep" ? (
          <SleepTrackerPage />
        ) : activePage === "vision" ? (
          <VisionBoardPage />
        ) : activePage === "water" ? (
          <WaterTrackerPage />
        ) : activePage === "meditation" ? (
          <MeditationPage />
        ) : activePage === "scoreboard" ? (
          <ScoreboardPage />
        ) : activePage === "affirmations" ? (
          <AffirmationsPage />
        ) : activePage === "supplements" ? (
          <SupplementsPage />
        ) : activePage === "report" ? (
          <ReportPage />
        ) : activePage === "meals" ? (
          <MealPlannerPage />
        ) : activePage === "achievements" ? (
          <AchievementsPage />
        ) : activePage === "dayssince" ? (
          <DaysSincePage />
        ) : activePage === "projects" ? (
          <ProjectsPage />
        ) : activePage === "lifeareas" ? (
          <LifeAreasPage />
        ) : activePage === "letters" ? (
          <LettersPage />
        ) : activePage === "timeline" ? (
          <LifeTimelinePage />
        ) : activePage === "macros" ? (
          <MacrosPage />
        ) : activePage === "career" ? (
          <CareerPage />
        ) : activePage === "biblestudy" ? (
          <BibleStudyPage />
        ) : activePage === "quranstudy" ? (
          <BibleStudyPage collection="quranstudy" title="Quran Study"
            tagOptions={["Tawakkul", "Sabr", "Shukr", "Taqwa", "Ihsan", "Mercy", "Justice", "Knowledge", "Prayer", "Faith", "Forgiveness", "Charity", "Peace", "Guidance"]} />
        ) : activePage === "gratitudepractice" ? (
          <PrayerJournalPage collection="gratitude_entries" title="Gratitude Practice"
            categories={["Self", "Relationships", "Abundance", "Health", "Universe"]} />
        ) : activePage === "routines" ? (
          <RoutinesPage />
        ) : activePage === "mood" ? (
          <MoodTrackerPage />
        ) : activePage === "fasting" ? (
          <FastingTrackerPage />
        ) : activePage === "budget" ? (
          <BudgetPage />
        ) : activePage === "networth" ? (
          <NetWorthPage />
        ) : activePage === "sidehustles" ? (
          <SideHustlesPage />
        ) : activePage === "networking" ? (
          <NetworkingPage />
        ) : activePage === "prayerjournal" ? (
          <PrayerJournalPage />
        ) : activePage === "duajournal" ? (
          <PrayerJournalPage collection="duas" title="Dua Journal"
            categories={["Personal", "Family", "Ummah", "Dunya", "Shukr"]} />
        ) : activePage === "affirmationjournal" ? (
          <ScriptureMemoryPage collection="affirmation_entries" title="Affirmation Journal"
            categories={["Abundance", "Self-Love", "Health", "Success", "Peace"]} />
        ) : activePage === "energytracking" ? (
          <PrayerJournalPage collection="energy_entries" title="Energy Tracking"
            categories={["High Vibe", "Neutral", "Low Energy", "Blocked", "Flowing"]} />
        ) : activePage === "scripturememory" ? (
          <ScriptureMemoryPage />
        ) : activePage === "surahmemory" ? (
          <ScriptureMemoryPage collection="surahmemory" title="Surah Memory"
            categories={["Short Surahs", "Duas", "Key Verses", "Pillars", "Guidance"]} />
        ) : activePage === "sermonnotes" ? (
          <SermonNotesPage />
        ) : activePage === "khutbahnotes" ? (
          <SermonNotesPage collection="khutbahnotes" title="Khutbah Notes" />
        ) : activePage === "visionmeditation" ? (
          <MeditationPage />
        ) : activePage === "bucketlist" ? (
          <BucketListPage />
        ) : activePage === "skills" ? (
          <SkillsTrackerPage />
        ) : activePage === "relationships" ? (
          <RelationshipTrackerPage />
        ) : activePage === "challenges" ? (
          <ChallengesPage />
        ) : activePage === "people" ? (
          <PeoplePage />
        ) : activePage === "dateideas" ? (
          <DateIdeasPage />
        ) : activePage === "giftideas" ? (
          <GiftIdeasPage />
        ) : activePage === "cleaning" ? (
          <CleaningSchedulePage />
        ) : activePage === "subscriptions" ? (
          <SubscriptionsPage />
        ) : activePage === "settings" ? (
          <SettingsPage spiritualPath={spiritualPath} onSpiritualPathChange={setSpiritualPath} />
        ) : null}
        </ErrorBoundary>
      </div>
    </div>
  );
}
