import { useCallback, useEffect, useRef, useState } from "react";
import { useHabits } from "../hooks/useHabits.js";
import { SPIRITUAL_PATHS } from "../lib/spirituality.js";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

const settingsApi = typeof window !== "undefined" ? window.settingsApi : null;
const dataApi = typeof window !== "undefined" ? window.dataApi : null;
const syncApiRef = typeof window !== "undefined" ? window.syncApi : null;
const healthSyncApiRef = typeof window !== "undefined" ? window.healthSyncApi : null;
const notificationApi = typeof window !== "undefined" ? window.notificationApi : null;
const dialogApi = typeof window !== "undefined" ? window.dialogApi : null;
const plannerApi = typeof window !== "undefined" ? window.plannerApi : null;
const mfpApi = typeof window !== "undefined" ? window.mfpApi : null;
const healthApi = typeof window !== "undefined" ? window.healthApi : null;
const sleepApi = typeof window !== "undefined" ? window.sleepApi : null;
const bodyApi = typeof window !== "undefined" ? window.bodyApi : null;

const APP_NAME = "Apex OS";
const APP_VERSION = "1.0.0";

export default function SettingsPage({ spiritualPath, onSpiritualPathChange }) {
  const [waterReminder, setWaterReminder] = useState(false);
  const [bedtimeReminder, setBedtimeReminder] = useState(false);
  const [supplementReminder, setSupplementReminder] = useState(false);
  const [lastBackup, setLastBackup] = useState(null);
  const [message, setMessage] = useState(null); // { type: "success"|"error", text }
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [mfpImporting, setMfpImporting] = useState(false);

  // Load settings on mount
  useEffect(() => {
    async function load() {
      if (!settingsApi) return;
      const water = await settingsApi.get("waterReminder");
      const bedtime = await settingsApi.get("bedtimeReminder");
      const supplement = await settingsApi.get("supplementReminder");
      const backup = await settingsApi.get("lastBackupDate");
      if (water !== undefined) setWaterReminder(!!water);
      if (bedtime !== undefined) setBedtimeReminder(!!bedtime);
      if (supplement !== undefined) setSupplementReminder(!!supplement);
      if (backup) setLastBackup(backup);
    }
    load();
  }, []);

  const showMessage = useCallback((type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }, []);

  // --- Data Management ---

  const handleExport = async () => {
    if (!dataApi) return;
    setExporting(true);
    try {
      const data = await dataApi.export();
      const filePath = await dataApi.saveJson("daily-planner-backup");
      if (!filePath) {
        setExporting(false);
        return; // user cancelled
      }
      await dataApi.writeFile(filePath, JSON.stringify(data, null, 2));
      const now = new Date().toISOString();
      if (settingsApi) await settingsApi.set("lastBackupDate", now);
      setLastBackup(now);
      showMessage("success", "Data exported successfully!");
    } catch (err) {
      showMessage("error", "Export failed: " + (err.message || err));
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    if (!dataApi) return;
    setImporting(true);
    try {
      const jsonStr = await dataApi.openJson();
      if (!jsonStr) {
        setImporting(false);
        return; // user cancelled
      }
      const data = JSON.parse(jsonStr);
      await dataApi.import(data);
      showMessage("success", "Data imported successfully!");
    } catch (err) {
      showMessage("error", "Import failed: " + (err.message || err));
    } finally {
      setImporting(false);
    }
  };

  // --- MyFitnessPal CSV Import ---

  const handleMfpImport = async () => {
    if (!mfpApi || !plannerApi) return;
    setMfpImporting(true);
    try {
      const days = await mfpApi.parsePdf();
      if (!days) {
        setMfpImporting(false);
        return; // user cancelled
      }

      if (days.length === 0) {
        showMessage("error", "No nutrition data found in PDF. Make sure it's a MyFitnessPal Printable Diary.");
        setMfpImporting(false);
        return;
      }

      // Save each day's nutrition into planner
      let saved = 0;
      for (const day of days) {
        const existing = await plannerApi.getDay(day.date);
        const entry = existing || {
          date: day.date, tab: "planner",
          grateful: "", feel: "", goal: "",
          agenda: {}, top3: ["", "", ""], notes: "",
          wins: ["", "", ""], rating: 3, habits: {},
          nutrition: { calories: "", protein: "", carbs: "", fat: "" },
        };
        entry.nutrition = {
          calories: String(day.calories),
          protein: String(day.protein),
          carbs: String(day.carbs),
          fat: String(day.fat),
        };
        await plannerApi.saveDay(day.date, entry);
        saved++;
      }

      showMessage("success", `Imported nutrition data for ${saved} days from MyFitnessPal!`);
    } catch (err) {
      showMessage("error", "MFP import failed: " + (err.message || err));
    } finally {
      setMfpImporting(false);
    }
  };

  // --- Notification Toggles ---

  const toggleSetting = async (key, value, setter) => {
    setter(value);
    if (settingsApi) await settingsApi.set(key, value);
  };

  const handleTestNotification = () => {
    if (notificationApi) {
      notificationApi.send("Daily Planner", "Notifications are working!");
    }
  };

  // --- Apple Health Import ---
  const [healthImporting, setHealthImporting] = useState(false);
  const [healthResult, setHealthResult] = useState(null);

  const handleHealthImport = async () => {
    if (!healthApi) return;
    setHealthImporting(true);
    setHealthResult(null);
    try {
      const result = await healthApi.import();
      if (!result) { setHealthImporting(false); return; } // cancelled
      if (result.error) { showMessage("error", result.error); setHealthImporting(false); return; }

      const { summary } = result;
      const total = summary.stepDays + summary.sleepDays + summary.heartRateDays + summary.calorieDays + summary.workoutDays;

      setHealthResult(summary);
      showMessage("success", `Imported ${total} day-records from Apple Health!`);
    } catch (err) {
      showMessage("error", "Import failed: " + (err.message || err));
    } finally {
      setHealthImporting(false);
    }
  };

  // --- Habits Management ---
  const { habits, addHabit, removeHabit, renameHabit, reorderHabits } = useHabits();
  const [newHabit, setNewHabit] = useState("");
  const [editingHabit, setEditingHabit] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [confirmDeleteHabit, setConfirmDeleteHabit] = useState(null);
  const dragIdx = useRef(null);
  const overIdx = useRef(null);

  const handleAddHabit = () => {
    if (!newHabit.trim()) return;
    addHabit(newHabit.trim());
    setNewHabit("");
  };

  const handleRenameHabit = () => {
    if (editingHabit && editingValue.trim()) {
      renameHabit(editingHabit, editingValue.trim());
    }
    setEditingHabit(null);
    setEditingValue("");
  };

  const handleDragStart = (idx) => (e) => {
    dragIdx.current = idx;
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (idx) => (e) => {
    e.preventDefault();
    overIdx.current = idx;
  };
  const handleDragEnd = () => {
    if (dragIdx.current !== null && overIdx.current !== null && dragIdx.current !== overIdx.current) {
      const next = [...habits];
      const [moved] = next.splice(dragIdx.current, 1);
      next.splice(overIdx.current, 0, moved);
      reorderHabits(next);
    }
    dragIdx.current = null;
    overIdx.current = null;
  };

  // Format last backup date
  const formattedBackup = lastBackup
    ? new Date(lastBackup).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Never";

  return (
    <div className="settPage">
      <div className="topbar">
        <div className="topbarLeft">
          <h1 className="pageTitle">Settings</h1>
        </div>
      </div>

      <div className="settBody">
        {/* Status message */}
        {message && (
          <div className={`settMsg ${message.type === "error" ? "settMsgError" : "settMsgSuccess"}`}>
            {message.text}
          </div>
        )}

        {/* Spirituality */}
        <section className="settSection">
          <h2 className="settSectionTitle">Spirituality</h2>
          <div className="settCard">
            <div className="settDesc" style={{ padding: "0 0 12px" }}>
              Choose your spiritual path to personalize your dashboard and sidebar.
            </div>
            <div className="settSpiritualGrid">
              {Object.entries(SPIRITUAL_PATHS).map(([key, config]) => (
                <button
                  key={key}
                  className={`settSpiritualOption ${spiritualPath === key ? "settSpiritualOptionActive" : ""}`}
                  onClick={() => {
                    if (settingsApi) settingsApi.set("spiritual_path", key);
                    if (onSpiritualPathChange) onSpiritualPathChange(key);
                  }}
                  type="button"
                >
                  <span className="settSpiritualEmoji">{config.emoji}</span>
                  <span className="settSpiritualLabel">{config.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Tracking Sources */}
        <section className="settSection">
          <h2 className="settSectionTitle">Tracking Sources</h2>
          <div className="settCard">
            <div className="settDesc" style={{ padding: "0 0 12px" }}>
              Connect external sources to automatically track your life data.
            </div>
            <TrackingSourceRow
              name="Apple Health"
              icon="\u231A"
              desc="Sleep, steps, weight, heart rate, workouts"
              onSync={async () => {
                if (!healthSyncApiRef) return;
                const check = await healthSyncApiRef.autoSync();
                if (!check.found) {
                  showMessage("error", "No Apple Health export found in Downloads, Desktop, or Documents.");
                  return;
                }
                if (check.alreadySynced) {
                  showMessage("success", "Apple Health is already up to date.");
                  return;
                }
                showMessage("success", "Syncing Apple Health data...");
                const result = await healthSyncApiRef.syncFile(check.file, 90);
                if (result?.ok) {
                  const s = result.summary;
                  showMessage("success", `Synced: ${s.sleepDays} sleep, ${s.stepDays} steps, ${s.weightDays} weight, ${s.heartRateDays} heart rate days`);
                }
              }}
            />
            <div className="settSepLine" />
            <TrackingSourceRow
              name="Hevy"
              icon="\u{1F3CB}\uFE0F"
              desc="Workout sets, reps, and weights via CSV import"
              buttonLabel="Import CSV"
              onSync={null}
              note="Use the Import Hevy button on the Workouts page"
            />
            <div className="settSepLine" />
            <TrackingSourceRow
              name="MyFitnessPal"
              icon="\u{1F34E}"
              desc="Calories, protein, carbs, fat from PDF export"
              buttonLabel="Import PDF"
              onSync={handleMfpImport}
            />
            <div className="settSepLine" />
            <TrackingSourceRow
              name="Apple Calendar"
              icon="\u{1F4C5}"
              desc="Events and schedule for auto-planning"
              buttonLabel="Coming Soon"
              onSync={null}
              disabled
            />
          </div>
        </section>

        {/* Data Management */}
        <section className="settSection">
          <h2 className="settSectionTitle">Data Management</h2>
          <div className="settCard">
            <div className="settRow">
              <div className="settRowInfo">
                <div className="settLabel">Export Data</div>
                <div className="settDesc">Save all your planner data as a JSON backup file.</div>
              </div>
              <button
                className="btn btnPrimary"
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? "Exporting..." : "Export"}
              </button>
            </div>

            <div className="settDivider" />

            <div className="settRow">
              <div className="settRowInfo">
                <div className="settLabel">Import Data</div>
                <div className="settDesc">Restore data from a previously exported JSON file.</div>
              </div>
              <button
                className="btn btnPrimary"
                onClick={handleImport}
                disabled={importing}
              >
                {importing ? "Importing..." : "Import"}
              </button>
            </div>

            <div className="settDivider" />

            <div className="settRow">
              <div className="settRowInfo">
                <div className="settLabel">Last Backup</div>
                <div className="settDesc">{formattedBackup}</div>
              </div>
            </div>
          </div>
        </section>

        {/* MyFitnessPal Import */}
        <section className="settSection">
          <h2 className="settSectionTitle">MyFitnessPal Import</h2>
          <div className="settCard">
            <div className="settRow">
              <div className="settRowInfo">
                <div className="settLabel">Import Nutrition Data</div>
                <div className="settDesc">
                  Import a MyFitnessPal Printable Diary PDF to auto-populate daily calories, protein, carbs, and fat for each day.
                </div>
              </div>
              <button
                className="btn btnPrimary"
                onClick={handleMfpImport}
                disabled={mfpImporting}
              >
                {mfpImporting ? "Importing..." : "Import PDF"}
              </button>
            </div>

            <div className="settDivider" />

            <div className="settRow">
              <div className="settRowInfo">
                <div className="settDesc" style={{ fontSize: "12px", color: "var(--muted)" }}>
                  To export from MyFitnessPal: go to myfitnesspal.com → Food Diary → select a date range → Print → Save as PDF. The PDF should show daily totals with Calories, Carbs, Fat, and Protein.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Apple Health Import */}
        <section className="settSection">
          <h2 className="settSectionTitle">Apple Health</h2>
          <div className="settCard">
            <div className="settRow">
              <div className="settRowInfo">
                <div className="settLabel">Import Apple Health Data</div>
                <div className="settDesc">
                  Import sleep, steps, workouts, heart rate, and active calories from an Apple Health export.
                </div>
              </div>
              <button
                className="btn btnPrimary"
                onClick={handleHealthImport}
                disabled={healthImporting}
              >
                {healthImporting ? "Importing..." : "Import"}
              </button>
            </div>

            {healthResult && (
              <>
                <div className="settDivider" />
                <div className="settRow">
                  <div className="settRowInfo">
                    <div className="settLabel">Last Import Summary</div>
                    <div className="settHealthSummary">
                      <span>{healthResult.sleepDays} sleep days</span>
                      <span>{healthResult.stepDays} step days</span>
                      <span>{healthResult.workoutDays} workout days</span>
                      <span>{healthResult.heartRateDays} heart rate days</span>
                      <span>{healthResult.calorieDays} calorie days</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="settDivider" />

            <div className="settRow">
              <div className="settRowInfo">
                <div className="settDesc" style={{ fontSize: "12px", color: "var(--muted)" }}>
                  On your iPhone: Health app → Profile icon (top right) → Export All Health Data → AirDrop or save the .zip to your Mac → Select it here.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className="settSection">
          <h2 className="settSectionTitle">Notifications</h2>
          <div className="settCard">
            <div className="settRow">
              <div className="settRowInfo">
                <div className="settLabel">Water Reminders</div>
                <div className="settDesc">Get reminded to drink water every 2 hours.</div>
              </div>
              <label className="settToggle">
                <input
                  type="checkbox"
                  checked={waterReminder}
                  onChange={(e) => toggleSetting("waterReminder", e.target.checked, setWaterReminder)}
                />
                <span className="settToggleTrack" />
              </label>
            </div>

            <div className="settDivider" />

            <div className="settRow">
              <div className="settRowInfo">
                <div className="settLabel">Bedtime Reminder</div>
                <div className="settDesc">Get a reminder when it's time to wind down.</div>
              </div>
              <label className="settToggle">
                <input
                  type="checkbox"
                  checked={bedtimeReminder}
                  onChange={(e) => toggleSetting("bedtimeReminder", e.target.checked, setBedtimeReminder)}
                />
                <span className="settToggleTrack" />
              </label>
            </div>

            <div className="settDivider" />

            <div className="settRow">
              <div className="settRowInfo">
                <div className="settLabel">Supplement Reminder</div>
                <div className="settDesc">Daily reminder to take your supplements.</div>
              </div>
              <label className="settToggle">
                <input
                  type="checkbox"
                  checked={supplementReminder}
                  onChange={(e) => toggleSetting("supplementReminder", e.target.checked, setSupplementReminder)}
                />
                <span className="settToggleTrack" />
              </label>
            </div>

            <div className="settDivider" />

            <div className="settRow">
              <div className="settRowInfo">
                <div className="settLabel">Test Notification</div>
                <div className="settDesc">Send a test notification to verify they work.</div>
              </div>
              <button className="btn btnPrimary" onClick={handleTestNotification}>
                Test
              </button>
            </div>
          </div>
        </section>

        {/* Habits Configuration */}
        <section className="settSection">
          <h2 className="settSectionTitle">Habits</h2>
          <div className="settCard">
            <div className="settDesc" style={{ padding: "0 0 12px" }}>
              Customize your daily habit checklist. Drag to reorder.
            </div>
            <div className="settHabitList">
              {habits.map((h, idx) => (
                <div
                  key={h}
                  className="settHabitRow"
                  draggable
                  onDragStart={handleDragStart(idx)}
                  onDragOver={handleDragOver(idx)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="settHabitGrip" title="Drag to reorder">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="9" cy="5" r="2"/><circle cx="15" cy="5" r="2"/>
                      <circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/>
                      <circle cx="9" cy="19" r="2"/><circle cx="15" cy="19" r="2"/>
                    </svg>
                  </div>
                  {editingHabit === h ? (
                    <input
                      className="settHabitInput"
                      value={editingValue}
                      onChange={e => setEditingValue(e.target.value)}
                      onBlur={handleRenameHabit}
                      onKeyDown={e => { if (e.key === "Enter") handleRenameHabit(); if (e.key === "Escape") { setEditingHabit(null); setEditingValue(""); } }}
                      autoFocus
                    />
                  ) : (
                    <div className="settHabitName" onDoubleClick={() => { setEditingHabit(h); setEditingValue(h); }}>
                      {h}
                    </div>
                  )}
                  <button className="settHabitEdit" onClick={() => { setEditingHabit(h); setEditingValue(h); }} type="button" title="Rename">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button className="settHabitDel" onClick={() => setConfirmDeleteHabit(h)} type="button" title="Remove">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="settHabitAdd">
              <input
                className="settHabitInput"
                placeholder="Add a new habit..."
                value={newHabit}
                onChange={e => setNewHabit(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleAddHabit(); }}
              />
              <button className="btn btnPrimary" onClick={handleAddHabit} type="button">Add</button>
            </div>
          </div>
        </section>

        <ConfirmDialog
          open={!!confirmDeleteHabit}
          title="Remove Habit"
          message={`Remove "${confirmDeleteHabit}" from your habit list? Your historical data for this habit will be preserved.`}
          confirmLabel="Remove"
          danger
          onConfirm={() => { removeHabit(confirmDeleteHabit); setConfirmDeleteHabit(null); }}
          onCancel={() => setConfirmDeleteHabit(null)}
        />

        {/* About */}
        <section className="settSection">
          <h2 className="settSectionTitle">About</h2>
          <div className="settCard">
            <div className="settRow">
              <div className="settRowInfo">
                <div className="settLabel">{APP_NAME}</div>
                <div className="settDesc">Version {APP_VERSION}</div>
              </div>
            </div>

            <div className="settDivider" />

            <div className="settRow">
              <div className="settRowInfo">
                <div className="settDesc">Built with Electron + React</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function TrackingSourceRow({ name, icon, desc, onSync, buttonLabel, note, disabled }) {
  const [syncing, setSyncing] = useState(false);
  const handleClick = async () => {
    if (!onSync || disabled) return;
    setSyncing(true);
    try { await onSync(); } catch {}
    setSyncing(false);
  };
  return (
    <div className="settRow">
      <div className="settRowInfo" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <div>
          <div className="settLabel">{name}</div>
          <div className="settDesc">{desc}</div>
          {note && <div className="settDesc" style={{ fontStyle: "italic", marginTop: 2 }}>{note}</div>}
        </div>
      </div>
      {onSync && (
        <button
          className="btn btnPrimary"
          onClick={handleClick}
          disabled={syncing || disabled}
          type="button"
        >
          {syncing ? "Syncing..." : buttonLabel || "Sync Now"}
        </button>
      )}
      {!onSync && buttonLabel && (
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", padding: "6px 12px", background: "var(--chip)", borderRadius: 8 }}>
          {buttonLabel}
        </span>
      )}
    </div>
  );
}
