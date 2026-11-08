import "dotenv/config";
import { REST, Routes } from "discord.js";
import { cocCommand } from "./commands.js";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId || !guildId) {
  console.error("Missing DISCORD_TOKEN, DISCORD_CLIENT_ID, or DISCORD_GUILD_ID.");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(token);
try {
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
    body: [cocCommand.toJSON()]
  });
  console.log("Registered /coc commands for the configured Discord server.");
} catch (error) {
  console.error("Could not register slash commands:", error);
  process.exit(1);
}
