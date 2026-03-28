import { useCallback, useEffect, useMemo, useState } from "react";
import { ymd } from "../lib/dates.js";

const api = typeof window !== "undefined" ? window.bodyApi : null;
const plannerApi = typeof window !== "undefined" ? window.plannerApi : null;

const ACTIVITY_LEVELS = [
  { id: "sedentary", label: "Sedentary", desc: "Little or no exercise", factor: 1.2 },
  { id: "light", label: "Lightly Active", desc: "1-3 days/week", factor: 1.375 },
  { id: "moderate", label: "Moderately Active", desc: "3-5 days/week", factor: 1.55 },
  { id: "active", label: "Very Active", desc: "6-7 days/week", factor: 1.725 },
  { id: "extreme", label: "Extra Active", desc: "Athlete / physical job", factor: 1.9 },
];

const GOALS = [
  { id: "lose2", label: "Lose 2 lbs/week", offset: -1000 },
  { id: "lose1", label: "Lose 1 lb/week", offset: -500 },
  { id: "lose05", label: "Lose 0.5 lbs/week", offset: -250 },
  { id: "maintain", label: "Maintain", offset: 0 },
  { id: "gain05", label: "Gain 0.5 lbs/week", offset: 250 },
  { id: "gain1", label: "Gain 1 lb/week", offset: 500 },
];

