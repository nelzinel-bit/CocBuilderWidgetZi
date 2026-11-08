import "dotenv/config";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  REST,
  Routes
} from "discord.js";
import { cocCommand } from "./commands.js";
import { catalogueSize } from "./game-data.js";
import { buildReportEmbeds, parseVillageJson } from "./parser.js";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;
const allowedChannelId = process.env.COC_CHANNEL_ID || "";
const port = Number(process.env.PORT || 10000);
const publicBaseUrl = (process.env.PUBLIC_BASE_URL || process.env.RENDER_EXTERNAL_URL || "").replace(/\/+$/, "");

if (!token || !clientId || !guildId) {
  console.error("Missing DISCORD_TOKEN, DISCORD_CLIENT_ID, or DISCORD_GUILD_ID.");
  process.exit(1);
}
if (!publicBaseUrl) {
  console.error("Missing PUBLIC_BASE_URL. Render should provide RENDER_EXTERNAL_URL automatically.");
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const importPageTemplate = readFileSync(new URL("../import.html", import.meta.url), "utf8");
const importTickets = new Map();
const TICKET_TTL_MS = 15 * 60 * 1000;
const MAX_IMPORT_BYTES = 256 * 1024;
const MAX_ACTIVE_TICKETS = 1000;
const userLastImport = new Map();

function cleanExpiredTickets() {
  const now = Date.now();
  for (const [key, ticket] of importTickets) {
    if (ticket.expiresAt <= now) importTickets.delete(key);
  }
  if (importTickets.size > MAX_ACTIVE_TICKETS) {
    const oldest = [...importTickets.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt);
    for (const [key] of oldest.slice(0, importTickets.size - MAX_ACTIVE_TICKETS)) importTickets.delete(key);
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  });
  res.end(JSON.stringify(payload));
}

async function readRequestBody(req, maxBytes) {
  const declaredLength = Number(req.headers["content-length"] || 0);
  if (declaredLength > maxBytes) {
    const error = new Error("The JSON is larger than the 256 KB import limit.");
    error.statusCode = 413;
    throw error;
  }
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) {
      const error = new Error("The JSON is larger than the 256 KB import limit.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function processImport(ticket, raw) {
  const previous = userLastImport.get(ticket.userId) || 0;
  if (Date.now() - previous < 15000) {
    const error = new Error("Please wait a few seconds before importing again.");
    error.statusCode = 429;
    throw error;
  }

  const report = parseVillageJson(raw);
  const embeds = buildReportEmbeds(report);
  const channel = await client.channels.fetch(ticket.channelId);
  if (!channel || !channel.isTextBased() || typeof channel.send !== "function") {
    const error = new Error("I cannot send a report to the original channel. Please check the bot's channel permissions.");
    error.statusCode = 403;
    throw error;
  }

  userLastImport.set(ticket.userId, Date.now());
  for (let index = 0; index < embeds.length; index += 3) {
    await channel.send({
      embeds: embeds.slice(index, index + 3),
      allowedMentions: { parse: [] }
    });
  }
  return report;
}

const server = createServer(async (req, res) => {
  const requestUrl = new URL(req.url || "/", publicBaseUrl);

  if (req.method === "GET" && (requestUrl.pathname === "/" || requestUrl.pathname === "/health")) {
    return sendJson(res, 200, { ok: true, service: "kumpadres-coc-bot", botReady: client.isReady() });
  }

  if (req.method === "GET" && requestUrl.pathname === "/import") {
    cleanExpiredTickets();
    const ticketToken = requestUrl.searchParams.get("t") || "";
    const ticket = importTickets.get(ticketToken);
    if (!ticket || ticket.expiresAt <= Date.now()) {
      return sendJson(res, 410, { error: "This import link expired or was already used. Run /coc import in Discord to get a new link." });
    }
    const html = importPageTemplate.replace("__IMPORT_TOKEN__", JSON.stringify(ticketToken));
    res.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer"
    });
    return res.end(html);
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/import") {
    if (!String(req.headers["content-type"] || "").toLowerCase().startsWith("application/json")) {
      return sendJson(res, 415, { error: "Send the import as application/json." });
    }
    try {
      const bodyText = await readRequestBody(req, MAX_IMPORT_BYTES);
      let body;
      try {
        body = JSON.parse(bodyText);
      } catch {
        return sendJson(res, 400, { error: "The form request was invalid. Reload the import link and try again." });
      }

      const ticketToken = typeof body.token === "string" ? body.token : "";
      const ticket = importTickets.get(ticketToken);
      if (!ticket || ticket.expiresAt <= Date.now()) {
        importTickets.delete(ticketToken);
        return sendJson(res, 410, { error: "This import link expired or was already used. Run /coc import in Discord to get a new link." });
      }
      if (typeof body.json !== "string" || !body.json.trim()) {
        return sendJson(res, 400, { error: "Paste your complete village JSON first." });
      }

      const report = await processImport(ticket, body.json);
      importTickets.delete(ticketToken);
      return sendJson(res, 200, {
        ok: true,
        message: "Success! The village report for " + report.tag + " was posted in your Discord channel."
      });
    } catch (error) {
      return sendJson(res, error.statusCode || 400, { error: error.message || "Import failed. Please try again." });
    }
  }

  return sendJson(res, 404, { error: "Not found" });
});

