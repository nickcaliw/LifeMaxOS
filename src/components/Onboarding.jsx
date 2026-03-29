import { useState } from "react";
import { HABITS as DEFAULT_HABITS } from "../lib/constants.js";
import { SPIRITUAL_PATHS } from "../lib/spirituality.js";

const settingsApi = typeof window !== "undefined" ? window.settingsApi : null;

const STARTER_HABITS = [
  "Morning Routine",
  "Exercise / Workout",
  "Drink 8 Glasses of Water",
  "Meditation / Breathwork",
  "Read for 30 Minutes",
  "Healthy Eating",
  "Journal / Reflection",
  "No Social Media Before Noon",
  "8 Hours of Sleep",
  "Take Supplements / Vitamins",
  "Deep Work Session",
  "Gratitude Practice",
  "Cold Shower",
  "Sunlight Exposure (15 min)",
  "Daily Planning",
  "Stretch / Mobility",
  "No Alcohol",
  "Learn Something New",
];

const TOUR_FEATURES = [
  {
    emoji: "📋",
    title: "Daily Planner",
    desc: "Plan your day with an hourly agenda, set goals, and track your top priorities. Everything saves automatically.",
  },
  {
    emoji: "✅",
    title: "Habit Tracking",
    desc: "Build streaks with daily habit checkboxes. See your progress on a GitHub-style heatmap and track your best streaks.",
  },
  {
    emoji: "📊",
    title: "Dashboard",
    desc: "Your command center. See your daily score, reminders, planner, focus timer, and smart insights — all in one place.",
  },
  {
    emoji: "💪",
    title: "Health & Wellness",
    desc: "Track workouts (Hevy import), sleep, water, nutrition, supplements, fasting, body stats, and more.",
  },
  {
    emoji: "🎯",
    title: "Goals & Projects",
    desc: "Set goals with milestones, manage projects with tasks, and track your career development.",
  },
  {
    emoji: "📝",
    title: "Journal & Mood",
    desc: "Write daily entries with mood tracking, energy levels, and tags. See trends over time.",
  },
  {
    emoji: "💰",
    title: "Finances",
    desc: "Budget tracking, net worth, subscriptions, and side hustle income — all in one place.",
  },
  {
    emoji: "🧠",
    title: "Knowledge & Growth",
    desc: "Knowledge vault, vision board, skill tracker, 30-day challenges, bucket list, and more.",
  },
];

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [spiritualPath, setSpiritualPath] = useState("christianity");
  const [selectedHabits, setSelectedHabits] = useState(new Set());
  const [customHabit, setCustomHabit] = useState("");
  const [tourIdx, setTourIdx] = useState(0);

  const totalSteps = 6; // welcome, name, spiritual, habits, tour, ready

  const toggleHabit = (h) => {
    setSelectedHabits(prev => {
      const next = new Set(prev);
      if (next.has(h)) next.delete(h);
      else next.add(h);
      return next;
    });
  };

  const addCustom = () => {
    if (!customHabit.trim()) return;
    setSelectedHabits(prev => new Set([...prev, customHabit.trim()]));
    setCustomHabit("");
  };

  const finish = async () => {
    if (settingsApi) {
      if (name.trim()) await settingsApi.set("user_name", name.trim());
      await settingsApi.set("spiritual_path", spiritualPath);
      const habits = selectedHabits.size > 0 ? [...selectedHabits] : DEFAULT_HABITS;
      await settingsApi.set("custom_habits", JSON.stringify(habits));
      await settingsApi.set("onboarding_complete", "true");
    }
    onComplete();
  };

  const progressPct = Math.round((step / (totalSteps - 1)) * 100);

  return (
    <div className="obOverlay">
      <div className="obCard">
        {/* Progress bar */}
        {step > 0 && step < totalSteps - 1 && (
          <div className="obProgress">
            <div className="obProgressFill" style={{ width: `${progressPct}%` }} />
          </div>
        )}

        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="obStep">
            <div className="obLogoArea">
              <div className="obLogo">A</div>
            </div>
            <h1 className="obTitle">Welcome to LifeMax OS</h1>
            <p className="obDesc">
              The all-in-one operating system for your life.
            </p>
            <div className="obFeaturePreview">
              <div className="obFeatureTag">Habits</div>
              <div className="obFeatureTag">Goals</div>
              <div className="obFeatureTag">Health</div>
              <div className="obFeatureTag">Journal</div>
              <div className="obFeatureTag">Finance</div>
              <div className="obFeatureTag">Focus</div>
            </div>
            <button className="btn btnPrimary obBtn" onClick={() => setStep(1)} type="button">
              Let's Go
            </button>
            <div className="obSubtext">Takes less than a minute</div>
          </div>
        )}

        {/* Step 1: Name */}
        {step === 1 && (
          <div className="obStep">
            <div className="obStepNum">1 of 4</div>
            <h1 className="obTitle">What should we call you?</h1>
            <p className="obDesc">This personalizes your dashboard greeting.</p>
            <input
              className="obInput"
              placeholder="Your first name"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") setStep(2); }}
              autoFocus
            />
            <div className="obActions">
              <button className="btn" onClick={() => setStep(0)} type="button">Back</button>
              <button className="btn btnPrimary obBtn" onClick={() => setStep(2)} type="button">
                {name.trim() ? "Next" : "Skip"}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Spiritual Path */}
        {step === 2 && (
          <div className="obStep">
            <div className="obStepNum">2 of 4</div>
            <h1 className="obTitle">Your spiritual path</h1>
            <p className="obDesc">
              This customizes your daily inspiration and sidebar. Change anytime in Settings.
            </p>
            <div className="obSpiritualGrid">
              {Object.entries(SPIRITUAL_PATHS).map(([key, config]) => (
                <button
                  key={key}
                  className={`obSpiritualCard ${spiritualPath === key ? "obSpiritualCardActive" : ""}`}
                  onClick={() => setSpiritualPath(key)}
                  type="button"
                >
                  <div className="obSpiritualEmoji">{config.emoji}</div>
                  <div className="obSpiritualLabel">{config.label}</div>
                  <div className="obSpiritualDesc">{config.description}</div>
                </button>
              ))}
            </div>
            <div className="obActions">
              <button className="btn" onClick={() => setStep(1)} type="button">Back</button>
              <button className="btn btnPrimary obBtn" onClick={() => setStep(3)} type="button">Next</button>
            </div>
          </div>
        )}

        {/* Step 3: Habits */}
        {step === 3 && (
          <div className="obStep">
            <div className="obStepNum">3 of 4</div>
            <h1 className="obTitle">Build your habit stack</h1>
            <p className="obDesc">
              Pick the habits you want to track daily. You can add, remove, or reorder these anytime.
            </p>
            <div className="obHabitGrid">
              {STARTER_HABITS.map(h => (
                <button
                  key={h}
                  className={`obHabitChip ${selectedHabits.has(h) ? "obHabitChipActive" : ""}`}
                  onClick={() => toggleHabit(h)}
                  type="button"
                >
                  {selectedHabits.has(h) ? "✓ " : ""}{h}
                </button>
              ))}
              {[...selectedHabits].filter(h => !STARTER_HABITS.includes(h)).map(h => (
                <button
                  key={h}
                  className="obHabitChip obHabitChipActive obHabitChipCustom"
                  onClick={() => toggleHabit(h)}
                  type="button"
                >
                  ✓ {h}
                </button>
              ))}
            </div>
            <div className="obCustomHabit">
              <input
                className="obInput obInputSmall"
                placeholder="Add your own habit..."
                value={customHabit}
                onChange={e => setCustomHabit(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addCustom(); }}
              />
              <button className="btn" onClick={addCustom} type="button">Add</button>
            </div>
            <div className="obSelected">{selectedHabits.size} habits selected</div>
            <div className="obActions">
              <button className="btn" onClick={() => setStep(2)} type="button">Back</button>
              <button className="btn btnPrimary obBtn" onClick={() => setStep(4)} type="button">
                {selectedHabits.size > 0 ? "Next" : "Use Defaults"}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Feature Tour */}
        {step === 4 && (
          <div className="obStep">
            <div className="obStepNum">4 of 4</div>
            <h1 className="obTitle">Here's what you can do</h1>
            <p className="obDesc">A quick look at what LifeMax OS offers.</p>
            <div className="obTourCarousel">
              <div className="obTourCard">
                <div className="obTourEmoji">{TOUR_FEATURES[tourIdx].emoji}</div>
                <div className="obTourTitle">{TOUR_FEATURES[tourIdx].title}</div>
                <div className="obTourDesc">{TOUR_FEATURES[tourIdx].desc}</div>
              </div>
              <div className="obTourDots">
                {TOUR_FEATURES.map((_, i) => (
                  <button
                    key={i}
                    className={`obTourDot ${i === tourIdx ? "obTourDotActive" : ""}`}
                    onClick={() => setTourIdx(i)}
                    type="button"
                  />
                ))}
              </div>
              <div className="obTourNav">
                <button className="btn" onClick={() => setTourIdx(i => Math.max(0, i - 1))}
                  disabled={tourIdx === 0} type="button">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
                </button>
                <span className="obTourCount">{tourIdx + 1} / {TOUR_FEATURES.length}</span>
                <button className="btn" onClick={() => setTourIdx(i => Math.min(TOUR_FEATURES.length - 1, i + 1))}
                  disabled={tourIdx === TOUR_FEATURES.length - 1} type="button">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 6 15 12 9 18" /></svg>
                </button>
              </div>
            </div>
            <div className="obActions">
              <button className="btn" onClick={() => setStep(3)} type="button">Back</button>
              <button className="btn btnPrimary obBtn" onClick={() => setStep(5)} type="button">
                I'm Ready
              </button>
            </div>
          </div>
        )}

        {/* Step 5: All Set */}
        {step === 5 && (
          <div className="obStep">
            <div className="obReadyEmoji">🚀</div>
            <h1 className="obTitle">You're all set{name.trim() ? `, ${name.trim()}` : ""}!</h1>
            <p className="obDesc">
              Your personalized LifeMax OS is ready. Start by filling in today's planner on your dashboard.
            </p>
            <div className="obTips">
              <div className="obTip">
                <span className="obTipIcon">💡</span>
                <span>Use <strong>Cmd+1-9</strong> to quickly switch between pages</span>
              </div>
              <div className="obTip">
                <span className="obTipIcon">💡</span>
                <span>Use <strong>Cmd+K</strong> to search across all your data</span>
              </div>
              <div className="obTip">
                <span className="obTipIcon">💡</span>
                <span>Everything saves automatically — just start typing</span>
              </div>
            </div>
            <button className="btn btnPrimary obBtn obBtnLarge" onClick={finish} type="button">
              Launch LifeMax OS
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
