import { EmbedBuilder } from "discord.js";
import { getGameItem, getItemName, getMaxLevelAt } from "./game-data.js";

const SECTION_DEFINITIONS = [
  ["buildings", "Home Village — Buildings", "home"],
  ["traps", "Home Village — Traps", "home"],
  ["heroes", "Home Village — Heroes", "home"],
  ["units", "Home Village — Troops", "home"],
  ["spells", "Home Village — Spells", "home"],
  ["pets", "Home Village — Pets", "home"],
  ["siege_machines", "Home Village — Siege Machines", "home"],
  ["equipment", "Home Village — Hero Equipment", "home"],
  ["buildings2", "Builder Base — Buildings", "builder"],
  ["traps2", "Builder Base — Traps", "builder"],
  ["units2", "Builder Base — Troops", "builder"],
  ["heroes2", "Builder Base — Heroes", "builder"]
];

const TIMER_SECTIONS = [
  ["buildings", "Home Village building", "home"],
  ["heroes", "Home Village hero", "home"],
  ["units", "Home Village laboratory troop", "home"],
  ["spells", "Home Village laboratory spell", "home"],
  ["pets", "Home Village pet", "home"],
  ["buildings2", "Builder Base building", "builder"],
  ["heroes2", "Builder Base hero", "builder"],
  ["units2", "Builder Base laboratory troop", "builder"]
];

function list(value) {
  return Array.isArray(value) ? value : [];
}

function number(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function highestLevel(entries, id) {
  const matching = list(entries).filter(entry => Number(entry.data) === Number(id));
  if (!matching.length) return null;
  return Math.max(...matching.map(entry => number(entry.lvl, 0)));
}

function deriveCaps(data, townHall, builderHall) {
  const buildings = list(data.buildings);
  return {
    townHall,
    builderHall,
    heroHall: highestLevel(buildings, 1000071),
    laboratory: highestLevel(buildings, 1000007),
    petHouse: highestLevel(buildings, 1000068),
    blacksmith: highestLevel(buildings, 1000070)
  };
}

function formatDuration(seconds) {
  const value = Math.max(0, Math.floor(seconds));
  const days = Math.floor(value / 86400);
  const hours = Math.floor((value % 86400) / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const parts = [];
  if (days) parts.push(days + "d");
  if (hours || days) parts.push(hours + "h");
  parts.push(minutes + "m");
  return parts.join(" ");
}

function formatDate(seconds) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila"
  }).format(new Date(seconds * 1000));
}

function getRemaining(timer, snapshotTimestamp, nowSeconds) {
  const elapsed = Math.max(0, nowSeconds - snapshotTimestamp);
  return Math.max(0, timer - elapsed);
}

// Potion duration stacks by hour; effectiveness does not stack.
// One Builder Potion = 1h at 10x, one Research Potion = 1h at 24x.
function getBoostedRemaining(remainingSeconds, potionCount, multiplier) {
  if (potionCount <= 0 || remainingSeconds <= 0) return null;
  const boostedDuration = potionCount * 3600;
  const workCompletedDuringBoost = boostedDuration * multiplier;
  if (remainingSeconds <= workCompletedDuringBoost) {
    return Math.ceil(remainingSeconds / multiplier);
  }
  return Math.ceil(remainingSeconds - boostedDuration * (multiplier - 1));
}

function validatePotionCount(value, label) {
  const count = Number(value ?? 0);
  if (!Number.isInteger(count) || count < 0 || count > 5) {
    throw new Error(label + " must be a whole number from 0 to 5.");
  }
  return count;
}