server.listen(port, "0.0.0.0", () => {
  console.log("Kumpadres-Bot web importer listening on port " + port);
});

function isChannelAllowed(interaction) {
  return !allowedChannelId || interaction.channelId === allowedChannelId;
}

async function handleCocCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "help") {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("Kumpadres-Bot · CoC JSON Import")
      .setDescription([
        "1. Copy your complete Clash of Clans village JSON.",
        "2. Run /coc import in this channel.",
        "3. Open the private import link and paste the entire JSON once.",
        "4. Submit. I will post your readable report in this same channel.",
        "",
        "The private link expires after 15 minutes and can be used once. The JSON is processed in memory and is not saved.",
        "",
        "Upgrade timers are calculated from the export timestamp. This is a snapshot, not a live account connection."
      ].join("\n"));
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (subcommand === "import") {
    if (!isChannelAllowed(interaction)) {
      await interaction.reply({
        content: "Please run /coc import in the configured Clash of Clans channel.",
        ephemeral: true
      });
      return;
    }

    cleanExpiredTickets();
    const ticketToken = randomBytes(32).toString("hex");
    importTickets.set(ticketToken, {
      userId: interaction.user.id,
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      createdAt: Date.now(),
      expiresAt: Date.now() + TICKET_TTL_MS
    });

    const link = publicBaseUrl + "/import?t=" + ticketToken;
    const button = new ButtonBuilder()
      .setLabel("Open one-paste JSON importer")
      .setStyle(ButtonStyle.Link)
      .setURL(link);

    await interaction.reply({
      content: [
        "**Your private JSON import form is ready.**",
        "Open the button, paste your entire Clash of Clans JSON once, and submit.",
        "The bot will post the readable report in this channel.",
        "This single-use link expires in 15 minutes. Do not share it."
      ].join("\n"),
      components: [new ActionRowBuilder().addComponents(button)],
      ephemeral: true
    });
  }
}

client.once(Events.ClientReady, async readyClient => {
  console.log("Kumpadres-Bot is online as " + readyClient.user.tag);
  console.log("Loaded " + catalogueSize() + " game-data catalogue entries.");
  try {
    const rest = new REST({ version: "10" }).setToken(token);
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: [cocCommand.toJSON()]
    });
    console.log("Registered /coc commands in the configured Discord server.");
  } catch (error) {
    console.error("Could not register /coc commands:", error);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand() && interaction.commandName === "coc") {
      await handleCocCommand(interaction);
    }
  } catch (error) {
    console.error("Interaction error:", error);
    const message = "Something went wrong while handling that command. Please try again.";
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: message, ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ content: message, ephemeral: true }).catch(() => {});
    }
  }
});

client.login(token).catch(error => {
  console.error("Could not log in to Discord:", error);
  process.exit(1);
});
