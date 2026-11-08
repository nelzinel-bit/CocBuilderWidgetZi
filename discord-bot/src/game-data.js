import { home, builder } from "clash-of-clans-data";

const catalogue = new Map();

function readQuery(factory) {
  try {
    const result = factory();
    if (Array.isArray(result)) return result;
    if (result && typeof result.get === "function") return result.get();
    return result ? [result] : [];
  } catch (error) {
    console.warn("Could not load a game-data section:", error.message);
    return [];
  }
}

function addGroup(base, factories) {
  for (const [category, factory] of factories) {
    for (const item of readQuery(factory)) {
      const dataId = Number(item && item.dataId);
      if (!Number.isFinite(dataId)) continue;
      const key = base + ":" + dataId;
      if (!catalogue.has(key)) {
        catalogue.set(key, { ...item, category, base });
      }
    }
  }
}

addGroup("home", [
  ["buildings", () => home().defenses().get()],
  ["buildings", () => home().craftedDefenses().get()],
  ["buildings", () => home().resourceBuildings().get()],
  ["buildings", () => home().armyBuildings().get()],
  ["buildings", () => home().townHall().get()],
  ["traps", () => home().traps().get()],
  ["walls", () => home().walls().get()],
  ["troops", () => home().troops().get()],
  ["spells", () => home().spells().get()],
  ["siege", () => home().siegeMachines().get()],
  ["heroes", () => home().heroes().get()],
  ["equipment", () => home().heroEquipment().get()],
  ["pets", () => home().pets().get()],
  ["guardians", () => home().guardians().get()]
]);

addGroup("builder", [
  ["buildings", () => builder().defenses().get()],
  ["buildings", () => builder().resourceBuildings().get()],
  ["buildings", () => builder().armyBuildings().get()],
  ["buildings", () => builder().builderHall().get()],
  ["buildings", () => builder().other().get()],
  ["traps", () => builder().traps().get()],
  ["walls", () => builder().walls().get()],
  ["troops", () => builder().troops().get()],
  ["heroes", () => builder().heroes().get()]
]);

