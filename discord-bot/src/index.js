import "dotenv/config";
import {
  ActionRowBuilder,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
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

if (!token || !clientId || !guildId) {
  console.error("Missing DISCORD_TOKEN, DISCORD_CLIENT_ID, or DISCORD_GUILD_ID environment variable.");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const fieldIds = ["json_part_1", "json_part_2", "json_part_3", "json_part_4", "json_part_5"];
const maxImportChars = 20000;
const lastImportByUser = new Map();

function createImportModal(userId) {
  const modal = new ModalBuilder()
    .setCustomId("coc_import_json:" + userId)
    .setTitle("Paste Clash of Clans JSON");

  const labels = [
    "JSON part 1 of 5 (required)",
    "JSON part 2 of 5 (optional)",
    "JSON part 3 of 5 (optional)",
    "JSON part 4 of 5 (optional)",
    "JSON part 5 of 5 (optional)"
  ];

  const rows = fieldIds.map((fieldId, index) => {
    const input = new TextInputBuilder()
      .setCustomId(fieldId)
      .setLabel(labels[index])
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(4000)
      .setRequired(index === 0)
      .setPlaceholder(index === 0
        ? "Paste the JSON here. If it exceeds 4,000 characters, continue in the next fields."
        : "Paste the next consecutive chunk here. Leave blank if unused.");
    return new ActionRowBuilder().addComponents(input);
  });

  modal.addComponents(...rows);
  return modal;
}

function channelAllowed(interaction) {
  return !allowedChannelId || interaction.channelId === allowedChannelId;
}

async function handleCocCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "help") {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("Kumpadres-Bot · CoC JSON Import")
      .setDescription([
        "1. Open Clash of Clans and copy your village JSON export.",
        "2. In this channel, run /coc import.",
        "3. Paste the JSON into Part 1. If it is longer than 4,000 characters, split it into consecutive chunks and use Parts 2–5.",
        "4. Submit. The bot publishes your readable village report here.",
        "",
        "The five fields accept up to 20,000 characters total. Keep the pieces in order and do not add, repeat, or remove characters between them.",
        "",
        "Timers are calculated from the export timestamp. This is a snapshot, not a live account connection."
      ].join("\n"));

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (subcommand === "import") {
    if (!channelAllowed(interaction)) {
      await interaction.reply({
        content: "Please run /coc import in the configured Clash of Clans channel.",
        ephemeral: true
      });
      return;
    }
    await interaction.showModal(createImportModal(interaction.user.id));
  }
}

async function handleImportSubmit(interaction) {
  const expectedId = "coc_import_json:" + interaction.user.id;
  if (interaction.customId !== expectedId) return;

  if (!channelAllowed(interaction)) {
    await interaction.reply({
      content: "This import must be submitted in the configured Clash of Clans channel.",
      ephemeral: true
    });
    return;
  }

  const lastUsed = lastImportByUser.get(interaction.user.id) || 0;
  if (Date.now() - lastUsed < 15000) {
    await interaction.reply({
      content: "Please wait a few seconds before importing another village.",
      ephemeral: true
    });
    return;
  }
  lastImportByUser.set(interaction.user.id, Date.now());

  await interaction.deferReply({ ephemeral: true });

  try {
    // Do not trim individual chunks; joining them exactly preserves the original JSON text.
    const raw = fieldIds
      .map(fieldId => interaction.fields.getTextInputValue(fieldId))
      .join("");

    if (raw.length > maxImportChars) {
      throw new Error("The import exceeds the 20,000-character limit.");
    }

    const report = parseVillageJson(raw);
    const embeds = buildReportEmbeds(report);
    const channel = await client.channels.fetch(interaction.channelId);

    if (!channel || !channel.isTextBased() || typeof channel.send !== "function") {
      throw new Error("I cannot send a report to this channel. Please check my channel permissions.");
    }

    // Three compact embeds per message stay below Discord's combined embed text limit.
    for (let index = 0; index < embeds.length; index += 3) {
      await channel.send({
        embeds: embeds.slice(index, index + 3),
        allowedMentions: { parse: [] }
      });
    }

    await interaction.editReply({
      content: "Your village report for " + report.tag + " has been published in <#" +
        interaction.channelId + ">. Export snapshot: " + report.snapshotText + "."
    });
  } catch (error) {
    await interaction.editReply({
      content: "Import failed: " + error.message
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
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("coc_import_json:")) {
      await handleImportSubmit(interaction);
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