// ── Meal Plan Database ──
const MEALS = {
  breakfast: [
    { name: "Egg White Omelette + Toast", cal: 320, protein: 28, carbs: 30, fat: 8, items: "4 egg whites, 1 slice whole wheat toast, spinach, tomato, 1 tsp olive oil" },
    { name: "Greek Yogurt Parfait", cal: 350, protein: 25, carbs: 40, fat: 10, items: "1 cup Greek yogurt, 1/2 cup granola, 1/2 cup mixed berries, 1 tbsp honey" },
    { name: "Protein Oatmeal", cal: 380, protein: 30, carbs: 45, fat: 8, items: "1 cup oats, 1 scoop whey protein, 1 banana, 1 tbsp almond butter" },
    { name: "Avocado Toast + Eggs", cal: 420, protein: 22, carbs: 35, fat: 22, items: "2 slices whole wheat bread, 1/2 avocado, 2 eggs, everything seasoning" },
    { name: "Protein Smoothie Bowl", cal: 360, protein: 32, carbs: 42, fat: 8, items: "1 scoop protein, 1 banana, 1/2 cup berries, 1/2 cup almond milk, granola topping" },
    { name: "Turkey Sausage Breakfast Wrap", cal: 390, protein: 28, carbs: 32, fat: 16, items: "2 turkey sausage links, 1 whole wheat tortilla, 2 eggs, cheese, salsa" },
    { name: "Cottage Cheese & Fruit", cal: 280, protein: 26, carbs: 30, fat: 6, items: "1 cup cottage cheese, 1/2 cup pineapple, 1/2 cup blueberries, cinnamon" },
    { name: "Overnight Oats", cal: 400, protein: 20, carbs: 55, fat: 12, items: "1 cup oats, 1 cup milk, chia seeds, peanut butter, banana slices" },
  ],
  lunch: [
    { name: "Grilled Chicken Salad", cal: 420, protein: 40, carbs: 20, fat: 20, items: "6oz chicken breast, mixed greens, cherry tomatoes, cucumber, 2 tbsp vinaigrette" },
    { name: "Turkey & Avocado Wrap", cal: 450, protein: 32, carbs: 38, fat: 18, items: "4oz sliced turkey, whole wheat wrap, 1/2 avocado, lettuce, tomato, mustard" },
    { name: "Salmon Rice Bowl", cal: 500, protein: 35, carbs: 45, fat: 18, items: "5oz salmon, 1 cup brown rice, edamame, cucumber, soy ginger dressing" },
    { name: "Chicken Burrito Bowl", cal: 480, protein: 38, carbs: 42, fat: 16, items: "6oz chicken, 1/2 cup rice, black beans, corn, salsa, 1 tbsp sour cream" },
    { name: "Tuna Stuffed Sweet Potato", cal: 400, protein: 34, carbs: 40, fat: 10, items: "1 large sweet potato, 1 can tuna, Greek yogurt, celery, seasonings" },
    { name: "Lean Beef Stir Fry", cal: 460, protein: 36, carbs: 35, fat: 18, items: "5oz lean beef, mixed vegetables, 1/2 cup rice, teriyaki sauce" },
    { name: "Mediterranean Quinoa Bowl", cal: 440, protein: 25, carbs: 48, fat: 16, items: "1 cup quinoa, chickpeas, feta, cucumber, olives, lemon tahini" },
    { name: "Grilled Chicken Sandwich", cal: 470, protein: 38, carbs: 40, fat: 14, items: "5oz chicken breast, whole wheat bun, lettuce, tomato, honey mustard" },
  ],
  dinner: [
    { name: "Grilled Salmon + Vegetables", cal: 480, protein: 40, carbs: 25, fat: 24, items: "6oz salmon, roasted broccoli, asparagus, 1 tsp olive oil, lemon" },
    { name: "Chicken Breast + Sweet Potato", cal: 450, protein: 42, carbs: 38, fat: 10, items: "6oz chicken breast, 1 medium sweet potato, steamed green beans, herbs" },
    { name: "Lean Ground Turkey Tacos", cal: 480, protein: 36, carbs: 35, fat: 20, items: "5oz ground turkey, 2 corn tortillas, lettuce, tomato, cheese, salsa" },
    { name: "Shrimp & Zucchini Noodles", cal: 350, protein: 34, carbs: 18, fat: 16, items: "6oz shrimp, 2 zucchinis spiralized, marinara, parmesan, garlic" },
    { name: "Baked Cod + Quinoa", cal: 420, protein: 38, carbs: 35, fat: 12, items: "6oz cod, 1 cup quinoa, roasted tomatoes, spinach, lemon butter" },
    { name: "Steak & Roasted Vegetables", cal: 520, protein: 42, carbs: 22, fat: 28, items: "6oz sirloin, roasted brussels sprouts, bell peppers, 1 tsp olive oil" },
    { name: "Chicken Stir-Fry + Rice", cal: 470, protein: 38, carbs: 42, fat: 14, items: "6oz chicken, mixed vegetables, 3/4 cup rice, soy sauce, ginger" },
    { name: "Turkey Meatballs + Pasta", cal: 500, protein: 36, carbs: 48, fat: 16, items: "5oz turkey meatballs, whole wheat pasta, marinara sauce, parmesan" },
  ],
  snack: [
    { name: "Protein Shake", cal: 160, protein: 25, carbs: 8, fat: 3, items: "1 scoop whey protein, water or almond milk" },
    { name: "Apple + Peanut Butter", cal: 200, protein: 7, carbs: 25, fat: 10, items: "1 medium apple, 1 tbsp peanut butter" },
    { name: "Greek Yogurt + Almonds", cal: 180, protein: 16, carbs: 12, fat: 8, items: "3/4 cup Greek yogurt, 10 almonds" },
    { name: "Rice Cakes + Turkey", cal: 150, protein: 14, carbs: 18, fat: 3, items: "2 rice cakes, 3oz sliced turkey" },
    { name: "Protein Bar", cal: 220, protein: 20, carbs: 22, fat: 8, items: "1 protein bar (Quest, RXBar, etc.)" },
    { name: "Hard Boiled Eggs", cal: 140, protein: 12, carbs: 1, fat: 10, items: "2 hard boiled eggs, pinch of salt" },
    { name: "Trail Mix (small)", cal: 180, protein: 6, carbs: 18, fat: 10, items: "1/4 cup mixed nuts, raisins, dark chocolate chips" },
    { name: "Cottage Cheese + Berries", cal: 160, protein: 18, carbs: 14, fat: 4, items: "3/4 cup cottage cheese, 1/4 cup berries" },
    { name: "Banana + Protein", cal: 190, protein: 20, carbs: 28, fat: 2, items: "1 banana, 1/2 scoop whey protein shake" },
    { name: "Veggies + Hummus", cal: 130, protein: 5, carbs: 14, fat: 7, items: "Carrots, celery, bell pepper, 3 tbsp hummus" },
  ],
};

