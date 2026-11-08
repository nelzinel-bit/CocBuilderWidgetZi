import express from "express";
import cors from "cors";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const TOKEN = process.env.COC_API_TOKEN;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;

if (!TOKEN) {
  console.error("Missing COC_API_TOKEN environment variable.");
  process.exit(1);
}
if (!ALLOWED_ORIGIN) {
  console.error("Missing ALLOWED_ORIGIN environment variable.");
  process.exit(1);
}

app.use(cors({ origin: ALLOWED_ORIGIN }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "cocbuilderwidgetzi-api" });
});

const cache = new Map();
app.get("/api/player", async (req, res) => {
  const tag = String(req.query.tag || "").trim().toUpperCase();
  if (!/^#[0289PYLQGRJCUV]{3,15}$/.test(tag)) {
    return res.status(400).json({ error: "Invalid player tag." });
  }

  const hit = cache.get(tag);
  if (hit && Date.now() - hit.at < 5 * 60 * 1000) {
    res.set("Cache-Control", "no-store");
    return res.json(hit.data);
  }

  try {
    const encoded = encodeURIComponent(tag);
    const upstream = await fetch(`https://api.clashofclans.com/v1/players/${encoded}`, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/json"
      },
      signal: AbortSignal.timeout(12000)
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: data.message || data.reason || `Supercell API returned ${upstream.status}`
      });
    }

    cache.set(tag, { at: Date.now(), data });
    res.set("Cache-Control", "no-store");
    return res.json(data);
  } catch (_err) {
    return res.status(502).json({ error: "Could not reach Supercell API." });
  }
});

app.listen(PORT, () => console.log(`CoC API backend listening on ${PORT}`));
