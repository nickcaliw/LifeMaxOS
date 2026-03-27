const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const db = require("./db.cjs");

const isDev = !app.isPackaged;

app.setName("Apex OS");

function createWindow() {
  const win = new BrowserWindow({
    width: 1800,
    height: 900,
    minWidth: 900,
    minHeight: 500,
    backgroundColor: "#f6f1ea",
    icon: path.join(__dirname, "../build/icon.icns"),
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 18, y: 18 },
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
    },
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  win.webContents.on("did-fail-load", (_e, code, desc, url) => {
    console.error("DID_FAIL_LOAD", { code, desc, url });
  });
}

app.whenReady().then(() => {
  // Set dock icon on macOS
  if (process.platform === "darwin" && app.dock) {
    const { nativeImage } = require("electron");
    const pngPath = path.join(__dirname, "../build/icon.png");
    if (fs.existsSync(pngPath)) {
      app.dock.setIcon(nativeImage.createFromPath(pngPath));
    }
  }

  db.initDb();

  // Planner
  ipcMain.handle("planner:getDay", (_e, date) => db.getEntry(date));
  ipcMain.handle("planner:saveDay", (_e, date, data) => db.upsertEntry(date, data));
  ipcMain.handle("planner:getRange", (_e, s, e) => db.getRange(s, e));
  ipcMain.handle("planner:getAll", () => db.getAllEntries());

  // Workouts
  ipcMain.handle("workout:get", (_e, date) => db.getWorkoutLog(date));
  ipcMain.handle("workout:save", (_e, date, data) => db.upsertWorkoutLog(date, data));
  ipcMain.handle("workout:getRange", (_e, s, e) => db.getWorkoutLogsRange(s, e));
  ipcMain.handle("workout:allDates", () => db.getWorkoutLogDates());

  // Sync State
  ipcMain.handle("sync:get", (_e, source) => db.getSyncState(source));
  ipcMain.handle("sync:save", (_e, source, data) => db.upsertSyncState(source, data));
  ipcMain.handle("sync:getAll", () => db.getAllSyncStates());

  // Tracking Imports
  ipcMain.handle("tracking:add", (_e, id, source, domain, date, data, status) => db.addTrackingImport(id, source, domain, date, data, status));
  ipcMain.handle("tracking:get", (_e, source, domain, start, end) => db.getTrackingImports(source, domain, start, end));

  // Health Auto-Sync — find and process latest export automatically
  ipcMain.handle("health:autoSync", async () => {
    const os = require("os");
    const homeDir = os.homedir();

    // Check common locations for Apple Health export
    const searchPaths = [
      path.join(homeDir, "Downloads"),
      path.join(homeDir, "Desktop"),
      path.join(homeDir, "Documents"),
    ];

    let latestFile = null;
    let latestMtime = 0;

    for (const dir of searchPaths) {
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (file.toLowerCase().includes("export") && (file.endsWith(".zip") || file.endsWith(".xml"))) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.mtimeMs > latestMtime) {
              latestMtime = stat.mtimeMs;
              latestFile = fullPath;
            }
          }
        }
      } catch { /* dir may not exist */ }
    }

    if (!latestFile) return { found: false, message: "No Apple Health export found" };

    // Check if we already synced this file
    const syncState = db.getSyncState("apple_health");
    const fileId = `${latestFile}:${latestMtime}`;
    if (syncState?.config?.lastFileId === fileId) {
      return { found: true, alreadySynced: true, file: latestFile, message: "Already synced this export" };
    }

    return { found: true, alreadySynced: false, file: latestFile, mtime: latestMtime };
  });

  // Health: sync specific file (reuses existing parser but only recent days)
  ipcMain.handle("health:syncFile", async (_e, filePath, daysBack) => {
    const sax = require("sax");
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (daysBack || 30));
    const cutoffStr = cutoffDate.toISOString().slice(0, 10);

    let inputStream;
    if (filePath.endsWith(".zip")) {
      const yauzl = require("yauzl");
      inputStream = await new Promise((res, rej) => {
        yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
          if (err) return rej(err);
          zipfile.readEntry();
          zipfile.on("entry", (entry) => {
            if (entry.fileName.endsWith("export.xml") || entry.fileName === "export.xml") {
              zipfile.openReadStream(entry, (err2, stream) => {
                if (err2) return rej(err2);
                res(stream);
              });
            } else {
              zipfile.readEntry();
            }
          });
          zipfile.on("end", () => rej(new Error("No export.xml found")));
        });
      });
    } else {
      inputStream = fs.createReadStream(filePath, { encoding: "utf-8" });
    }

    const data = { sleep: {}, stepsBySource: {}, calBySource: {}, heartRate: {}, weight: {} };

    return new Promise((resolve, reject) => {
      const parser = sax.createStream(true, { trim: true });

      parser.on("opentag", (node) => {
        const tag = node.name;
        const a = node.attributes;

        if (tag === "Record") {
          const type = a.type;
          const value = parseFloat(a.value) || 0;
          const startDate = a.startDate;
          if (!startDate) return;
          const dateStr = startDate.slice(0, 10);

          // Only process recent data
          if (dateStr < cutoffStr) return;

          const source = a.sourceName || "unknown";

          if (type === "HKQuantityTypeIdentifierStepCount") {
            if (!data.stepsBySource[dateStr]) data.stepsBySource[dateStr] = {};
            data.stepsBySource[dateStr][source] = (data.stepsBySource[dateStr][source] || 0) + Math.round(value);
          }
          else if (type === "HKQuantityTypeIdentifierActiveEnergyBurned") {
            if (!data.calBySource[dateStr]) data.calBySource[dateStr] = {};
            data.calBySource[dateStr][source] = (data.calBySource[dateStr][source] || 0) + Math.round(value);
          }
          else if (type === "HKQuantityTypeIdentifierHeartRate") {
            if (!data.heartRate[dateStr]) data.heartRate[dateStr] = { sum: 0, count: 0, min: 999, max: 0 };
            data.heartRate[dateStr].sum += value;
            data.heartRate[dateStr].count++;
            data.heartRate[dateStr].min = Math.min(data.heartRate[dateStr].min, value);
            data.heartRate[dateStr].max = Math.max(data.heartRate[dateStr].max, value);
          }
          else if (type === "HKCategoryTypeIdentifierSleepAnalysis") {
            const sVal = a.value || "";
            if (sVal.includes("Asleep") || sVal === "HKCategoryValueSleepAnalysisInBed") {
              const endDate = a.endDate;
              if (!endDate) return;
              const startTime = new Date(startDate.replace(" ", "T"));
              const endTime = new Date(endDate.replace(" ", "T"));
              const hours = (endTime - startTime) / (1000 * 60 * 60);
              if (hours > 0 && hours < 24) {
                if (!data.sleep[dateStr]) data.sleep[dateStr] = { hours: 0, bedtime: "", waketime: "" };
                data.sleep[dateStr].hours += hours;
                if (!data.sleep[dateStr].bedtime) {
                  data.sleep[dateStr].bedtime = startDate.slice(11, 16);
                  data.sleep[dateStr].waketime = endDate.slice(11, 16);
                }
              }
            }
          }
          else if (type === "HKQuantityTypeIdentifierBodyMass") {
            if (!data.weight[dateStr] || startDate > data.weight[dateStr].measuredAt) {
              data.weight[dateStr] = { lbs: Math.round(value * 2.20462 * 10) / 10, measuredAt: startDate };
            }
          }
        }
      });

      parser.on("end", () => {
        // Dedup steps/calories
        const steps = {};
        for (const [date, sources] of Object.entries(data.stepsBySource)) {
          steps[date] = { count: Math.max(...Object.values(sources)) };
        }
        const activeCalories = {};
        for (const [date, sources] of Object.entries(data.calBySource)) {
          activeCalories[date] = { total: Math.max(...Object.values(sources)) };
        }
        // Compute HR averages
        for (const hr of Object.values(data.heartRate)) {
          hr.avg = Math.round(hr.sum / hr.count);
          hr.min = Math.round(hr.min);
          hr.max = Math.round(hr.max);
          delete hr.sum;
          delete hr.count;
        }
        // Round sleep
        for (const s of Object.values(data.sleep)) {
          s.hours = Math.round(s.hours * 10) / 10;
        }

        // Persist to DB
        for (const [date, s] of Object.entries(steps)) db.setSetting(`steps_${date}`, JSON.stringify(s));
        for (const [date, cal] of Object.entries(activeCalories)) db.setSetting(`activecal_${date}`, JSON.stringify(cal));
        for (const [date, hr] of Object.entries(data.heartRate)) db.setSetting(`heartrate_${date}`, JSON.stringify(hr));
        for (const [date, sleep] of Object.entries(data.sleep)) {
          if (sleep.hours > 0) db.upsertSleepLog(date, sleep);
        }
        for (const [date, w] of Object.entries(data.weight)) {
          // Merge weight into body_stats
          const existing = db.getBodyStat(date);
          db.upsertBodyStat(date, { ...(existing || {}), weightAm: w.lbs });
        }

        // Update sync state
        const stat = fs.statSync(filePath);
        db.upsertSyncState("apple_health", {
          last_sync_at: new Date().toISOString(),
          last_sync_date: Object.keys(data.sleep).sort().pop() || null,
          status: "idle",
          config: { lastFileId: `${filePath}:${stat.mtimeMs}`, filePath },
        });

        const summary = {
          sleepDays: Object.keys(data.sleep).length,
          stepDays: Object.keys(steps).length,
          heartRateDays: Object.keys(data.heartRate).length,
          calorieDays: Object.keys(activeCalories).length,
          weightDays: Object.keys(data.weight).length,
        };

        console.log("[health:syncFile] Done!", summary);
        resolve({ ok: true, summary });
      });

      parser.on("error", (err) => {
        parser._parser.error = null;
        parser._parser.resume();
      });

      inputStream.pipe(parser);
    });
  });

  // Life Orchestrator — Daily Plans
  ipcMain.handle("dailyplan:get", (_e, date) => db.getDailyPlan(date));
  ipcMain.handle("dailyplan:save", (_e, date, data, readiness, dayType, score, scoreBreakdown) => db.upsertDailyPlan(date, data, readiness, dayType, score, scoreBreakdown));
  ipcMain.handle("dailyplan:getRange", (_e, s, e) => db.getDailyPlansRange(s, e));

  // Life Orchestrator — Weekly Plans
  ipcMain.handle("weeklyplan:get", (_e, weekStart) => db.getWeeklyPlan(weekStart));
  ipcMain.handle("weeklyplan:save", (_e, weekStart, data, lastWeekScore, targetScore, insights) => db.upsertWeeklyPlan(weekStart, data, lastWeekScore, targetScore, insights));

  // Workout Plans
  ipcMain.handle("plan:getActive", () => db.getActiveWorkoutPlan());
  ipcMain.handle("plan:get", (_e, id) => db.getWorkoutPlan(id));
  ipcMain.handle("plan:save", (_e, id, data, status) => db.upsertWorkoutPlan(id, data, status));
  ipcMain.handle("plan:deactivateAll", () => db.deactivateAllWorkoutPlans());

  // Workout Schedule
  ipcMain.handle("schedule:getDate", (_e, date) => db.getScheduleForDate(date));
  ipcMain.handle("schedule:getRange", (_e, s, e) => db.getScheduleRange(s, e));
  ipcMain.handle("schedule:save", (_e, id, planId, date, data, status) => db.upsertScheduleEntry(id, planId, date, data, status));
  ipcMain.handle("schedule:deleteForPlan", (_e, planId) => db.deleteScheduleForPlan(planId));
  ipcMain.handle("schedule:clearFuture", (_e, planId, fromDate) => db.clearFutureSchedule(planId, fromDate));
  ipcMain.handle("schedule:bulkInsert", (_e, entries) => db.bulkInsertSchedule(entries));

  // Journal
  ipcMain.handle("journal:get", (_e, date) => db.getJournalEntry(date));
  ipcMain.handle("journal:save", (_e, date, content, mood) => db.upsertJournalEntry(date, content, mood));
  ipcMain.handle("journal:list", () => db.getJournalList());

  // Notes
  ipcMain.handle("notes:get", (_e, id) => db.getNote(id));
  ipcMain.handle("notes:save", (_e, id, title, content) => db.upsertNote(id, title, content));
  ipcMain.handle("notes:delete", (_e, id) => db.deleteNote(id));
  ipcMain.handle("notes:list", () => db.getNotesList());

  // Goals
  ipcMain.handle("goals:list", () => db.getGoals());
  ipcMain.handle("goals:save", (_e, id, data) => db.upsertGoal(id, data));
  ipcMain.handle("goals:delete", (_e, id) => db.deleteGoal(id));

  // Weekly Reviews
  ipcMain.handle("review:get", (_e, ws) => db.getWeeklyReview(ws));
  ipcMain.handle("review:save", (_e, ws, data) => db.upsertWeeklyReview(ws, data));

  // Books
  ipcMain.handle("books:list", () => db.getBooks());
  ipcMain.handle("books:save", (_e, id, data) => db.upsertBook(id, data));
  ipcMain.handle("books:delete", (_e, id) => db.deleteBook(id));

  // Budgets
  ipcMain.handle("budget:get", (_e, month) => db.getBudget(month));
  ipcMain.handle("budget:save", (_e, month, data) => db.upsertBudget(month, data));

  // File picker for CSV import
  ipcMain.handle("dialog:openCsv", async () => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win, {
      title: "Import CSV",
      filters: [{ name: "CSV Files", extensions: ["csv"] }],
      properties: ["openFile"],
    });
    if (result.canceled || !result.filePaths.length) return null;
    return fs.readFileSync(result.filePaths[0], "utf-8");
  });

  // MyFitnessPal PDF import
  ipcMain.handle("mfp:parsePdf", async () => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win, {
      title: "Import MyFitnessPal PDF",
      filters: [{ name: "PDF Files", extensions: ["pdf"] }],
      properties: ["openFile"],
    });
    if (result.canceled || !result.filePaths.length) return null;

    const { PDFParse } = require("pdf-parse");
    const buf = fs.readFileSync(result.filePaths[0]);
    const uint8 = new Uint8Array(buf);
    const parser = new PDFParse(uint8);
    const textResult = await parser.getText();

    const MONTHS = {
      jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
      jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
    };

    const days = [];
    const allText = textResult.pages.map(p => p.text).join("\n");
    const lines = allText.split("\n").map(l => l.trim()).filter(Boolean);

    let currentDate = null;
    let nutritionLines = [];
    const nutritionRe = /^([\d,]+)\s+([\d.]+)g\s+([\d.]+)g\s+([\d.]+)g\s+[\d.]+mg\s+[\d.]+mg\s+([\d.]+)g\s+([\d.]+)g$/;

    function saveDay() {
      if (currentDate && nutritionLines.length > 0) {
        // The line with the highest calories is the daily TOTALS
        let best = nutritionLines[0];
        for (const nl of nutritionLines) {
          if (nl.calories > best.calories) best = nl;
        }
        days.push({ date: currentDate, ...best });
      }
    }

    for (const line of lines) {
      const dateMatch = line.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{1,2}),?\s+(\d{4})$/i);
      if (dateMatch) {
        saveDay();
        const monthKey = dateMatch[1].toLowerCase().slice(0, 3);
        currentDate = `${dateMatch[3]}-${MONTHS[monthKey]}-${dateMatch[2].padStart(2, "0")}`;
        nutritionLines = [];
        continue;
      }

      const m = line.match(nutritionRe);
      if (m && currentDate) {
        nutritionLines.push({
          calories: Number(m[1].replace(/,/g, "")) || 0,
          carbs: Math.round(Number(m[2]) || 0),
          fat: Math.round(Number(m[3]) || 0),
          protein: Math.round(Number(m[4]) || 0),
        });
      }
    }
    saveDay(); // last day

    return days;
  });

  // Body Stats
  ipcMain.handle("body:get", (_e, date) => db.getBodyStat(date));
  ipcMain.handle("body:save", (_e, date, data) => db.upsertBodyStat(date, data));
  ipcMain.handle("body:range", (_e, s, e) => db.getBodyStatsRange(s, e));
  ipcMain.handle("body:all", () => db.getAllBodyStats());

  // Focus Sessions
  ipcMain.handle("focus:add", (_e, id, date, data) => db.addFocusSession(id, date, data));
  ipcMain.handle("focus:getByDate", (_e, date) => db.getFocusSessionsByDate(date));
  ipcMain.handle("focus:getRange", (_e, s, e) => db.getFocusSessionsRange(s, e));
  ipcMain.handle("focus:delete", (_e, id) => db.deleteFocusSession(id));

  // Sleep
  ipcMain.handle("sleep:get", (_e, date) => db.getSleepLog(date));
  ipcMain.handle("sleep:save", (_e, date, data) => db.upsertSleepLog(date, data));
  ipcMain.handle("sleep:range", (_e, s, e) => db.getSleepLogsRange(s, e));

  // Vision Board
  ipcMain.handle("vision:list", () => db.getVisionItems());
  ipcMain.handle("vision:save", (_e, id, data) => db.upsertVisionItem(id, data));
  ipcMain.handle("vision:delete", (_e, id) => db.deleteVisionItem(id));
  ipcMain.handle("dialog:openImage", async () => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win, {
      title: "Add Image",
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp", "avif"] }],
      properties: ["openFile"],
    });
    if (result.canceled || !result.filePaths.length) return null;
    const filePath = result.filePaths[0];
    const ext = path.extname(filePath).slice(1);
    const buf = fs.readFileSync(filePath);
    const base64 = buf.toString("base64");
    return `data:image/${ext};base64,${base64}`;
  });

  // Water
  ipcMain.handle("water:get", (_e, date) => db.getWaterLog(date));
  ipcMain.handle("water:save", (_e, date, data) => db.upsertWaterLog(date, data));
  ipcMain.handle("water:range", (_e, s, e) => db.getWaterLogsRange(s, e));

  // Meditation
  ipcMain.handle("meditation:get", (_e, date) => db.getMeditationLog(date));
  ipcMain.handle("meditation:save", (_e, date, data) => db.upsertMeditationLog(date, data));
  ipcMain.handle("meditation:range", (_e, s, e) => db.getMeditationLogsRange(s, e));

  // Scoreboard
  ipcMain.handle("scoreboard:get", (_e, week) => db.getScoreboard(week));
  ipcMain.handle("scoreboard:save", (_e, week, data) => db.upsertScoreboard(week, data));
  ipcMain.handle("scoreboard:all", () => db.getAllScoreboards());

  // Affirmations
  ipcMain.handle("affirmations:list", () => db.getAffirmations());
  ipcMain.handle("affirmations:save", (_e, id, data) => db.upsertAffirmation(id, data));
  ipcMain.handle("affirmations:delete", (_e, id) => db.deleteAffirmation(id));

  // Supplements
  ipcMain.handle("supplements:list", () => db.getSupplements());
  ipcMain.handle("supplements:save", (_e, id, data) => db.upsertSupplement(id, data));
  ipcMain.handle("supplements:delete", (_e, id) => db.deleteSupplement(id));
  ipcMain.handle("supplements:getLog", (_e, date) => db.getSupplementLog(date));
  ipcMain.handle("supplements:saveLog", (_e, date, data) => db.upsertSupplementLog(date, data));
  ipcMain.handle("supplements:logRange", (_e, start, end) => db.getSupplementLogsRange(start, end));

  // Knowledge Vault
  ipcMain.handle("knowledge:list", () => db.getKnowledgeEntries());
  ipcMain.handle("knowledge:get", (_e, id) => db.getKnowledgeEntry(id));
  ipcMain.handle("knowledge:save", (_e, id, category, data, pinned) => db.upsertKnowledgeEntry(id, category, data, pinned));
  ipcMain.handle("knowledge:delete", (_e, id) => db.deleteKnowledgeEntry(id));
  ipcMain.handle("knowledge:search", (_e, query) => db.searchKnowledge(query));

  // Days Since
  ipcMain.handle("dayssince:list", () => db.getDaysSinceItems());
  ipcMain.handle("dayssince:save", (_e, id, data) => db.upsertDaysSince(id, data));
  ipcMain.handle("dayssince:delete", (_e, id) => db.deleteDaysSince(id));

  // Projects
  ipcMain.handle("projects:list", () => db.getProjects());
  ipcMain.handle("projects:save", (_e, id, data) => db.upsertProject(id, data));
  ipcMain.handle("projects:delete", (_e, id) => db.deleteProject(id));

  // Life Areas
  ipcMain.handle("lifeareas:get", (_e, weekStart) => db.getLifeAreasLog(weekStart));
  ipcMain.handle("lifeareas:save", (_e, weekStart, data) => db.upsertLifeAreasLog(weekStart, data));
  ipcMain.handle("lifeareas:range", (_e, s, e) => db.getLifeAreasLogsRange(s, e));

  // Future Self Letters
  ipcMain.handle("letters:list", () => db.getLetters());
  ipcMain.handle("letters:get", (_e, id) => db.getLetter(id));
  ipcMain.handle("letters:save", (_e, id, data) => db.upsertLetter(id, data));
  ipcMain.handle("letters:delete", (_e, id) => db.deleteLetter(id));

  // Meals
  ipcMain.handle("meals:list", () => db.getMeals());
  ipcMain.handle("meals:save", (_e, id, data) => db.upsertMeal(id, data));
  ipcMain.handle("meals:delete", (_e, id) => db.deleteMeal(id));

  // Generic Collections (people, networking, date ideas, gift ideas, relationships)
  ipcMain.handle("collection:list", (_e, collection) => db.getCollectionItems(collection));
  ipcMain.handle("collection:save", (_e, id, collection, data) => db.upsertCollectionItem(id, collection, data));
  ipcMain.handle("collection:delete", (_e, id) => db.deleteCollectionItem(id));

  // App Settings
  ipcMain.handle("settings:get", (_e, key) => db.getSetting(key));
  ipcMain.handle("settings:set", (_e, key, value) => db.setSetting(key, value));

  // Global Search
  ipcMain.handle("search:global", (_e, query) => db.globalSearch(query));

  // Export / Import
  ipcMain.handle("data:export", () => db.exportAllData());
  ipcMain.handle("data:import", (_e, data) => db.importAllData(data));
  ipcMain.handle("dialog:saveJson", async (_e, defaultName) => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showSaveDialog(win, {
      title: "Export Data",
      defaultPath: defaultName || "daily-planner-backup.json",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (result.canceled) return null;
    return result.filePath;
  });
  ipcMain.handle("dialog:openJson", async () => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win, {
      title: "Import Data",
      filters: [{ name: "JSON", extensions: ["json"] }],
      properties: ["openFile"],
    });
    if (result.canceled || !result.filePaths.length) return null;
    return fs.readFileSync(result.filePaths[0], "utf-8");
  });
  ipcMain.handle("file:write", (_e, filePath, content) => {
    fs.writeFileSync(filePath, content, "utf-8");
    return { ok: true };
  });

  // Apple Health Import
  ipcMain.handle("health:import", async () => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win, {
      title: "Import Apple Health Data",
      filters: [{ name: "ZIP or XML", extensions: ["zip", "xml"] }],
      properties: ["openFile"],
    });
    if (result.canceled || !result.filePaths.length) return null;

    const filePath = result.filePaths[0];
    console.log("[health:import] Starting import of", filePath);
    const sax = require("sax");

    // Get a readable stream — streaming from zip or raw XML file
    let inputStream;
    if (filePath.endsWith(".zip")) {
      const yauzl = require("yauzl");
      // Open zip and find export.xml entry, stream it without loading all into memory
      inputStream = await new Promise((res, rej) => {
        yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
          if (err) return rej(err);
          zipfile.readEntry();
          zipfile.on("entry", (entry) => {
            if (
              entry.fileName === "apple_health_export/export.xml" ||
              entry.fileName === "export.xml" ||
              entry.fileName.endsWith("/export.xml")
            ) {
              zipfile.openReadStream(entry, (err2, stream) => {
                if (err2) return rej(err2);
                res(stream);
              });
            } else {
              zipfile.readEntry();
            }
          });
          zipfile.on("end", () => rej(new Error("No export.xml found in zip file")));
        });
      });
    } else {
      inputStream = fs.createReadStream(filePath, { encoding: "utf-8" });
    }

    const data = {
      sleep: {},
      // Track by source to deduplicate (Apple Watch + iPhone record overlapping steps/calories)
      stepsBySource: {},     // date → source → count
      calBySource: {},       // date → source → total
      heartRate: {},
      workouts: {},
    };

    return new Promise((resolve, reject) => {
      const parser = sax.createStream(true, { trim: true });

      parser.on("opentag", (node) => {
        const tag = node.name;
        const a = node.attributes;

        if (tag === "Record") {
          const type = a.type;
          const value = parseFloat(a.value) || 0;
          const startDate = a.startDate;
          if (!startDate) return;
          const dateStr = startDate.slice(0, 10);
          const source = a.sourceName || "unknown";

          if (type === "HKQuantityTypeIdentifierStepCount") {
            if (!data.stepsBySource[dateStr]) data.stepsBySource[dateStr] = {};
            data.stepsBySource[dateStr][source] = (data.stepsBySource[dateStr][source] || 0) + Math.round(value);
          }
          else if (type === "HKQuantityTypeIdentifierActiveEnergyBurned") {
            if (!data.calBySource[dateStr]) data.calBySource[dateStr] = {};
            data.calBySource[dateStr][source] = (data.calBySource[dateStr][source] || 0) + Math.round(value);
          }
          else if (type === "HKQuantityTypeIdentifierHeartRate") {
            if (!data.heartRate[dateStr]) data.heartRate[dateStr] = { sum: 0, count: 0, min: 999, max: 0 };
            data.heartRate[dateStr].sum += value;
            data.heartRate[dateStr].count++;
            data.heartRate[dateStr].min = Math.min(data.heartRate[dateStr].min, value);
            data.heartRate[dateStr].max = Math.max(data.heartRate[dateStr].max, value);
          }
          else if (type === "HKCategoryTypeIdentifierSleepAnalysis") {
            const sVal = a.value || "";
            if (sVal.includes("Asleep") || sVal === "HKCategoryValueSleepAnalysisInBed") {
              const endDate = a.endDate;
              if (!endDate) return;
              const startTime = new Date(startDate.replace(" ", "T"));
              const endTime = new Date(endDate.replace(" ", "T"));
              const hours = (endTime - startTime) / (1000 * 60 * 60);
              if (hours > 0 && hours < 24) {
                if (!data.sleep[dateStr]) data.sleep[dateStr] = { hours: 0, bedtime: "", waketime: "" };
                data.sleep[dateStr].hours += hours;
                if (!data.sleep[dateStr].bedtime) {
                  data.sleep[dateStr].bedtime = startDate.slice(11, 16);
                  data.sleep[dateStr].waketime = endDate.slice(11, 16);
                }
              }
            }
          }
        }
        else if (tag === "Workout") {
          const startDate = a.startDate;
          if (!startDate) return;
          const dateStr = startDate.slice(0, 10);
          const duration = parseFloat(a.duration) || 0;
          const calories = parseFloat(a.totalEnergyBurned) || 0;
          const distance = parseFloat(a.totalDistance) || 0;
          const activityType = (a.workoutActivityType || "").replace("HKWorkoutActivityType", "");

          if (!data.workouts[dateStr]) data.workouts[dateStr] = [];
          data.workouts[dateStr].push({
            type: activityType,
            durationMin: Math.round(duration),
            calories: Math.round(calories),
            distanceKm: Math.round(distance * 100) / 100,
          });
        }
      });

      parser.on("end", () => {
        console.log("[health:import] Parsing complete, deduplicating & saving...");

        // Deduplicate steps/calories: for each day, take the max single-source total
        // This mimics Apple Health's source priority deduplication
        const steps = {};
        for (const [date, sources] of Object.entries(data.stepsBySource)) {
          const maxSource = Math.max(...Object.values(sources));
          steps[date] = { count: maxSource };
        }
        const activeCalories = {};
        for (const [date, sources] of Object.entries(data.calBySource)) {
          const maxSource = Math.max(...Object.values(sources));
          activeCalories[date] = { total: maxSource };
        }

        console.log("[health:import] Steps days:", Object.keys(steps).length,
          "HR days:", Object.keys(data.heartRate).length,
          "Cal days:", Object.keys(activeCalories).length,
          "Sleep days:", Object.keys(data.sleep).length,
          "Workout days:", Object.keys(data.workouts).length);

        // Compute heart rate averages
        for (const hr of Object.values(data.heartRate)) {
          hr.avg = Math.round(hr.sum / hr.count);
          hr.min = Math.round(hr.min);
          hr.max = Math.round(hr.max);
          delete hr.sum;
          delete hr.count;
        }
        // Round sleep hours
        for (const s of Object.values(data.sleep)) {
          s.hours = Math.round(s.hours * 10) / 10;
        }

        // Persist directly to DB from main process (avoids thousands of IPC round-trips)
        for (const [date, s] of Object.entries(steps)) {
          db.setSetting(`steps_${date}`, JSON.stringify(s));
        }
        for (const [date, cal] of Object.entries(activeCalories)) {
          db.setSetting(`activecal_${date}`, JSON.stringify(cal));
        }
        for (const [date, hr] of Object.entries(data.heartRate)) {
          db.setSetting(`heartrate_${date}`, JSON.stringify(hr));
        }
        for (const [date, sleep] of Object.entries(data.sleep)) {
          if (sleep.hours > 0) db.upsertSleepLog(date, sleep);
        }

        const summary = {
          sleepDays: Object.keys(data.sleep).length,
          stepDays: Object.keys(steps).length,
          workoutDays: Object.keys(data.workouts).length,
          heartRateDays: Object.keys(data.heartRate).length,
          calorieDays: Object.keys(activeCalories).length,
        };

        console.log("[health:import] Done! Summary:", summary);
        resolve({ data: null, summary });
      });

      parser.on("error", (err) => {
        console.log("[health:import] SAX parse error (resuming):", err.message);
        // SAX is lenient — resume on non-fatal parse errors
        parser._parser.error = null;
        parser._parser.resume();
      });

      inputStream.pipe(parser);
    });
  });

  // Print to PDF
  ipcMain.handle("print:pdf", async () => {
    const win = BrowserWindow.getFocusedWindow();
    const data = await win.webContents.printToPDF({});
    const result = await dialog.showSaveDialog(win, {
      title: "Save PDF",
      defaultPath: "daily-planner-report.pdf",
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, data);
      return { ok: true, path: result.filePath };
    }
    return { ok: false };
  });

  // Notifications
  ipcMain.handle("notification:send", (_e, title, body) => {
    const { Notification } = require("electron");
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
    return { ok: true };
  });

  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