const fallbackNames = {
  1000000: "Army Camp", 1000001: "Town Hall", 1000002: "Elixir Collector",
  1000003: "Elixir Storage", 1000004: "Gold Mine", 1000005: "Gold Storage",
  1000006: "Barracks", 1000007: "Laboratory", 1000008: "Cannon",
  1000009: "Archer Tower", 1000010: "Wall", 1000011: "Wizard Tower",
  1000012: "Air Defense", 1000013: "Mortar", 1000014: "Clan Castle",
  1000015: "Builder's Hut", 1000019: "Hidden Tesla", 1000020: "Spell Factory",
  1000021: "X-Bow", 1000023: "Dark Elixir Drill", 1000024: "Dark Elixir Storage",
  1000026: "Dark Barracks", 1000027: "Inferno Tower", 1000028: "Air Sweeper",
  1000029: "Dark Spell Factory", 1000031: "Eagle Artillery", 1000032: "Bomb Tower",
  1000059: "Workshop", 1000067: "Scattershot", 1000068: "Pet House",
  1000070: "Blacksmith", 1000071: "Hero Hall", 1000072: "Spell Tower",
  1000077: "Monolith", 1000079: "Multi-Gear Tower", 1000084: "Multi-Archer Tower",
  1000085: "Ricochet Cannon", 1000086: "Revenge Tower", 1000089: "Firespitter",
  1000093: "Helper Hut", 1000097: "Crafting Station", 1000102: "Super Wizard Tower",
  12000000: "Bomb", 12000001: "Spring Trap", 12000002: "Giant Bomb",
  12000005: "Air Bomb", 12000006: "Seeking Air Mine", 12000008: "Skeleton Trap",
  12000016: "Tornado Trap", 12000020: "Giga Bomb",
  28000000: "Barbarian King", 28000001: "Archer Queen", 28000002: "Grand Warden",
  28000003: "Battle Machine", 28000004: "Royal Champion", 28000005: "Battle Copter",
  28000006: "Minion Prince", 28000007: "Dragon Duke",
  4000000: "Barbarian", 4000001: "Archer", 4000002: "Goblin", 4000003: "Giant",
  4000004: "Wall Breaker", 4000005: "Balloon", 4000006: "Wizard", 4000007: "Healer",
  4000008: "Dragon", 4000009: "P.E.K.K.A", 4000010: "Minion", 4000011: "Hog Rider",
  4000012: "Valkyrie", 4000013: "Golem", 4000015: "Witch", 4000017: "Lava Hound",
  4000022: "Bowler", 4000023: "Baby Dragon", 4000024: "Miner", 4000053: "Yeti",
  4000058: "Ice Golem", 4000059: "Electro Dragon", 4000065: "Dragon Rider",
  4000082: "Headhunter", 4000095: "Electro Titan", 4000097: "Apprentice Warden",
  4000110: "Root Rider", 4000123: "Druid", 4000150: "Furnace",
  26000000: "Lightning Spell", 26000001: "Healing Spell", 26000002: "Rage Spell",
  26000003: "Jump Spell", 26000005: "Freeze Spell", 26000009: "Poison Spell",
  26000010: "Earthquake Spell", 26000011: "Haste Spell", 26000016: "Clone Spell",
  26000017: "Skeleton Spell", 26000028: "Bat Spell", 26000035: "Invisibility Spell",
  26000053: "Recall Spell", 26000070: "Overgrowth Spell", 26000098: "Revive Spell",
  26000109: "Ice Block Spell",
  73000000: "L.A.S.S.I", 73000001: "Mighty Yak", 73000002: "Electro Owl",
  73000003: "Unicorn", 73000004: "Phoenix", 73000007: "Poison Lizard",
  73000008: "Diggy", 73000009: "Frosty", 73000010: "Spirit Fox",
  73000011: "Angry Jelly", 73000016: "Sneezy", 73000017: "Greedy Raven",
  1000033: "Wall", 1000034: "Builder Hall", 1000035: "Elixir Collector",
  1000036: "Elixir Storage", 1000037: "Gold Mine", 1000038: "Gold Storage",
  1000039: "Clock Tower", 1000040: "Builder Barracks", 1000041: "Double Cannon",
  1000042: "Army Camp", 1000043: "Hidden Tesla", 1000044: "Cannon",
  1000045: "Multi Mortar", 1000046: "Star Laboratory", 1000047: "B.O.T.O.'s Shack",
  1000048: "Archer Tower", 1000049: "Reinforcement Camp", 1000050: "Firecrackers",
  1000051: "Guard Post", 1000052: "Mega Tesla", 1000053: "Battle Machine Altar",
  1000054: "Air Bombs", 1000055: "Crusher", 1000056: "Roaster",
  1000057: "Giant Cannon", 1000058: "Gem Mine", 1000063: "Lava Launcher",
  1000065: "B.O.B Control", 1000078: "O.T.T.O.'s Outpost",
  1000080: "Battle Copter Altar", 1000081: "X-Bow", 1000082: "Healing Hut",
  12000010: "Spring Trap", 12000011: "Push Trap", 12000013: "Mine",
  12000014: "Mega Mine", 4000031: "Raged Barbarian", 4000032: "Sneaky Archer",
  4000033: "Beta Minion", 4000034: "Boxer Giant", 4000035: "Bomber",
  4000037: "Cannon Cart", 4000041: "Baby Dragon", 4000042: "Night Witch",
  4000070: "Hog Glider", 4000106: "Electrofire Wizard",
  93000000: "Builder's Apprentice", 93000001: "Lab Assistant",
  93000002: "Prospector", 93000003: "Helper"
};

export function getGameItem(base, dataId) {
  return catalogue.get(base + ":" + Number(dataId)) ?? null;
}

export function getItemName(base, dataId) {
  const item = getGameItem(base, dataId);
  return item?.name ?? fallbackNames[Number(dataId)] ?? "Unknown item #" + dataId;
}

export function getMaxLevelAt(item, caps = {}) {
  if (!item || !Array.isArray(item.levels) || item.levels.length === 0) return null;

  const requirementKeys = [
    ["townHall", ["townHallRequired", "townHallLevelRequired"], caps.townHall],
    ["builderHall", ["builderHallRequired", "builderHallLevelRequired"], caps.builderHall],
    ["heroHall", ["heroHallRequired", "heroHallLevelRequired"], caps.heroHall],
    ["laboratory", ["laboratoryRequired", "laboratoryLevelRequired", "labRequired"], caps.laboratory],
    ["petHouse", ["petHouseRequired", "petHouseLevelRequired"], caps.petHouse],
    ["blacksmith", ["blacksmithRequired", "blacksmithLevelRequired"], caps.blacksmith]
  ];

  const allowed = item.levels.filter(level => requirementKeys.every(([, keys, cap]) => {
    const key = keys.find(candidate => level[candidate] !== undefined && level[candidate] !== null);
    if (!key) return true;
    if (cap === undefined || cap === null) return false;
    const required = Number(level[key]);
    return !Number.isFinite(required) || cap >= required;
  }));

  if (allowed.length === 0) return null;
  const levelNumbers = allowed.map(level => Number(level.level)).filter(Number.isFinite);
  return levelNumbers.length ? Math.max(...levelNumbers) : null;
}

export function catalogueSize() {
  return catalogue.size;
}
