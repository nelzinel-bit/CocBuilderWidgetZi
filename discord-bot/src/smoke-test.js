import { getGameItem, getMaxLevelAt, catalogueSize } from "./game-data.js";
import { buildReportEmbeds, parseVillageJson } from "./parser.js";

const cannon = getGameItem("home", 1000008);
if (!cannon) throw new Error("Game-data lookup failed for Cannon (1000008).");

const cannonMax = getMaxLevelAt(cannon, {
  townHall: 18,
  builderHall: 10,
  heroHall: 12,
  laboratory: 16,
  petHouse: 12,
  blacksmith: 10
});
if (!Number.isFinite(cannonMax)) {
  throw new Error("Could not resolve a Town Hall 18 Cannon maximum level.");
}

const sample = {
  tag: "#TEST123",
  timestamp: Math.floor(Date.now() / 1000),
  buildings: [
    { data: 1000001, lvl: 18 },
    { data: 1000008, lvl: Math.max(1, cannonMax - 1), timer: 12 * 3600 },
    { data: 1000007, lvl: 16 },
    { data: 1000071, lvl: 12 },
    { data: 1000068, lvl: 12 },
    { data: 1000070, lvl: 10 }
  ],
  buildings2: [{ data: 1000034, lvl: 10 }],
  heroes: [],
  units: [{ data: 4000008, lvl: 10, timer: 48 * 3600 }],
  spells: [],
  pets: [],
  traps: [],
  siege_machines: [],
  equipment: [],
  traps2: [],
  units2: [],
  heroes2: []
};

const report = parseVillageJson(JSON.stringify(sample), {
  builderPotions: 1,
  researchPotions: 1
});
const embeds = buildReportEmbeds(report);

if (report.townHall !== 18) throw new Error("Town Hall was not parsed.");
if (!report.timerRows.length) throw new Error("Upgrade timer was not parsed.");
const builderRow = report.timerRows.find(row => row.dataId === 1000008);
const researchRow = report.timerRows.find(row => row.dataId === 4000008);
if (!builderRow || builderRow.potionType !== "builder" || Math.abs(builderRow.boostedRemaining - 3 * 3600) > 2) {
  throw new Error("Builder Potion projection should turn a 12-hour timer into about 3 hours.");
}
if (!researchRow || researchRow.potionType !== "research" || Math.abs(researchRow.boostedRemaining - 25 * 3600) > 2) {
  throw new Error("Research Potion projection should turn a 48-hour timer into about 25 hours.");
}
if (report.potionPlan.builderPotions !== 1 || report.potionPlan.researchPotions !== 1) {
  throw new Error("Potion selection was not included in the report.");
}
if (!embeds.length) throw new Error("No report embeds were generated.");

console.log("Smoke test passed.");
console.log("Loaded game-data entries: " + catalogueSize());
console.log("Town Hall 18 Cannon max level: " + cannonMax);
console.log("Builder Potion projected 12h → " + Math.round(builderRow.boostedRemaining / 3600) + "h.");
console.log("Research Potion projected 48h → " + Math.round(researchRow.boostedRemaining / 3600) + "h.");
console.log("Generated report embeds: " + embeds.length);
