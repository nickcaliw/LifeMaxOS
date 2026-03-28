const { contextBridge, ipcRenderer } = require("electron");
const inv = (ch) => (...a) => ipcRenderer.invoke(ch, ...a);

contextBridge.exposeInMainWorld("plannerApi", {
  getDay: inv("planner:getDay"), saveDay: inv("planner:saveDay"),
  getRange: inv("planner:getRange"), getAll: inv("planner:getAll"),
});
contextBridge.exposeInMainWorld("workoutApi", {
  get: inv("workout:get"), save: inv("workout:save"), getRange: inv("workout:getRange"), allDates: inv("workout:allDates"),
});
contextBridge.exposeInMainWorld("healthIntelApi", {
  getReadiness: inv("hi:getReadiness"), saveReadiness: inv("hi:saveReadiness"),
  getReadinessRange: inv("hi:getReadinessRange"),
  getRecommendations: inv("hi:getRecommendations"), saveRecommendations: inv("hi:saveRecommendations"),
  getAlerts: inv("hi:getAlerts"), saveAlert: inv("hi:saveAlert"), dismissAlert: inv("hi:dismissAlert"),
  saveNutritionAdj: inv("hi:saveNutritionAdj"), getNutritionAdj: inv("hi:getNutritionAdj"),
});
contextBridge.exposeInMainWorld("mesoApi", {
  getActive: inv("meso:getActive"), get: inv("meso:get"), save: inv("meso:save"),
  deactivateAll: inv("meso:deactivateAll"), list: inv("meso:list"),
  getWeeks: inv("meso:getWeeks"), saveWeek: inv("meso:saveWeek"),
  getDays: inv("meso:getDays"), getDaysByDate: inv("meso:getDaysByDate"),
  getDay: inv("meso:getDay"), saveDay: inv("meso:saveDay"),
  getExercises: inv("meso:getExercises"), getAllExercises: inv("meso:getAllExercises"),
  getAllDays: inv("meso:getAllDays"), saveExercise: inv("meso:saveExercise"),
  getSets: inv("meso:getSets"), saveSet: inv("meso:saveSet"),
  bulkInsert: inv("meso:bulkInsert"),
});
contextBridge.exposeInMainWorld("aiApi", {
  chat: inv("ai:chat"),
});
contextBridge.exposeInMainWorld("syncApi", {
  get: inv("sync:get"), save: inv("sync:save"), getAll: inv("sync:getAll"),
});
contextBridge.exposeInMainWorld("trackingApi", {
  add: inv("tracking:add"), get: inv("tracking:get"),
});
contextBridge.exposeInMainWorld("healthSyncApi", {
  autoSync: inv("health:autoSync"), syncFile: inv("health:syncFile"),
});
contextBridge.exposeInMainWorld("dailyPlanApi", {
  get: inv("dailyplan:get"), save: inv("dailyplan:save"), getRange: inv("dailyplan:getRange"),
});
contextBridge.exposeInMainWorld("weeklyPlanApi", {
  get: inv("weeklyplan:get"), save: inv("weeklyplan:save"),
});
contextBridge.exposeInMainWorld("planApi", {
  getActive: inv("plan:getActive"), get: inv("plan:get"),
  save: inv("plan:save"), deactivateAll: inv("plan:deactivateAll"),
});
contextBridge.exposeInMainWorld("scheduleApi", {
  getDate: inv("schedule:getDate"), getRange: inv("schedule:getRange"),
  save: inv("schedule:save"), deleteForPlan: inv("schedule:deleteForPlan"),
  clearFuture: inv("schedule:clearFuture"), bulkInsert: inv("schedule:bulkInsert"),
});
contextBridge.exposeInMainWorld("journalApi", {
  get: inv("journal:get"), save: inv("journal:save"), list: inv("journal:list"),
});
contextBridge.exposeInMainWorld("notesApi", {
  get: inv("notes:get"), save: inv("notes:save"), delete: inv("notes:delete"), list: inv("notes:list"),
});
contextBridge.exposeInMainWorld("goalsApi", {
  list: inv("goals:list"), save: inv("goals:save"), delete: inv("goals:delete"),
});
contextBridge.exposeInMainWorld("reviewApi", {
  get: inv("review:get"), save: inv("review:save"),
});
contextBridge.exposeInMainWorld("booksApi", {
  list: inv("books:list"), save: inv("books:save"), delete: inv("books:delete"),
});
contextBridge.exposeInMainWorld("budgetApi", {
  get: inv("budget:get"), save: inv("budget:save"),
});
contextBridge.exposeInMainWorld("dialogApi", {
  openCsv: inv("dialog:openCsv"),
  openImage: inv("dialog:openImage"),
});
contextBridge.exposeInMainWorld("mfpApi", {
  parsePdf: inv("mfp:parsePdf"),
});
contextBridge.exposeInMainWorld("bodyApi", {
  get: inv("body:get"), save: inv("body:save"), range: inv("body:range"), all: inv("body:all"),
});
contextBridge.exposeInMainWorld("focusApi", {
  add: inv("focus:add"), getByDate: inv("focus:getByDate"), getRange: inv("focus:getRange"), delete: inv("focus:delete"),
});
contextBridge.exposeInMainWorld("sleepApi", {
  get: inv("sleep:get"), save: inv("sleep:save"), range: inv("sleep:range"),
});
contextBridge.exposeInMainWorld("visionApi", {
  list: inv("vision:list"), save: inv("vision:save"), delete: inv("vision:delete"),
});
contextBridge.exposeInMainWorld("waterApi", {
  get: inv("water:get"), save: inv("water:save"), range: inv("water:range"),
});
contextBridge.exposeInMainWorld("meditationApi", {
  get: inv("meditation:get"), save: inv("meditation:save"), range: inv("meditation:range"),
});
contextBridge.exposeInMainWorld("scoreboardApi", {
  get: inv("scoreboard:get"), save: inv("scoreboard:save"), all: inv("scoreboard:all"),
});
contextBridge.exposeInMainWorld("affirmationsApi", {
  list: inv("affirmations:list"), save: inv("affirmations:save"), delete: inv("affirmations:delete"),
});
contextBridge.exposeInMainWorld("knowledgeApi", {
  list: inv("knowledge:list"), get: inv("knowledge:get"),
  save: inv("knowledge:save"), delete: inv("knowledge:delete"),
  search: inv("knowledge:search"),
});
contextBridge.exposeInMainWorld("supplementsApi", {
  list: inv("supplements:list"), save: inv("supplements:save"), delete: inv("supplements:delete"),
  getLog: inv("supplements:getLog"), saveLog: inv("supplements:saveLog"), logRange: inv("supplements:logRange"),
});
contextBridge.exposeInMainWorld("daysSinceApi", {
  list: inv("dayssince:list"), save: inv("dayssince:save"), delete: inv("dayssince:delete"),
});
contextBridge.exposeInMainWorld("projectsApi", {
  list: inv("projects:list"), save: inv("projects:save"), delete: inv("projects:delete"),
});
contextBridge.exposeInMainWorld("lifeAreasApi", {
  get: inv("lifeareas:get"), save: inv("lifeareas:save"), range: inv("lifeareas:range"),
});
contextBridge.exposeInMainWorld("lettersApi", {
  list: inv("letters:list"), get: inv("letters:get"), save: inv("letters:save"), delete: inv("letters:delete"),
});
contextBridge.exposeInMainWorld("mealsApi", {
  list: inv("meals:list"), save: inv("meals:save"), delete: inv("meals:delete"),
});
contextBridge.exposeInMainWorld("collectionApi", {
  list: inv("collection:list"), save: inv("collection:save"), delete: inv("collection:delete"),
});
contextBridge.exposeInMainWorld("settingsApi", {
  get: inv("settings:get"), set: inv("settings:set"),
});
contextBridge.exposeInMainWorld("searchApi", {
  global: inv("search:global"),
});
contextBridge.exposeInMainWorld("healthApi", {
  import: inv("health:import"),
});
contextBridge.exposeInMainWorld("dataApi", {
  export: inv("data:export"), import: inv("data:import"),
  saveJson: inv("dialog:saveJson"), openJson: inv("dialog:openJson"),
  writeFile: inv("file:write"),
});
contextBridge.exposeInMainWorld("printApi", {
  pdf: inv("print:pdf"),
});
contextBridge.exposeInMainWorld("notificationApi", {
  send: inv("notification:send"),
});
