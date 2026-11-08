# Kumpadres-Bot — Clash of Clans JSON Import MVP

This bot uses your existing Discord application, Kumpadres-Bot. Members paste the JSON copied from Clash of Clans into a Discord modal. The bot parses it and publishes a readable report in the channel where the command was run.

## What it does

- /coc import opens a five-part paste form.
- Each text field accepts up to 4,000 characters (up to 20,000 total).
- The bot joins the parts in order, validates the JSON and reads the player tag, Town Hall, Builder Hall, inventory and timers.
- A public report is published in the same channel. The submitting member gets a private confirmation.
- Reports include Home Village buildings, traps, heroes, troops, spells, pets, siege machines and equipment, plus Builder Base buildings, traps, troops and heroes.
- Rows show current level, Town Hall or Builder Hall maximum level, quantity and status.
- Upgrade timers are calculated from the export timestamp. Helper and Clock Tower cooldowns are also shown.
- /coc help explains the import process.
- The bot does not retain a permanent copy of member exports. Each import posts a new report.
- No Supercell API token is required.

## Pasting a large JSON export

Discord modal text fields are limited to 4,000 characters and a modal can contain up to five text inputs. If the export fits in Part 1, paste it there and leave the rest blank. If it is longer, split the original text into consecutive chunks using a text editor and paste each chunk into Parts 1–5 in order. Do not omit, repeat, or add characters between chunks.

## Maximum-level data

Names and upgrade requirements are loaded from the clash-of-clans-data npm package, pinned to version 0.19.1. The parser checks Town Hall, Builder Hall, Hero Hall, Laboratory, Pet House and Blacksmith requirements when those requirements are supplied by the dataset. If the data package cannot provide a defensible cap, the Max column shows a dash instead of guessing.

The data package is MIT-licensed and states that its game data is sourced from the Clash of Clans Wiki. See the package's upstream README and LICENSE for attribution and terms.

## Discord permissions

Kumpadres-Bot needs these permissions in the target channel:
- View Channel
- Send Messages
- Embed Links
- Use Application Commands

Members need permission to use application commands in that channel. Since imports are pasted into a modal, Attach Files is not required. The bot only requests the Guilds Gateway intent; it does not read ordinary chat messages or need the privileged Message Content Intent.

## Environment variables

Set these as private service environment variables. Never commit the bot token.

| Variable | Required | Where to find it |
|---|---|---|
| DISCORD_TOKEN | Yes | Developer Portal → Kumpadres application → Bot → Reset Token, only if you do not have the current token |
| DISCORD_CLIENT_ID | Yes | Developer Portal → General Information → Application ID |
| DISCORD_GUILD_ID | Yes | Enable Discord Developer Mode, then right-click your server → Copy Server ID |
| COC_CHANNEL_ID | No | Right-click the target channel → Copy Channel ID. If blank, imports are accepted in any server text channel |

## Run locally

Use Node.js 24.

    cd discord-bot
    npm install
    cp .env.example .env
    # Fill in the environment values in .env
    npm start

When the bot connects, it registers the /coc command in the guild identified by DISCORD_GUILD_ID. Guild commands appear quickly. Registration replaces this application's guild command list with the two commands in this project: /coc import and /coc help.

## Deploy with Render

A root-level render.yaml is included for a Background Worker. In Render:
1. Choose New → Blueprint.
2. Connect the GitHub repository nelzinel-bit/CocBuilderWidgetZi.
3. Review the kumpadres-coc-bot Background Worker.
4. Add DISCORD_TOKEN, DISCORD_CLIENT_ID and DISCORD_GUILD_ID as private environment values.
5. Add COC_CHANNEL_ID with your target channel ID to restrict imports to the one CoC channel.
6. Deploy.

The bot will register /coc commands when it starts. You do not need to invite it again; Kumpadres-Bot is already in your server.

## Important limits

- The JSON is a snapshot, not a live account connection. Timers are adjusted using the export timestamp and continue locally in the report.
- If a timer has already elapsed, the bot labels it as elapsed and asks the member to import a fresh export.
- Unknown game IDs or missing level prerequisites are shown as unknown / a dash; the bot does not invent names or level caps.
- Large reports are published as several consecutive bot messages in the command channel.
- The MVP posts reports but does not save member data for later retrieval.
- This is an unofficial community project and is not affiliated with Supercell.
