/**
 * Parse a Hevy workout CSV export and return workout logs keyed by date.
 *
 * Hevy CSV columns:
 * title, start_time, end_time, description, exercise_title, superset_id,
 * exercise_notes, set_index, set_type, weight_lbs, reps, distance_miles,
 * duration_seconds, rpe
 *
 * Each row is one set. Multiple rows share the same title + start_time for one workout.
 */

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

/**
 * Parse Hevy date format: "28 Mar 2025, 17:29" → "2025-03-28"
 */
function parseHevyDate(str) {
  if (!str) return null;
  const cleaned = str.trim().replace(/"/g, "");
  const d = new Date(cleaned);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Parse Hevy CSV text into workout logs grouped by date.
 * Returns: { "2025-03-28": { completed: true, exercises: [...], hevyTitle: "...", duration: ... }, ... }
 */
export function parseHevyCsv(csvText) {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return {};

  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());

  const col = (name) => headers.indexOf(name);
  const iTitle = col("title");
  const iStart = col("start_time");
  const iEnd = col("end_time");
  const iExTitle = col("exercise_title");
  const iSetIdx = col("set_index");
  const iWeight = col("weight_lbs");
  const iReps = col("reps");
  const iRpe = col("rpe");
  const iSetType = col("set_type");
  const iExNotes = col("exercise_notes");

  if (iExTitle === -1 || iStart === -1) {
    throw new Error("CSV doesn't appear to be a Hevy export (missing exercise_title or start_time columns)");
  }

  // Group rows by workout session (date + title combo)
  // workoutsByDate: { "2025-03-28": { title, exercises: { exerciseName: [sets] } } }
  const workoutsByDate = {};

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    if (fields.length < headers.length - 2) continue; // skip malformed

    const dateStr = parseHevyDate(fields[iStart]);
    if (!dateStr) continue;

    const exerciseName = (fields[iExTitle] || "").trim();
    if (!exerciseName) continue;

    const weight = fields[iWeight] ? fields[iWeight].trim() : "";
    const reps = fields[iReps] ? fields[iReps].trim() : "";

    if (!workoutsByDate[dateStr]) {
      workoutsByDate[dateStr] = {
        hevyTitle: (fields[iTitle] || "").trim(),
        exercises: {},
        exerciseOrder: [],
      };
    }

    const workout = workoutsByDate[dateStr];
    if (!workout.exercises[exerciseName]) {
      workout.exercises[exerciseName] = [];
      workout.exerciseOrder.push(exerciseName);
    }

    const rpeVal = fields[iRpe] ? parseFloat(fields[iRpe]) : null;
    const rir = rpeVal && !isNaN(rpeVal) ? Math.max(0, Math.round(10 - rpeVal)) : null;
    const setType = fields[iSetType]?.trim() || "working";

    workout.exercises[exerciseName].push({
      weight: weight || "",
      reps: reps || "",
      rir: rir,
      setType: setType === "warmup" ? "warmup" : "working",
    });
  }

  // Convert to workout log format
  const result = {};
  for (const [dateStr, workout] of Object.entries(workoutsByDate)) {
    result[dateStr] = {
      completed: true,
      hevyTitle: workout.hevyTitle,
      exercises: workout.exerciseOrder.map((name) => ({
        name,
        sets: workout.exercises[name],
      })),
    };
  }

  return result;
}