function generateMealPlans(targetCal, targetProtein, targetCarbs, targetFat) {
  const plans = [];
  const tolerance = 0.15; // 15% tolerance

  // Generate 3 plans with different meal combos
  for (let attempt = 0; attempt < 3; attempt++) {
    // Shuffle each category
    const shuffle = (arr) => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    const breakfasts = shuffle(MEALS.breakfast);
    const lunches = shuffle(MEALS.lunch);
    const dinners = shuffle(MEALS.dinner);
    const snacks = shuffle(MEALS.snack);

    let bestPlan = null;
    let bestDiff = Infinity;

    // Try combinations to find best macro fit
    for (let b = 0; b < 3; b++) {
      for (let l = 0; l < 3; l++) {
        for (let d = 0; d < 3; d++) {
          const meals = [breakfasts[b], lunches[l], dinners[d]];
          let totalCal = meals.reduce((s, m) => s + m.cal, 0);
          let totalP = meals.reduce((s, m) => s + m.protein, 0);
          let totalC = meals.reduce((s, m) => s + m.carbs, 0);
          let totalF = meals.reduce((s, m) => s + m.fat, 0);

          // Add snacks to fill remaining calories
          const remaining = targetCal - totalCal;
          const planSnacks = [];
          if (remaining > 100) {
            // Find best fitting snack(s)
            for (const sn of snacks) {
              if (totalCal + sn.cal <= targetCal * (1 + tolerance) && planSnacks.length < 2) {
                planSnacks.push(sn);
                totalCal += sn.cal;
                totalP += sn.protein;
                totalC += sn.carbs;
                totalF += sn.fat;
              }
            }
          }

          const calDiff = Math.abs(totalCal - targetCal) / targetCal;
          const pDiff = Math.abs(totalP - targetProtein) / (targetProtein || 1);
          const score = calDiff + pDiff * 0.5; // Weight protein fit heavily

          if (score < bestDiff) {
            bestDiff = score;
            bestPlan = {
              meals: [
                { ...breakfasts[b], category: "Breakfast" },
                { ...lunches[l], category: "Lunch" },
                { ...dinners[d], category: "Dinner" },
                ...planSnacks.map(s => ({ ...s, category: "Snack" })),
              ],
              totals: { cal: totalCal, protein: totalP, carbs: totalC, fat: totalF },
            };
          }
        }
      }
    }

    if (bestPlan && !plans.some(p => p.meals[0].name === bestPlan.meals[0].name && p.meals[1].name === bestPlan.meals[1].name)) {
      plans.push(bestPlan);
    }
  }

  return plans;
}

function calcBMR(weight, heightIn, age, sex) {
  // Mifflin-St Jeor (weight in lbs, height in inches)
  const weightKg = weight * 0.453592;
  const heightCm = heightIn * 2.54;
  if (sex === "female") {
    return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }
  return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
}

function calcBMI(weight, heightIn) {
  return (weight / (heightIn * heightIn)) * 703;
}

