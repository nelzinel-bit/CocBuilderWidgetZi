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
    { data: 1000008, lvl: Math.max(1, cannonMax - 1), timer: 3600 },
    { data: 1000007, lvl: 16 },
    { data: 1000071, lvl: 12 },
    { data: 1000068, lvl: 12 },
    { data: 1000070, lvl: 10 }
  ],
  buildings2: [{ data: 1000034, lvl: 10 }],
  heroes: [],
  units: [],
  spells: [],
  pets: [],
  traps: [],
  siege_machines: [],
  equipment: [],
  traps2: [],
  units2: [],
  heroes2: []
};

const report = parseVillageJson(JSON.stringify(sample));
const embeds = buildReportEmbeds(report);

if (report.townHall !== 18) throw new Error("Town Hall was not parsed.");
if (!report.timerRows.length) throw new Error("Upgrade timer was not parsed.");
if (!embeds.length) throw new Error("No report embeds were generated.");

console.log("Smoke test passed.");
console.log("Loaded game-data entries: " + catalogueSize());
console.log("Town Hall 18 Cannon max level: " + cannonMax);
console.log("Generated report embeds: " + embeds.length);
