#!/usr/bin/env node
/**
 * Trading212 → Tradr agent
 *
 * Haalt account-, cash-, portfolio- en historiedata op via de officiële
 * Trading212 REST API en pusht het resultaat als trading212.json naar een
 * private GitHub Gist. De Tradr-app leest die Gist uit.
 *
 * Vereist Node >= 20 (native fetch + --env-file).
 * Gebruik:  node --env-file=.env trading212-agent.mjs
 *
 * Exit-codes:
 *   0 = OK
 *   1 = onverwachte fout
 *   2 = auth geweigerd (API-key ongeldig/verlopen)
 *   3 = Gist-sync mislukt (data wel lokaal opgeslagen)
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

// ── configuratie ────────────────────────────────────────────────────────────
const API_KEY = process.env.T212_API_KEY;
const T212_ENV = (process.env.T212_ENV || "live").toLowerCase(); // live | demo
const BASE =
  T212_ENV === "demo"
    ? "https://demo.trading212.com"
    : "https://live.trading212.com";

const GIST_ID = process.env.GIST_ID || "";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const SKIP_GIST = process.env.SKIP_GIST === "true";
const HISTORY_LIMIT = Number(process.env.HISTORY_LIMIT || 50);
const INSTRUMENTS_MAX_AGE_DAYS = Number(process.env.INSTRUMENTS_MAX_AGE_DAYS || 7);

const DATA_DIR = path.join(HERE, "data");
const INSTRUMENTS_CACHE = path.join(HERE, "instruments-cache.json");

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function fail(code, msg) {
  console.error(`[${new Date().toISOString()}] FOUT: ${msg}`);
  process.exit(code);
}

if (!API_KEY) fail(1, "T212_API_KEY ontbreekt in .env");

// ── Trading212 API helper ───────────────────────────────────────────────────
async function t212(pathname, { retries = 3 } = {}) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(BASE + pathname, {
      headers: { Authorization: API_KEY },
    });
    if (res.status === 401 || res.status === 403) {
      fail(2, `Trading212 weigert de API-key (HTTP ${res.status}) op ${pathname}`);
    }
    if (res.status === 429 && attempt <= retries) {
      const wait = Number(res.headers.get("retry-after")) * 1000 || 5000 * attempt;
      log(`Rate-limit op ${pathname}, ${wait / 1000}s wachten (poging ${attempt}/${retries})…`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} op ${pathname}: ${(await res.text()).slice(0, 200)}`);
    }
    return res.json();
  }
}

// Niet-kritieke endpoints: fout wordt genoteerd i.p.v. de run te killen.
async function tryT212(pathname, errors, label) {
  try {
    return await t212(pathname);
  } catch (e) {
    errors.push(`${label}: ${e.message}`);
    log(`Waarschuwing — ${label} overgeslagen: ${e.message}`);
    return null;
  }
}

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// ── instrumenten-metadata (ticker → naam), wekelijks gecachet ──────────────
async function loadInstruments(errors) {
  try {
    if (existsSync(INSTRUMENTS_CACHE)) {
      const cached = JSON.parse(await readFile(INSTRUMENTS_CACHE, "utf8"));
      const ageDays = (Date.now() - cached.fetchedAt) / 86_400_000;
      if (ageDays < INSTRUMENTS_MAX_AGE_DAYS) {
        log(`Instrumenten-cache gebruikt (${cached.count} instrumenten, ${ageDays.toFixed(1)} dagen oud)`);
        return cached.byTicker;
      }
    }
    log("Instrumenten-metadata ophalen (grote call, wordt gecachet)…");
    const list = await t212("/api/v0/equity/metadata/instruments");
    const byTicker = {};
    for (const i of list) {
      byTicker[i.ticker] = { name: i.name, shortName: i.shortName, currencyCode: i.currencyCode, type: i.type };
    }
    await writeFile(
      INSTRUMENTS_CACHE,
      JSON.stringify({ fetchedAt: Date.now(), count: list.length, byTicker })
    );
    log(`Instrumenten-cache ververst: ${list.length} instrumenten`);
    return byTicker;
  } catch (e) {
    errors.push(`instrumenten-metadata: ${e.message}`);
    log(`Waarschuwing — geen instrumenten-metadata: ${e.message}`);
    return {};
  }
}

// ── Gist-sync ───────────────────────────────────────────────────────────────
async function pushToGist(payload) {
  const body = {
    description: "Tradr — Trading212 portfolio (door trading212-agent)",
    files: { "trading212.json": { content: JSON.stringify(payload, null, 2) } },
  };
  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };

  if (GIST_ID) {
    const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Gist PATCH gaf HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return GIST_ID;
  }

  const res = await fetch("https://api.github.com/gists", {
    method: "POST",
    headers,
    body: JSON.stringify({ ...body, public: false }),
  });
  if (!res.ok) throw new Error(`Gist POST gaf HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const gist = await res.json();
  log("──────────────────────────────────────────────────────");
  log(`Nieuwe private Gist aangemaakt: ${gist.id}`);
  log(`Zet in .env:  GIST_ID=${gist.id}`);
  log("En vul hetzelfde ID in bij de Tradr-app (Trading212-paneel).");
  log("──────────────────────────────────────────────────────");
  return gist.id;
}

// ── hoofdprogramma ──────────────────────────────────────────────────────────
async function main() {
  log(`Trading212-agent start (${T212_ENV}-omgeving, ${BASE})`);
  await mkdir(DATA_DIR, { recursive: true });
  const errors = [];

  const account = await t212("/api/v0/equity/account/info");
  log(`Account ${account.id ?? "?"} (${account.currencyCode})`);
  await pause(300);

  const cash = await t212("/api/v0/equity/account/cash");
  log(`Cash: vrij ${cash.free} / belegd ${cash.invested} / totaal ${cash.total} ${account.currencyCode}`);
  await pause(300);

  const rawPositions = await t212("/api/v0/equity/portfolio");
  log(`${rawPositions.length} open posities`);
  await pause(300);

  const instruments = await loadInstruments(errors);
  const positions = rawPositions.map((p) => ({
    ...p,
    name: instruments[p.ticker]?.name ?? p.ticker,
    shortName: instruments[p.ticker]?.shortName ?? p.ticker.split("_")[0],
    instrumentCurrency: instruments[p.ticker]?.currencyCode ?? null,
  }));
  await pause(300);

  const pendingOrders = (await tryT212("/api/v0/equity/orders", errors, "openstaande orders")) ?? [];
  await pause(300);

  const orderHistory =
    (await tryT212(`/api/v0/equity/history/orders?limit=${HISTORY_LIMIT}`, errors, "orderhistorie"))?.items ?? [];
  await pause(300);

  const dividends =
    (await tryT212(`/api/v0/history/dividends?limit=${HISTORY_LIMIT}`, errors, "dividenden"))?.items ?? [];
  await pause(300);

  const transactions =
    (await tryT212(`/api/v0/history/transactions?limit=${HISTORY_LIMIT}`, errors, "transacties"))?.items ?? [];

  const payload = {
    version: 1,
    fetchedAt: new Date().toISOString(),
    environment: T212_ENV,
    account: { id: account.id ?? null, currencyCode: account.currencyCode },
    cash,
    positions,
    pendingOrders,
    orderHistory,
    dividends,
    transactions,
    errors,
  };

  const localFile = path.join(DATA_DIR, "portfolio.json");
  await writeFile(localFile, JSON.stringify(payload, null, 2));
  log(`Lokaal opgeslagen: ${localFile}`);

  if (SKIP_GIST) {
    log("SKIP_GIST=true — Gist-sync overgeslagen");
  } else if (!GITHUB_TOKEN) {
    log("Geen GITHUB_TOKEN — Gist-sync overgeslagen (alleen lokaal opgeslagen)");
  } else {
    try {
      const id = await pushToGist(payload);
      log(`Gist gepusht: https://gist.github.com/${id}`);
    } catch (e) {
      console.error(`[${new Date().toISOString()}] FOUT: Gist-sync mislukt: ${e.message}`);
      process.exit(3);
    }
  }

  log(
    `Klaar: ${positions.length} posities, ${pendingOrders.length} open orders, ` +
      `${orderHistory.length} historische orders, ${dividends.length} dividenden, ` +
      `${transactions.length} transacties${errors.length ? `, ${errors.length} waarschuwing(en)` : ""}`
  );
  process.exit(0);
}

main().catch((e) => fail(1, e.stack || e.message));
