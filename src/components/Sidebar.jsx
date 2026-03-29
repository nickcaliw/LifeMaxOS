import { useState, useEffect, useMemo } from "react";
import { SPIRITUAL_PATHS } from "../lib/spirituality.js";

/* ─── Icon helpers ─── */
const I = ({ children, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const ChevronIcon = ({ open }) => (
  <svg
    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transition: "transform 0.2s ease", transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
  >
    <polyline points="9 6 15 12 9 18" />
  </svg>
);

const SunIcon = () => (
  <I size={18}><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></I>
);
const MoonIcon = () => (
  <I size={18}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></I>
);

/* ─── Icon map for dynamic spirituality items ─── */
const SPIRITUALITY_ICONS = {
  // Book icon — for study pages (biblestudy, quranstudy)
  biblestudy:        <I><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /><path d="M12 6v4" /><path d="M10 8h4" /></I>,
  quranstudy:        <I><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /><path d="M12 6v4" /><path d="M10 8h4" /></I>,
  // Journal icon — for prayer/dua/gratitude pages
  prayerjournal:     <I><path d="M12 22c-4 0-8-2-8-8V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8c0 6-4 8-8 8z" /><path d="M12 8v4" /><path d="M10 10h4" /></I>,
  duajournal:        <I><path d="M12 22c-4 0-8-2-8-8V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8c0 6-4 8-8 8z" /><path d="M12 8v4" /><path d="M10 10h4" /></I>,
  gratitudepractice: <I><path d="M12 22c-4 0-8-2-8-8V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8c0 6-4 8-8 8z" /><path d="M12 8v4" /><path d="M10 10h4" /></I>,
  energytracking:    <I><path d="M12 22c-4 0-8-2-8-8V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8c0 6-4 8-8 8z" /><path d="M12 8v4" /><path d="M10 10h4" /></I>,
  // Star icon — for memory/affirmation pages
  scripturememory:   <I><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /><path d="M9 7h6" /><path d="M9 11h4" /><circle cx="15" cy="15" r="3" /></I>,
  surahmemory:       <I><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /><path d="M9 7h6" /><path d="M9 11h4" /><circle cx="15" cy="15" r="3" /></I>,
  affirmationjournal:<I><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /><path d="M9 7h6" /><path d="M9 11h4" /><circle cx="15" cy="15" r="3" /></I>,
  // Document icon — for notes pages
  sermonnotes:       <I><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="13" y2="17" /></I>,
  khutbahnotes:      <I><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="13" y2="17" /></I>,
  // Person icon — for meditation pages
  meditation:        <I><circle cx="12" cy="6" r="3" /><path d="M12 9v4" /><path d="M7.5 19a4.5 4.5 0 0 1 9 0" /><path d="M5 21h14" /></I>,
  visionmeditation:  <I><circle cx="12" cy="6" r="3" /><path d="M12 9v4" /><path d="M7.5 19a4.5 4.5 0 0 1 9 0" /><path d="M5 21h14" /></I>,
};

/* ─── Navigation structure ─── */
const NAV_STATIC = [
  /* Dashboard — standalone */
  {
    id: "dashboard", label: "Dashboard",
    icon: <I><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></I>,
  },

  /* ── Planner ── */
  {
    section: "Planner", collapsible: true, defaultOpen: true,
    items: [
      { id: "planner", label: "Planner", icon: <I><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><path d="M9 16l2 2 4-4" /></I> },
      { id: "calendar", label: "Calendar", icon: <I><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></I> },
      { id: "goals", label: "Goals", icon: <I><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></I> },
      { id: "habits", label: "Habits", icon: <I><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></I> },
      { id: "routines", label: "Routines", icon: <I><path d="M17 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h10z" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="13" y2="16" /></I> },
      { id: "focus", label: "Focus Timer", icon: <I><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></I> },
      { id: "pomodorostats", label: "Focus Stats", icon: <I><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><circle cx="18" cy="7" r="3" /></I> },
      { id: "timeblocking", label: "Time Blocking", icon: <I><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /></I> },
      { id: "weeklyplanner", label: "Weekly Planner", icon: <I><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="7" y1="4" x2="7" y2="22" /><line x1="11" y1="4" x2="11" y2="22" /><line x1="15" y1="4" x2="15" y2="22" /></I> },
      { id: "habitstreaks", label: "Habit Streaks", icon: <I><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /><path d="M17 2l2 2-2 2" /></I> },
      { id: "report", label: "Report", icon: <I><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></I> },
    ],
  },

  /* ── Health & Wellness ── */
  {
    section: "Health & Wellness", collapsible: true, defaultOpen: false,
    items: [
      { id: "workouts", label: "Workouts", icon: <I><path d="M6.5 6.5h11" /><path d="M6.5 17.5h11" /><path d="M4 6.5a2.5 2.5 0 0 1 0 5h0a2.5 2.5 0 0 1 0-5" /><path d="M20 6.5a2.5 2.5 0 0 0 0 5h0a2.5 2.5 0 0 0 0-5" /><path d="M4 12.5a2.5 2.5 0 0 1 0 5h0a2.5 2.5 0 0 1 0-5" /><path d="M20 12.5a2.5 2.5 0 0 0 0 5h0a2.5 2.5 0 0 0 0-5" /><line x1="12" y1="2" x2="12" y2="6.5" /><line x1="12" y1="17.5" x2="12" y2="22" /></I> },
      { id: "meals", label: "Meals", icon: <I><path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" /></I> },
      { id: "macros", label: "Macros", icon: <I><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><line x1="9" y1="10" x2="15" y2="10" /><line x1="12" y1="7" x2="12" y2="13" /></I> },
      { id: "sleep", label: "Sleep", icon: <I><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></I> },
      { id: "water", label: "Water", icon: <I><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" /></I> },
      { id: "supplements", label: "Supplements", icon: <I><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></I> },
      { id: "bodystats", label: "Body Stats", icon: <I><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></I> },
      { id: "mood", label: "Mood Tracker", icon: <I><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></I> },
      { id: "fasting", label: "Fasting", icon: <I><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /><path d="M4.93 4.93l14.14 14.14" /></I> },
      { id: "stretching", label: "Stretching", icon: <I><path d="M12 2v8" /><path d="M4.93 10.93l4.24-4.24" /><path d="M19.07 10.93l-4.24-4.24" /><path d="M12 10v12" /><path d="M8 18l4 4 4-4" /></I> },
      { id: "symptoms", label: "Symptoms", icon: <I><path d="M22 12h-4l-3 9L9 3l-3 9H2" /><circle cx="12" cy="12" r="1" /></I> },
    ],
  },

  /* ── Finance & Career ── */
  {
    section: "Finance & Career", collapsible: true, defaultOpen: false,
    items: [
      { id: "finances", label: "Finances", icon: <I><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></I> },
      { id: "budget", label: "Budget", icon: <I><rect x="2" y="3" width="20" height="18" rx="2" /><line x1="2" y1="9" x2="22" y2="9" /><line x1="10" y1="9" x2="10" y2="21" /></I> },
      { id: "networth", label: "Net Worth", icon: <I><line x1="12" y1="20" x2="12" y2="10" /><polyline points="18 20 18 4" /><polyline points="6 20 6 16" /><line x1="2" y1="20" x2="22" y2="20" /></I> },
      { id: "career", label: "Career", icon: <I><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /><line x1="12" y1="12" x2="12" y2="12.01" /></I> },
      { id: "sidehustles", label: "Side Hustles", icon: <I><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></I> },
      { id: "projects", label: "Projects", icon: <I><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></I> },
      { id: "subscriptions", label: "Subscriptions", icon: <I><path d="M21 12a9 9 0 1 1-9-9" /><path d="M21 3v6h-6" /><path d="M21 3l-9 9" /></I> },
      { id: "savingsgoals", label: "Savings Goals", icon: <I><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2" /><line x1="2" y1="9" x2="5" y2="9" /></I> },
      { id: "debtpayoff", label: "Debt Payoff", icon: <I><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /><path d="M3 17l3-3 3 3" /></I> },
      { id: "investments", label: "Investments", icon: <I><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></I> },
    ],
  },

  /* ── Relationships ── */
  {
    section: "Relationships", collapsible: true, defaultOpen: false,
    items: [
      { id: "people", label: "People", icon: <I><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></I> },
      { id: "networking", label: "Networking", icon: <I><circle cx="6" cy="6" r="3" /><circle cx="18" cy="6" r="3" /><circle cx="12" cy="18" r="3" /><line x1="6" y1="9" x2="12" y2="15" /><line x1="18" y1="9" x2="12" y2="15" /></I> },
      { id: "relationships", label: "Relationships", icon: <I><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></I> },
      { id: "dateideas", label: "Date Ideas", icon: <I><path d="M17.5 6.5L12 12l-5.5-5.5" /><path d="M12 12v9" /><circle cx="12" cy="5" r="3" /></I> },
      { id: "giftideas", label: "Gift Ideas", icon: <I><polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" /><line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></I> },
      { id: "contactreminders", label: "Contact Reminders", icon: <I><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91" /><circle cx="18" cy="5" r="3" /></I> },
      { id: "socialevents", label: "Social Events", icon: <I><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M20 8v6" /><path d="M23 11h-6" /></I> },
    ],
  },

  /* ── Personal Growth ── */
  {
    section: "Personal Growth", collapsible: true, defaultOpen: false,
    items: [
      { id: "journal", label: "Journal", icon: <I><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></I> },
      { id: "timeline", label: "Life Timeline", icon: <I><line x1="12" y1="2" x2="12" y2="22" /><circle cx="12" cy="6" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="18" r="2" /><line x1="14" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="10" y2="12" /><line x1="14" y1="18" x2="20" y2="18" /></I> },
      { id: "lifeareas", label: "Life Areas", icon: <I><circle cx="12" cy="12" r="10" /><line x1="12" y1="2" x2="12" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M4.93 4.93l14.14 14.14" /><path d="M19.07 4.93L4.93 19.07" /></I> },
      { id: "letters", label: "Letters", icon: <I><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></I> },
      { id: "vision", label: "Vision Board", icon: <I><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></I> },
      { id: "knowledge", label: "Knowledge Vault", icon: <I><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /><line x1="8" y1="7" x2="16" y2="7" /><line x1="8" y1="11" x2="14" y2="11" /></I> },
      { id: "scoreboard", label: "Scoreboard", icon: <I><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></I> },
      { id: "achievements", label: "Achievements", icon: <I><circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></I> },
      { id: "dayssince", label: "Days Since", icon: <I><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12" /><line x1="12" y1="16" x2="12.01" y2="16" /></I> },
      { id: "affirmations", label: "Affirmations", icon: <I><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></I> },
      { id: "bucketlist", label: "Bucket List", icon: <I><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></I> },
      { id: "skills", label: "Skills", icon: <I><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /><circle cx="12" cy="12" r="3" /></I> },
      { id: "challenges", label: "Challenges", icon: <I><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></I> },
      { id: "booknotes", label: "Book Notes", icon: <I><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /><path d="M8 7h8" /><path d="M8 11h5" /><path d="M8 15h3" /></I> },
      { id: "quotes", label: "Quotes", icon: <I><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" /><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z" /></I> },
    ],
  },

  /* ── Home ── */
  {
    section: "Home", collapsible: true, defaultOpen: false,
    items: [
      { id: "cleaning", label: "Cleaning", icon: <I><path d="M12 2v6" /><path d="M8 8h8l1 14H7L8 8z" /><path d="M10 8V5a2 2 0 0 1 4 0v3" /></I> },
    ],
  },

  /* ── System ── */
  {
    section: "System", collapsible: false,
    items: [
      { id: "settings", label: "Settings", icon: <I><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></I> },
    ],
  },
];

export default function Sidebar({ activePage, onNavigate, spiritualPath }) {
  /* Build full nav by inserting the dynamic Spirituality section */
  const nav = useMemo(() => {
    if (!spiritualPath || spiritualPath === "none") return NAV_STATIC;

    const pathConfig = SPIRITUAL_PATHS[spiritualPath];
    if (!pathConfig || pathConfig.sidebarItems.length === 0) return NAV_STATIC;

    const spiritualitySection = {
      section: "Spirituality", collapsible: true, defaultOpen: false,
      items: pathConfig.sidebarItems.map((item) => ({
        ...item,
        icon: SPIRITUALITY_ICONS[item.id] || SPIRITUALITY_ICONS.meditation,
      })),
    };

    // Insert Spirituality right before the Relationships section
    const idx = NAV_STATIC.findIndex((e) => e.section === "Relationships");
    if (idx === -1) return [...NAV_STATIC, spiritualitySection];
    return [...NAV_STATIC.slice(0, idx), spiritualitySection, ...NAV_STATIC.slice(idx)];
  }, [spiritualPath]);

  const [dark, setDark] = useState(false);
  const [openSections, setOpenSections] = useState(() => {
    const defaults = {};
    nav.forEach((entry) => {
      if (entry.section && entry.collapsible) {
        defaults[entry.section] = entry.defaultOpen ?? false;
      }
    });
    // Try to load saved state
    try {
      const saved = localStorage.getItem("sidebar_sections");
      if (saved) return { ...defaults, ...JSON.parse(saved) };
    } catch { /* use defaults */ }
    return defaults;
  });

  useEffect(() => {
    window.settingsApi.get("theme").then((saved) => {
      const isDark = saved === "dark";
      setDark(isDark);
      document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    });
  }, []);

  // Persist sidebar collapse state
  useEffect(() => {
    localStorage.setItem("sidebar_sections", JSON.stringify(openSections));
  }, [openSections]);

  /* Auto-expand section when the active page is inside a collapsed section */
  useEffect(() => {
    for (const entry of nav) {
      if (entry.items) {
        const match = entry.items.find((it) => it.id === activePage);
        if (match && entry.collapsible && !openSections[entry.section]) {
          setOpenSections((prev) => ({ ...prev, [entry.section]: true }));
        }
      }
    }
  }, [activePage]);

  const toggleSection = (name) => {
    setOpenSections((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    const value = next ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", value);
    window.settingsApi.set("theme", value);
  };

  const renderItem = (item) => (
    <button
      key={item.id}
      className={`sidebarItem ${activePage === item.id ? "sidebarItemActive" : ""}`}
      onClick={() => onNavigate(item.id)}
      type="button"
    >
      <span className="sidebarIcon">{item.icon}</span>
      <span className="sidebarLabel">{item.label}</span>
    </button>
  );

  return (
    <div className="sidebar">
      <div className="sidebarHeader">
        <div className="sidebarBrand">LifeMax OS</div>
      </div>

      <nav className="sidebarNav">
        {nav.map((entry, i) => {
          /* Top-level standalone item (Dashboard) */
          if (entry.id) {
            return renderItem(entry);
          }

          /* Section with items */
          const isOpen = entry.collapsible ? openSections[entry.section] : true;
          const sectionHasActive = entry.items?.some((it) => it.id === activePage);

          return (
            <div key={`s-${i}`} className="sidebarGroup">
              {entry.collapsible ? (
                <button
                  className={`sidebarSection sidebarSectionCollapsible ${sectionHasActive ? "sidebarSectionActive" : ""}`}
                  onClick={() => toggleSection(entry.section)}
                  type="button"
                >
                  <span>{entry.section}</span>
                  <ChevronIcon open={isOpen} />
                </button>
              ) : (
                <div className="sidebarSection">{entry.section}</div>
              )}

              {isOpen && (
                <div className="sidebarGroupItems">
                  {entry.items.map(renderItem)}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <button className="themeToggle" onClick={toggleTheme} type="button" title={dark ? "Switch to light mode" : "Switch to dark mode"}>
        {dark ? <SunIcon /> : <MoonIcon />}
      </button>
    </div>
  );
}
