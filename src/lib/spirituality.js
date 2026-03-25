/**
 * Spiritual path configuration.
 * Single source of truth for all path-specific content, sidebar items, and page routing.
 */

export const SPIRITUAL_PATHS = {
  christianity: {
    id: "christianity",
    label: "Christianity",
    emoji: "✝️",
    description: "Bible verses, prayer journal, scripture memory",
    dashboardTitle: "Daily Scripture",
    sidebarItems: [
      { id: "biblestudy", label: "Bible Study" },
      { id: "prayerjournal", label: "Prayer Journal" },
      { id: "scripturememory", label: "Scripture Memory" },
      { id: "sermonnotes", label: "Sermon Notes" },
      { id: "meditation", label: "Meditation" },
    ],
    pageConfig: {
      biblestudy: {
        component: "BibleStudyPage",
        props: {
          collection: "biblestudy",
          title: "Bible Study",
        },
      },
      prayerjournal: {
        component: "PrayerJournalPage",
        props: {
          collection: "prayers",
          title: "Prayer Journal",
          categories: ["Personal", "Family", "Church", "World", "Thanks"],
        },
      },
      scripturememory: {
        component: "ScriptureMemoryPage",
        props: {
          collection: "scripturememory",
          title: "Scripture Memory",
          categories: ["Promises", "Wisdom", "Comfort", "Strength", "Love"],
        },
      },
      sermonnotes: {
        component: "SermonNotesPage",
        props: {
          collection: "sermonnotes",
          title: "Sermon Notes",
        },
      },
      meditation: { component: "MeditationPage", props: {} },
    },
  },

  islam: {
    id: "islam",
    label: "Islam",
    emoji: "☪️",
    description: "Quran verses, dua journal, surah memory",
    dashboardTitle: "Daily Quran Verse",
    sidebarItems: [
      { id: "quranstudy", label: "Quran Study" },
      { id: "duajournal", label: "Dua Journal" },
      { id: "surahmemory", label: "Surah Memory" },
      { id: "khutbahnotes", label: "Khutbah Notes" },
      { id: "meditation", label: "Meditation" },
    ],
    pageConfig: {
      quranstudy: {
        component: "BibleStudyPage",
        props: {
          collection: "quranstudy",
          title: "Quran Study",
          tagOptions: ["Tawakkul", "Sabr", "Shukr", "Taqwa", "Ihsan", "Mercy", "Justice", "Knowledge", "Prayer", "Faith", "Forgiveness", "Charity", "Peace", "Guidance"],
        },
      },
      duajournal: {
        component: "PrayerJournalPage",
        props: {
          collection: "duas",
          title: "Dua Journal",
          categories: ["Personal", "Family", "Ummah", "Dunya", "Shukr"],
        },
      },
      surahmemory: {
        component: "ScriptureMemoryPage",
        props: {
          collection: "surahmemory",
          title: "Surah Memory",
          categories: ["Short Surahs", "Duas", "Key Verses", "Pillars", "Guidance"],
        },
      },
      khutbahnotes: {
        component: "SermonNotesPage",
        props: {
          collection: "khutbahnotes",
          title: "Khutbah Notes",
        },
      },
      meditation: { component: "MeditationPage", props: {} },
    },
  },

  spiritual: {
    id: "spiritual",
    label: "Spiritual",
    emoji: "🌟",
    description: "Manifestation, gratitude, energy & mindfulness",
    dashboardTitle: "Daily Intention",
    sidebarItems: [
      { id: "gratitudepractice", label: "Gratitude Practice" },
      { id: "affirmationjournal", label: "Affirmation Journal" },
      { id: "visionmeditation", label: "Vision Meditation" },
      { id: "energytracking", label: "Energy Tracking" },
      { id: "meditation", label: "Meditation" },
    ],
    pageConfig: {
      gratitudepractice: {
        component: "PrayerJournalPage",
        props: {
          collection: "gratitude_entries",
          title: "Gratitude Practice",
          categories: ["Self", "Relationships", "Abundance", "Health", "Universe"],
        },
      },
      affirmationjournal: {
        component: "ScriptureMemoryPage",
        props: {
          collection: "affirmation_entries",
          title: "Affirmation Journal",
          categories: ["Abundance", "Self-Love", "Health", "Success", "Peace"],
        },
      },
      visionmeditation: { component: "MeditationPage", props: {} },
      energytracking: {
        component: "PrayerJournalPage",
        props: {
          collection: "energy_entries",
          title: "Energy Tracking",
          categories: ["High Vibe", "Neutral", "Low Energy", "Blocked", "Flowing"],
        },
      },
      meditation: { component: "MeditationPage", props: {} },
    },
  },

  none: {
    id: "none",
    label: "None / Secular",
    emoji: "💡",
    description: "Motivational quotes only, no spiritual section",
    dashboardTitle: "Daily Quote",
    sidebarItems: [],
    pageConfig: {},
  },
};

export const DEFAULT_PATH = "christianity";

/**
 * Get the content loader function for a spiritual path.
 * Returns a function that takes a date and returns { verse/text, reference/author, explanation? }
 */
export function getContentLoader(pathId) {
  switch (pathId) {
    case "christianity":
      return async (date) => {
        const { getVerseForDate } = await import("./bible.js");
        return getVerseForDate(date);
      };
    case "islam":
      return async (date) => {
        const { getVerseForDate } = await import("./quran.js");
        return getVerseForDate(date);
      };
    case "spiritual":
      return async (date) => {
        const { getQuoteForDate } = await import("./manifestation.js");
        const q = getQuoteForDate(date);
        return { verse: q.text, reference: q.author };
      };
    case "none":
    default:
      return async (date) => {
        const { getQuoteForDate } = await import("./quotes.js");
        const q = getQuoteForDate(date);
        return { verse: q.text, reference: q.author };
      };
  }
}

/**
 * Get all spiritual page IDs across all paths (for routing).
 */
export function getAllSpiritualPageIds() {
  const ids = new Set();
  for (const path of Object.values(SPIRITUAL_PATHS)) {
    for (const item of path.sidebarItems) {
      ids.add(item.id);
    }
  }
  return [...ids];
}
