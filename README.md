# CocBuilderWidgetZi — Hybrid Clash of Clans Tracker

This repository contains the installable PWA and a small private API proxy.

## Included
- Dark mobile-first village dashboard with six editable builder timers.
- Builder Potion countdown.
- Village JSON import from file or pasted export. Imported countdowns are adjusted using the export timestamp and continue locally.
- Optional official Clash of Clans player-profile sync through the backend. The PWA polls every 10 minutes while it is open.
- Backend proxy keeps the Supercell API token on the server; it is never entered into the browser.

## Important limitation
The official Clash of Clans API does **not** expose buildings, current upgrades, builder assignments/availability, live upgrade finish times, or Builder Potion state. Those remain based on the imported village JSON snapshot and local countdown timers. The API sync updates public profile information only. Polling pauses when the app is closed or suspended by the browser.

## Publish the PWA with GitHub Pages
1. In this repository, open **Settings → Pages**.
2. Choose **Deploy from a branch**, select `main` and `/ (root)`, then save.
3. Your PWA URL will be `https://nelzinel-bit.github.io/CocBuilderWidgetZi/`.

## Deploy the backend
The backend must run separately on a host with a stable outbound public IPv4 address. Supercell API tokens are IP-restricted, so whitelist that server's outbound IP when creating the token in the Clash of Clans developer portal.

Set these environment variables on the backend host:
- `COC_API_TOKEN`: your Supercell API token (secret; do not commit it).
- `ALLOWED_ORIGIN`: `https://nelzinel-bit.github.io`
- `PORT`: usually supplied by the hosting provider; otherwise 3000.

Run:
```bash
npm install
npm start
```

Check `https://YOUR-BACKEND/health`. It should return `{"ok":true,...}`.

Then open the PWA, expand **Live account sync**, enter your backend base URL and player tag, and tap **Connect / sync now**. Automatic profile sync repeats every 10 minutes while the PWA remains open.

## Security
Never paste the Supercell token into the PWA, frontend code, GitHub, or a public `.env` file. Configure it only as a secret environment variable on the backend host. This repository contains `.env.example` with placeholder values only.


## Discord community JSON importer

The repository also includes a Discord-only MVP for the existing Kumpadres-Bot application:

- Bot source: discord-bot/
- Slash commands: /coc import and /coc help
- Members paste a CoC JSON export in a modal; the bot publishes a readable report in the same channel.
- The report includes current/max level columns for Home Village and Builder Base items, plus upgrade timers.
- The bot does not need a Supercell API token or the Message Content privileged intent.

Follow discord-bot/README.md to deploy it as a Render Background Worker. Kumpadres-Bot is already installed in the Discord server; it only needs its token, application ID, server ID and (optionally) the target channel ID as private environment variables.
