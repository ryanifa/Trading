export interface T212Position {
  ticker: string;
  name?: string;
  shortName?: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  ppl: number;
  fxPpl?: number;
  instrumentCurrency?: string | null;
}

export interface T212Data {
  version: number;
  fetchedAt: string;
  environment: string;
  account: { id: number | null; currencyCode: string };
  cash: {
    free: number;
    invested: number;
    total: number;
    ppl?: number;
    result?: number;
    blocked?: number | null;
    pieCash?: number;
  };
  positions: T212Position[];
  pendingOrders: unknown[];
  dividends: { amount?: number; paidOn?: string; ticker?: string }[];
  errors: string[];
}

export interface T212Config {
  gistId: string;
  token: string;
}

const CONFIG_KEY = "tradr-t212-config";

export function loadT212Config(): T212Config | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as T212Config;
    return parsed.gistId ? parsed : null;
  } catch {
    return null;
  }
}

export function saveT212Config(config: T212Config | null): void {
  if (config) localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  else localStorage.removeItem(CONFIG_KEY);
}

export async function fetchT212Data(config: T212Config): Promise<T212Data> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (config.token) headers.Authorization = `Bearer ${config.token}`;

  const res = await fetch(`https://api.github.com/gists/${config.gistId}`, { headers });
  if (res.status === 404) {
    throw new Error("Gist niet gevonden — check het Gist-ID (en het token bij een private Gist).");
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error("GitHub weigert het token — check of het geldig is en gist-scope heeft.");
  }
  if (!res.ok) throw new Error(`GitHub gaf HTTP ${res.status}.`);

  const gist = await res.json();
  const file = gist.files?.["trading212.json"];
  if (!file) throw new Error("Geen trading212.json in deze Gist — draai eerst de agent.");

  let content: string = file.content;
  if (file.truncated) {
    const rawRes = await fetch(file.raw_url);
    if (!rawRes.ok) throw new Error(`Kon raw Gist-bestand niet laden (HTTP ${rawRes.status}).`);
    content = await rawRes.text();
  }
  return JSON.parse(content) as T212Data;
}