function makeRows(entries, base, caps, activeIds) {
  return list(entries)
    .filter(entry => entry && entry.data !== undefined && entry.lvl !== undefined)
    .map(entry => {
      const id = Number(entry.data);
      const item = getGameItem(base, id);
      const current = number(entry.lvl, 0);
      const max = getMaxLevelAt(item, caps);
      const active = activeIds.has(base + ":" + id);
      return {
        name: getItemName(base, id),
        level: current,
        maxLevel: max,
        quantity: number(entry.cnt, 1) || 1,
        state: active ? "UPG" : (max !== null && current >= max ? "MAX" : "LEFT")
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name) || a.level - b.level);
}

function tableLine(row) {
  const name = String(row.name).replace(/[\r\n]/g, "").slice(0, 21).padEnd(21);
  const level = String(row.level).padStart(3);
  const max = row.maxLevel === null ? "—".padStart(3) : String(row.maxLevel).padStart(3);
  const quantity = ("x" + row.quantity).padStart(4);
  return name + " " + level + " " + max + " " + quantity + "  " + row.state;
}

function chunkLines(lines, maxChars = 1450) {
  const chunks = [];
  let current = [];
  let currentLength = 0;
  for (const line of lines) {
    if (current.length && currentLength + line.length + 1 > maxChars) {
      chunks.push(current);
      current = [];
      currentLength = 0;
    }
    current.push(line);
    currentLength += line.length + 1;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

function categoryEmbeds(title, rows, tag, hallLabel) {
  if (!rows.length) return [];
  const header = "Item                    Lv  Max  Qty  State";
  const pages = chunkLines([header, ...rows.map(tableLine)]);
  const fence = String.fromCharCode(96).repeat(3);
  return pages.map((page, index) => new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(title + (pages.length > 1 ? " · " + (index + 1) + "/" + pages.length : ""))
    .setDescription(fence + "\n" + page.join("\n") + "\n" + fence)
    .setFooter({ text: tag + " · Max levels based on " + hallLabel + " and current game data" }));
}

export function parseVillageJson(raw, options = {}) {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error("Paste your village JSON into the import form.");
  }

  let text = raw.trim();
  const fence = String.fromCharCode(96).repeat(3);
  // Members sometimes copy Markdown fences as well as the JSON.
  // They are not part of the export and can safely be stripped.
  text = text.split(fence + "json").join("").split(fence).join("").trim();

  let data;
  let repairedCommaCount = 0;
  try {
    data = JSON.parse(text);
  } catch (firstError) {
    // Repair only the likely missing comma between adjacent exported entities.
    const repairedText = text.replace(/}(\s*)(?=\{\s*"data"\s*:)/g, (_match, whitespace) => {
      repairedCommaCount += 1;
      return "}," + whitespace;
    });

    if (repairedCommaCount > 0) {
      try {
        data = JSON.parse(repairedText);
        text = repairedText;
      } catch (repairError) {
        repairedCommaCount = 0;
        const match = /position (\d+)/i.exec(repairError.message);
        if (match) {
          const position = Number(match[1]);
          const excerpt = text.slice(Math.max(0, position - 55), Math.min(text.length, position + 55))
            .replace(/\s+/g, " ");
          throw new Error(
            "Invalid JSON near character " + position +
            '. Nearby text: "' + excerpt + '". ' +
            "Check that the JSON is complete and copied directly from the Clash of Clans export."
          );
        }
        throw new Error("The JSON could not be parsed. Check that the pasted text is complete and valid.");
      }
    } else {
      const match = /position (\d+)/i.exec(firstError.message);
      if (match) {
        const position = Number(match[1]);
        const excerpt = text.slice(Math.max(0, position - 55), Math.min(text.length, position + 55))
          .replace(/\s+/g, " ");
        throw new Error(
          "Invalid JSON near character " + position +
          '. Nearby text: "' + excerpt + '". ' +
          "Check that the JSON is complete and copied directly from the Clash of Clans export."
        );
      }
      throw new Error("The JSON could not be parsed. Check that the pasted text is complete and valid.");
    }
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("The pasted content must be a JSON object.");
  }
  if (!/^#[A-Z0-9]{3,15}$/i.test(String(data.tag || ""))) {
    throw new Error("I could not find a valid player tag in the JSON.");
  }
  if (!Array.isArray(data.buildings)) {
    throw new Error("This does not look like a CoC village export: the buildings section is missing.");
  }

  const townHall = highestLevel(data.buildings, 1000001);
  const builderHall = highestLevel(data.buildings2, 1000034);
  if (!townHall) throw new Error("Town Hall level (building ID 1000001) was not found.");

  const caps = deriveCaps(data, townHall, builderHall);
  const builderPotions = validatePotionCount(options.builderPotions, "Builder Potions");
  const researchPotions = validatePotionCount(options.researchPotions, "Research Potions");
  let timestamp = number(data.timestamp, Date.now() / 1000);
  if (timestamp > 1000000000000) timestamp /= 1000;
  const nowSeconds = Date.now() / 1000;

  const timerRows = [];
  const activeIds = new Set();

  for (const [key, label, base] of TIMER_SECTIONS) {
    for (const entry of list(data[key])) {
      const timer = number(entry.timer);
      if (timer === null || timer < 0) continue;

      const id = Number(entry.data);
      const current = number(entry.lvl, null);
      const item = getGameItem(base, id);
      const remaining = getRemaining(timer, timestamp, nowSeconds);

      const potionType =
        base === "home" && (key === "buildings" || key === "heroes") ? "builder" :
        base === "home" && (key === "units" || key === "spells") ? "research" :
        null;
      const potionCount = potionType === "builder" ? builderPotions :
        potionType === "research" ? researchPotions : 0;
      const multiplier = potionType === "builder" ? 10 :
        potionType === "research" ? 24 : 1;
      const boostedRemaining = getBoostedRemaining(remaining, potionCount, multiplier);

      timerRows.push({
        dataId: id,
        base,
        key,
        label,
        name: getItemName(base, id),
        level: current,
        max: getMaxLevelAt(item, caps),
        remaining,
        finishAt: timestamp + timer,
        potionType: potionCount > 0 ? potionType : null,
        potionCount,
        boostedRemaining,
        boostedFinishAt: boostedRemaining === null ? null : nowSeconds + boostedRemaining
      });

      if (remaining > 0) activeIds.add(base + ":" + id);
    }
  }
  timerRows.sort((a, b) => a.remaining - b.remaining);

  const sections = SECTION_DEFINITIONS.map(([key, title, base]) => {
    const sectionRows = makeRows(data[key], base, caps, activeIds);
    const hallLabel = base === "home"
      ? "Town Hall " + townHall
      : (builderHall ? "Builder Hall " + builderHall : "Builder Hall level unavailable");
    return { key, title, rows: sectionRows, hallLabel };
  }).filter(section => section.rows.length);

  const tag = String(data.tag).toUpperCase();
  const snapshotText = formatDate(timestamp);
  const cooldowns = [];

  for (const helper of list(data.helpers)) {
    const cooldown = number(helper.helper_cooldown);
    if (cooldown === null || cooldown <= 0) continue;
    const remaining = getRemaining(cooldown, timestamp, nowSeconds);
    if (remaining > 0) {
      cooldowns.push(getItemName("home", helper.data) + ": " + formatDuration(remaining) + " left");
    }
  }

  const clocktower = number(data.boosts && data.boosts.clocktower_cooldown);
  if (clocktower !== null && clocktower > 0) {
    const remaining = getRemaining(clocktower, timestamp, nowSeconds);
    if (remaining > 0) cooldowns.push("Clock Tower: " + formatDuration(remaining) + " left");
  }

  return {
    tag,
    townHall,
    builderHall,
    timestamp,
    snapshotText,
    timerRows,
    cooldowns,
    sections,
    caps,
    potionPlan: { builderPotions, researchPotions },
    repairedCommaCount
  };
}

export function buildReportEmbeds(report) {
  const embeds = [];
  const profileLines = [
    "**Player tag:** " + report.tag,
    "**Home Village:** Town Hall " + report.townHall,
    "**Builder Base:** " + (report.builderHall ? "Builder Hall " + report.builderHall : "Level unavailable in this export"),
    "**Export snapshot:** " + report.snapshotText + " (Philippine time)",
    "**Upgrade timers found:** " + report.timerRows.length,
    ...(report.repairedCommaCount ? ["**Import cleanup:** " + report.repairedCommaCount + " missing separator(s) repaired automatically"] : []),
    "**Planned boosts:** " +
      (report.potionPlan.builderPotions ? report.potionPlan.builderPotions + " Builder Potion(s)" : "No Builder Potion") +
      " · " +
      (report.potionPlan.researchPotions ? report.potionPlan.researchPotions + " Research Potion(s)" : "No Research Potion"),
    "",
    "Each row shows current level, maximum level at the member's hall level, quantity, and status.",
    "Potion finish times assume the selected potions are used immediately after this import."
  ];

  embeds.push(new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle("Kumpadres-Bot · Clash of Clans Village Report")
    .setDescription(profileLines.join("\n"))
    .setFooter({ text: "Unofficial community tracker · Based on the submitted JSON snapshot" }));

  if (report.timerRows.length) {
    const timerLines = report.timerRows.map(row => {
      const levelText = row.level === null ? "" : " Lv " + row.level;
      const maxText = row.max === null ? "" : "/" + row.max;
      const normalText = row.remaining > 0
        ? formatDuration(row.remaining) + " · " + formatDate(row.finishAt)
        : "Elapsed — import a fresh export";
      let timingText = "↳ Normal remaining: " + normalText;
      if (row.boostedRemaining !== null) {
        const potionName = row.potionType === "builder" ? "Builder Potion" : "Research Potion";
        const boostedText = row.boostedRemaining > 0
          ? formatDuration(row.boostedRemaining) + " · " + formatDate(row.boostedFinishAt)
          : "Completes during potion boost";
        timingText += "\n↳ With " + potionName + " ×" + row.potionCount + ": " + boostedText;
      }
      return row.label + ": **" + row.name + "**" + levelText + maxText + "\n" + timingText;
    });

    for (const [index, page] of chunkLines(timerLines, 1450).entries()) {
      embeds.push(new EmbedBuilder()
        .setColor(0xE6A23C)
        .setTitle("Upgrade Timers" + (index ? " · Page " + (index + 1) : ""))
        .setDescription(page.join("\n\n"))
        .setFooter({ text: report.tag + " · Remaining time calculated from export timestamp" }));
    }
  } else {
    embeds.push(new EmbedBuilder()
      .setColor(0x2E9D62)
      .setTitle("Upgrade Timers")
      .setDescription("No upgrade timers were included in this export."));
  }

  if (report.cooldowns.length) {
    embeds.push(new EmbedBuilder()
      .setColor(0x64748B)
      .setTitle("Helper & Clock Tower Cooldowns")
      .setDescription(report.cooldowns.join("\n"))
      .setFooter({ text: report.tag }));
  }

  for (const section of report.sections) {
    embeds.push(...categoryEmbeds(section.title, section.rows, report.tag, section.hallLabel));
  }

  return embeds;
}
