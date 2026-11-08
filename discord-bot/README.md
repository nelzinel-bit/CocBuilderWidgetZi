# Kumpadres-Bot — Clash of Clans one-paste JSON import

This bot uses your existing Discord application, Kumpadres-Bot. A member runs `/coc import`, opens a private one-time link, pastes the entire Clash of Clans JSON once into a browser form, and submits it. Kumpadres-Bot publishes the readable report in the Discord channel where the command was run.

## What it does

- `/coc import` replies privately with a button to a one-paste import form.
- The member pastes the complete clipboard JSON into one large text box. No chunking and no file upload are needed.
- The web form supports JSON up to 256 KB.
- The private import link is a random single-use token, expires after 15 minutes, and is bound server-side to the Discord user and channel that requested it.
- The bot validates the JSON and publishes a readable report in that same channel. The member's confirmation remains private.
- Reports include Home Village buildings, traps, heroes, troops, spells, pets, siege machines and equipment, plus Builder Base buildings, traps, troops and heroes.
- Rows show current level, maximum level supported by the member's Town Hall or Builder Hall and available prerequisite buildings, quantity and status.
- Upgrade timers are calculated from the export timestamp. Helper and Clock Tower cooldowns are also shown.
- `/coc help` explains the import flow.
- The bot does not save the submitted JSON to disk or a database. It is held in memory only while processing, then discarded.
- No Supercell API token is required.

## Import flow

1. Member copies the JSON export from Clash of Clans.
2. In the target Discord channel, member runs `/coc import`.
3. Bot replies privately with an **Open one-paste JSON importer** button.
4. Member opens the link, pastes the entire JSON in one field, then submits.
5. Bot posts the report to the original channel.

The private link expires after 15 minutes and is single-use. Do not share it. If the Render service restarts before submission, the member should run `/coc import` again to get a fresh link.

## Maximum-level data

Names and upgrade requirements are loaded from the `clash-of-clans-data` npm package, pinned to version 0.19.1. The parser checks Town Hall, Builder Hall, Hero Hall, Laboratory, Pet House and Blacksmith requirements where the dataset provides them. If the data package cannot provide a defensible cap, the Max column shows a dash rather than guessing.

The package is MIT-licensed and says its game data is sourced from the Clash of Clans Wiki. See its upstream README and LICENSE for attribution and terms.

## Discord permissions

Kumpadres-Bot needs these permissions in the target channel:
- View Channel
- Send Messages
- Embed Links
- Use Application Commands

Members need permission to use application commands in that channel. Attach Files is not required. The bot only requests the Guilds Gateway intent; it does not read ordinary chat messages or need the privileged Message Content Intent.

## Environment variables

Set these as private service environment variables. Never commit the bot token.

| Variable | Required | Where to find it |
|---|---|---|
| `DISCORD_TOKEN` | Yes | Developer Portal → Kumpadres application → Bot |
| `DISCORD_CLIENT_ID` | Yes | Developer Portal → General Information → Application ID |
| `DISCORD_GUILD_ID` | Yes | Enable Discord Developer Mode, then right-click your server → Copy Server ID |
| `COC_CHANNEL_ID` | No | Right-click the target channel → Copy Channel ID. If blank, imports are accepted in any server text channel |
| `PUBLIC_BASE_URL` | No on Render | Automatically uses Render's `RENDER_EXTERNAL_URL`; set this if hosting elsewhere |

## Deploy with Render

A root-level `render.yaml` defines a web service (the HTTP import form) plus the Discord Gateway connection.

1. In Render, use **Manual Sync** on the existing Blueprint or let the connected Blueprint sync the repository update.
2. Wait for the new deployment to finish.
3. Confirm logs show `Kumpadres-Bot is online as ...` and `Registered /coc commands...`.
4. The Discord application is already installed in the server; no new invitation is required.

Set `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID` and optionally `COC_CHANNEL_ID` as private environment values.

## Free hosting note

Render free web services can spin down during inactivity and may restart. The bot's in-memory one-time import tickets are lost on restart, so a member may need to run `/coc import` again to get a new link. For reliable always-on bot operation, use an always-on paid host or a computer/server that remains online.

## Important limitations

- The village JSON is a snapshot, not a live account connection. Timers are adjusted using the export timestamp.
- A timer that already elapsed is labelled elapsed; import a fresh export for updated data.
- Unknown game IDs or missing level prerequisites are shown as unknown / a dash; the bot does not invent names or level caps.
- Large reports are published as several consecutive bot messages.
- The MVP does not retain member profiles or support historical lookups.
- This is an unofficial community tool and is not affiliated with Supercell.