export default function BodyStatsPage() {
  const [selectedDate, setSelectedDate] = useState(() => ymd(new Date()));
  const [entry, setEntry] = useState(null);
  const [allStats, setAllStats] = useState([]);

  // TDEE calculator state
  const [tdeeAge, setTdeeAge] = useState(() => localStorage.getItem("tdee_age") || "");
  const [tdeeSex, setTdeeSex] = useState(() => localStorage.getItem("tdee_sex") || "male");
  const [tdeeHeight, setTdeeHeight] = useState(() => localStorage.getItem("tdee_height") || "");
  const [tdeeWeight, setTdeeWeight] = useState(() => localStorage.getItem("tdee_weight") || "");
  const [tdeeActivity, setTdeeActivity] = useState(() => localStorage.getItem("tdee_activity") || "moderate");
  const [tdeeGoal, setTdeeGoal] = useState(() => localStorage.getItem("tdee_goal") || "maintain");

  // Persist TDEE inputs to localStorage
  useEffect(() => {
    localStorage.setItem("tdee_age", tdeeAge);
    localStorage.setItem("tdee_sex", tdeeSex);
    localStorage.setItem("tdee_height", tdeeHeight);
    localStorage.setItem("tdee_weight", tdeeWeight);
    localStorage.setItem("tdee_activity", tdeeActivity);
    localStorage.setItem("tdee_goal", tdeeGoal);
  }, [tdeeAge, tdeeSex, tdeeHeight, tdeeWeight, tdeeActivity, tdeeGoal]);

  // Auto-fill weight from body stats
  useEffect(() => {
    if (!tdeeWeight && entry?.weight) {
      setTdeeWeight(entry.weight);
    }
  }, [entry, tdeeWeight]);

  const load = useCallback(async () => {
    if (api) {
      let e = await api.get(selectedDate);
      if (!e) e = { weight: "", bodyFat: "", chest: "", waist: "", hips: "", arms: "", notes: "" };

      // Pull weight from planner if body stats doesn't have it
      if (!e.weight && plannerApi) {
        try {
          const plannerEntry = await plannerApi.getDay(selectedDate);
          if (plannerEntry?.weightAm) {
            e = { ...e, weight: plannerEntry.weightAm, weightSource: "planner_am" };
          } else if (plannerEntry?.weightPm) {
            e = { ...e, weight: plannerEntry.weightPm, weightSource: "planner_pm" };
          }
        } catch {}
      }

      // Also store AM/PM separately if available from planner
      if (plannerApi) {
        try {
          const plannerEntry = await plannerApi.getDay(selectedDate);
          if (plannerEntry?.weightAm) e.weightAm = plannerEntry.weightAm;
          if (plannerEntry?.weightPm) e.weightPm = plannerEntry.weightPm;
        } catch {}
      }

      setEntry(e);

      // Load all stats and merge planner weights for dates that have no body_stats weight
      let all = await api.all() || [];

      if (plannerApi) {
        try {
          const plannerData = await plannerApi.getAll();
          if (plannerData) {
            const bodyDates = new Set(all.filter(s => s.weight).map(s => s.date));
            for (const [date, pEntry] of Object.entries(plannerData)) {
              if (!bodyDates.has(date) && (pEntry.weightAm || pEntry.weightPm)) {
                all.push({
                  date,
                  weight: pEntry.weightAm || pEntry.weightPm,
                  weightAm: pEntry.weightAm || "",
                  weightPm: pEntry.weightPm || "",
                  bodyFat: "",
                  source: "planner",
                });
              }
            }
          }
        } catch {}
      }

      // Sort by date
      all.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      setAllStats(all);
    }
  }, [selectedDate]);

  useEffect(() => { load(); }, [load]);

  const save = useCallback((patch) => {
    setEntry(prev => {
      const next = { ...prev, ...patch };
      if (api) api.save(selectedDate, next);
      return next;
    });
  }, [selectedDate]);

  // Trends from allStats
  const trend = useMemo(() => {
    if (allStats.length < 2) return null;
    const sorted = [...allStats].sort((a, b) => a.date.localeCompare(b.date));
    const latest = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    const weightDiff = (latest.weight && prev.weight)
      ? (Number(latest.weight) - Number(prev.weight)).toFixed(1)
      : null;
    const bfDiff = (latest.bodyFat && prev.bodyFat)
      ? (Number(latest.bodyFat) - Number(prev.bodyFat)).toFixed(1)
      : null;
    return { weightDiff, bfDiff, total: sorted.length };
  }, [allStats]);

  // Recent entries for mini log
  const recentEntries = useMemo(() => {
    return [...allStats]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 15);
  }, [allStats]);

  // TDEE calculations
  const tdeeResults = useMemo(() => {
    const w = Number(tdeeWeight);
    const h = Number(tdeeHeight);
    const a = Number(tdeeAge);
    if (!w || !h || !a) return null;

    const bmr = calcBMR(w, h, a, tdeeSex);
    const activityObj = ACTIVITY_LEVELS.find(l => l.id === tdeeActivity);
    const tdee = bmr * (activityObj?.factor || 1.55);
    const goalObj = GOALS.find(g => g.id === tdeeGoal);
    const target = tdee + (goalObj?.offset || 0);
    const bmi = calcBMI(w, h);

    let bmiCategory = "Obese";
    if (bmi < 18.5) bmiCategory = "Underweight";
    else if (bmi < 25) bmiCategory = "Normal";
    else if (bmi < 30) bmiCategory = "Overweight";

    // Macro breakdown (moderate: 30% protein, 35% carbs, 35% fat)
    const protein = Math.round((target * 0.30) / 4);
    const carbs = Math.round((target * 0.35) / 4);
    const fat = Math.round((target * 0.35) / 9);

    return {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      target: Math.round(target),
      bmi: bmi.toFixed(1),
      bmiCategory,
      protein,
      carbs,
      fat,
    };
  }, [tdeeWeight, tdeeHeight, tdeeAge, tdeeSex, tdeeActivity, tdeeGoal]);

  // Meal plans
  const [mealPlanSeed, setMealPlanSeed] = useState(0);
  const mealPlans = useMemo(() => {
    if (!tdeeResults) return [];
    // mealPlanSeed forces regeneration
    return generateMealPlans(tdeeResults.target, tdeeResults.protein, tdeeResults.carbs, tdeeResults.fat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tdeeResults, mealPlanSeed]);

  const [activePlanIdx, setActivePlanIdx] = useState(0);

  // Height display helpers
  const heightFt = tdeeHeight ? Math.floor(Number(tdeeHeight) / 12) : "";
  const heightIn = tdeeHeight ? Number(tdeeHeight) % 12 : "";

  return (
    <div className="bodyPage">
      <div className="topbar">
        <div className="topbarLeft">
          <h1 className="pageTitle">Body Stats</h1>
          <div className="weekBadge">{allStats.length} entries</div>
        </div>
      </div>

      <div className="bodyContent">
        <div className="bodyMain">
          {/* Date picker + input */}
          <div className="bodyDateRow">
            <div className="label">Date</div>
            <input type="date" className="goalDateInput" value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)} />
          </div>

          {/* Trend cards */}
          {trend && (
            <div className="bodyTrends">
              {trend.weightDiff !== null && (
                <div className="bodyTrendCard">
                  <div className="bodyTrendLabel">Weight change</div>
                  <div className={`bodyTrendValue ${Number(trend.weightDiff) < 0 ? "trendDown" : Number(trend.weightDiff) > 0 ? "trendUp" : ""}`}>
                    {Number(trend.weightDiff) > 0 ? "+" : ""}{trend.weightDiff} lbs
                  </div>
                </div>
              )}
              {trend.bfDiff !== null && (
                <div className="bodyTrendCard">
                  <div className="bodyTrendLabel">Body fat change</div>
                  <div className={`bodyTrendValue ${Number(trend.bfDiff) < 0 ? "trendDown" : Number(trend.bfDiff) > 0 ? "trendUp" : ""}`}>
                    {Number(trend.bfDiff) > 0 ? "+" : ""}{trend.bfDiff}%
                  </div>
                </div>
              )}
              <div className="bodyTrendCard">
                <div className="bodyTrendLabel">Total entries</div>
                <div className="bodyTrendValue">{trend.total}</div>
              </div>
            </div>
          )}

          {entry && (
            <div className="bodyForm">
              <div className="bodyFormGrid">
                <div className="bodyFormField">
                  <div className="label">Weight (lbs)</div>
                  <input type="number" className="nutritionInput" value={entry.weight || ""}
                    onChange={e => save({ weight: e.target.value })} placeholder="—" />
                </div>
                <div className="bodyFormField">
                  <div className="label">Body Fat %</div>
                  <input type="number" className="nutritionInput" value={entry.bodyFat || ""}
                    onChange={e => save({ bodyFat: e.target.value })} placeholder="—" />
                </div>
                <div className="bodyFormField">
                  <div className="label">Chest (in)</div>
                  <input type="number" className="nutritionInput" value={entry.chest || ""}
                    onChange={e => save({ chest: e.target.value })} placeholder="—" />
                </div>
                <div className="bodyFormField">
                  <div className="label">Waist (in)</div>
                  <input type="number" className="nutritionInput" value={entry.waist || ""}
                    onChange={e => save({ waist: e.target.value })} placeholder="—" />
                </div>
                <div className="bodyFormField">
                  <div className="label">Hips (in)</div>
                  <input type="number" className="nutritionInput" value={entry.hips || ""}
                    onChange={e => save({ hips: e.target.value })} placeholder="—" />
                </div>
                <div className="bodyFormField">
                  <div className="label">Arms (in)</div>
                  <input type="number" className="nutritionInput" value={entry.arms || ""}
                    onChange={e => save({ arms: e.target.value })} placeholder="—" />
                </div>
              </div>
              <div className="bodyNotesSection">
                <div className="label">Notes</div>
                <textarea className="reviewTextarea" value={entry.notes || ""}
                  onChange={e => save({ notes: e.target.value })}
                  placeholder="How are you feeling? Any changes noticed?" />
              </div>
            </div>
          )}

          {/* TDEE Calculator */}
          <div className="tdeeSection">
            <div className="tdeeSectionTitle">TDEE Calculator</div>
            <div className="tdeeSectionSub">Calculate your Total Daily Energy Expenditure</div>

            <div className="tdeeForm">
              <div className="tdeeFormGrid">
                <div className="tdeeField">
                  <div className="tdeeFieldLabel">Age</div>
                  <input type="number" className="tdeeInput" value={tdeeAge}
                    onChange={e => setTdeeAge(e.target.value)} placeholder="25" min="1" max="120" />
                </div>
                <div className="tdeeField">
                  <div className="tdeeFieldLabel">Sex</div>
                  <div className="tdeeSexBtns">
                    <button
                      className={`tdeeSexBtn ${tdeeSex === "male" ? "tdeeSexBtnActive" : ""}`}
                      onClick={() => setTdeeSex("male")} type="button"
                    >Male</button>
                    <button
                      className={`tdeeSexBtn ${tdeeSex === "female" ? "tdeeSexBtnActive" : ""}`}
                      onClick={() => setTdeeSex("female")} type="button"
                    >Female</button>
                  </div>
                </div>
                <div className="tdeeField">
                  <div className="tdeeFieldLabel">Height</div>
                  <div className="tdeeHeightRow">
                    <input type="number" className="tdeeInput tdeeInputSmall" value={heightFt}
                      onChange={e => {
                        const ft = Number(e.target.value) || 0;
                        setTdeeHeight(String(ft * 12 + (heightIn || 0)));
                      }} placeholder="5" min="1" max="8" />
                    <span className="tdeeHeightUnit">ft</span>
                    <input type="number" className="tdeeInput tdeeInputSmall" value={heightIn}
                      onChange={e => {
                        const inches = Number(e.target.value) || 0;
                        setTdeeHeight(String((heightFt || 0) * 12 + inches));
                      }} placeholder="10" min="0" max="11" />
                    <span className="tdeeHeightUnit">in</span>
                  </div>
                </div>
                <div className="tdeeField">
                  <div className="tdeeFieldLabel">Weight (lbs)</div>
                  <input type="number" className="tdeeInput" value={tdeeWeight}
                    onChange={e => setTdeeWeight(e.target.value)} placeholder="170" />
                </div>
              </div>

              <div className="tdeeField tdeeFieldWide">
                <div className="tdeeFieldLabel">Activity Level</div>
                <div className="tdeeActivityList">
                  {ACTIVITY_LEVELS.map(level => (
                    <button
                      key={level.id}
                      className={`tdeeActivityBtn ${tdeeActivity === level.id ? "tdeeActivityBtnActive" : ""}`}
                      onClick={() => setTdeeActivity(level.id)}
                      type="button"
                    >
                      <div className="tdeeActivityLabel">{level.label}</div>
                      <div className="tdeeActivityDesc">{level.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="tdeeField tdeeFieldWide">
                <div className="tdeeFieldLabel">Goal</div>
                <div className="tdeeGoalList">
                  {GOALS.map(goal => (
                    <button
                      key={goal.id}
                      className={`tdeeGoalBtn ${tdeeGoal === goal.id ? "tdeeGoalBtnActive" : ""}`}
                      onClick={() => setTdeeGoal(goal.id)}
                      type="button"
                    >
                      {goal.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Results */}
            {tdeeResults && (
              <div className="tdeeResults">
                <div className="tdeeResultCards">
                  <div className="tdeeResultCard tdeeResultCardMain">
                    <div className="tdeeResultLabel">Daily Calories</div>
                    <div className="tdeeResultValue tdeeResultValueMain">{tdeeResults.target}</div>
                    <div className="tdeeResultSub">cal/day for your goal</div>
                  </div>
                  <div className="tdeeResultCard">
                    <div className="tdeeResultLabel">TDEE</div>
                    <div className="tdeeResultValue">{tdeeResults.tdee}</div>
                    <div className="tdeeResultSub">maintenance</div>
                  </div>
                  <div className="tdeeResultCard">
                    <div className="tdeeResultLabel">BMR</div>
                    <div className="tdeeResultValue">{tdeeResults.bmr}</div>
                    <div className="tdeeResultSub">at rest</div>
                  </div>
                  <div className="tdeeResultCard">
                    <div className="tdeeResultLabel">BMI</div>
                    <div className="tdeeResultValue">{tdeeResults.bmi}</div>
                    <div className="tdeeResultSub">{tdeeResults.bmiCategory}</div>
                  </div>
                </div>

                <div className="tdeeMacros">
                  <div className="tdeeMacroTitle">Suggested Macros</div>
                  <div className="tdeeMacroCards">
                    <div className="tdeeMacroCard">
                      <div className="tdeeMacroValue" style={{ color: "#5B7CF5" }}>{tdeeResults.protein}g</div>
                      <div className="tdeeMacroLabel">Protein</div>
                      <div className="tdeeMacroPct">30%</div>
                    </div>
                    <div className="tdeeMacroCard">
                      <div className="tdeeMacroValue" style={{ color: "#ff9800" }}>{tdeeResults.carbs}g</div>
                      <div className="tdeeMacroLabel">Carbs</div>
                      <div className="tdeeMacroPct">35%</div>
                    </div>
                    <div className="tdeeMacroCard">
                      <div className="tdeeMacroValue" style={{ color: "#f44336" }}>{tdeeResults.fat}g</div>
                      <div className="tdeeMacroLabel">Fat</div>
                      <div className="tdeeMacroPct">35%</div>
                    </div>
                  </div>
                </div>

                {/* Suggested Meal Plans */}
                {mealPlans.length > 0 && (
                  <div className="tdeeMealPlans">
                    <div className="tdeeMealPlansHeader">
                      <div className="tdeeMealPlansTitle">Suggested Meal Plans</div>
                      <button className="btn" onClick={() => { setMealPlanSeed(s => s + 1); setActivePlanIdx(0); }} type="button">
                        Regenerate
                      </button>
                    </div>
                    <div className="tdeeMealPlanTabs">
                      {mealPlans.map((_, i) => (
                        <button key={i}
                          className={`tabBtn ${activePlanIdx === i ? "active" : ""}`}
                          onClick={() => setActivePlanIdx(i)}
                          type="button">
                          Plan {i + 1}
                        </button>
                      ))}
                    </div>
                    {mealPlans[activePlanIdx] && (
                      <div className="tdeeMealPlan">
                        <div className="tdeeMealPlanTotals">
                          <span className="tdeeMealTotal"><strong>{mealPlans[activePlanIdx].totals.cal}</strong> cal</span>
                          <span className="tdeeMealTotal"><strong>{mealPlans[activePlanIdx].totals.protein}g</strong> protein</span>
                          <span className="tdeeMealTotal"><strong>{mealPlans[activePlanIdx].totals.carbs}g</strong> carbs</span>
                          <span className="tdeeMealTotal"><strong>{mealPlans[activePlanIdx].totals.fat}g</strong> fat</span>
                        </div>
                        <div className="tdeeMealList">
                          {mealPlans[activePlanIdx].meals.map((meal, i) => (
                            <div className="tdeeMealCard" key={i}>
                              <div className="tdeeMealCardHeader">
                                <span className="tdeeMealCategory">{meal.category}</span>
                                <span className="tdeeMealCal">{meal.cal} cal</span>
                              </div>
                              <div className="tdeeMealName">{meal.name}</div>
                              <div className="tdeeMealMacros">
                                <span className="tdeeMealMacro" style={{ color: "#5B7CF5" }}>{meal.protein}g P</span>
                                <span className="tdeeMealMacro" style={{ color: "#ff9800" }}>{meal.carbs}g C</span>
                                <span className="tdeeMealMacro" style={{ color: "#f44336" }}>{meal.fat}g F</span>
                              </div>
                              <div className="tdeeMealItems">{meal.items}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Recent log sidebar */}
        <div className="bodyLog">
          <div className="bodyLogHeader">Recent Entries</div>
          <div className="bodyLogEntries">
            {recentEntries.map(e => (
              <button key={e.date}
                className={`bodyLogEntry ${e.date === selectedDate ? "bodyLogEntryActive" : ""}`}
                onClick={() => setSelectedDate(e.date)} type="button">
                <div className="bodyLogDate">
                  {new Date(e.date + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </div>
                <div className="bodyLogStats">
                  {e.weight && <span>{e.weight} lbs</span>}
                  {e.bodyFat && <span>{e.bodyFat}%</span>}
                </div>
              </button>
            ))}
            {recentEntries.length === 0 && (
              <div className="ntEmpty">No entries yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
