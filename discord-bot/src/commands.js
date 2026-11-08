import { SlashCommandBuilder } from "discord.js";

export const cocCommand = new SlashCommandBuilder()
  .setName("coc")
  .setDescription("Import and read a Clash of Clans village export")
  .addSubcommand(subcommand =>
    subcommand.setName("import")
      .setDescription("Paste your copied CoC JSON and publish a readable village report"))
  .addSubcommand(subcommand =>
    subcommand.setName("help")
      .setDescription("Show how to import your Clash of Clans village"));
