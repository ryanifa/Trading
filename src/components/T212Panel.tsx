import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  fetchT212Data,
  loadT212Config,
  saveT212Config,
  T212Config,
  T212Data,
} from "../lib/t212";
import { formatPct, formatQty } from "../lib/format";

function money(value: number | undefined | null, currency: string): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function T212Panel() {
  const [config, setConfig] = useState<T212Config | null>(loadT212Config);
  const [editing, setEditing] = useState(false);
  const [gistIdInput, setGistIdInput] = useState(config?.gistId ?? "");
  const [tokenInput, setTokenInput] = useState(config?.token ?? "");
  const [data, setData] = useState<T212Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (cfg: T212Config) => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchT212Data(cfg));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (config) void refresh(config);
  }, [config, refresh]);

  function saveConfig(e: FormEvent) {
    e.preventDefault();
    const gistId = gistIdInput.trim();
    if (!gistId) return;
    const next = { gistId, token: tokenInput.trim() };
    saveT212Config(next);
    setConfig(next);
    setEditing(false);
  }

  if (!config || editing) {
    return (
      <div className="card">
        <h2>Trading212 — echt portfolio</h2>
        <p className="empty">
          Koppel je Trading212-data: draai de agent (map <code>agent/</code> in de
          repo) en vul hier het Gist-ID in dat de agent print.
        </p>
        <form className="trade-form" onSubmit={saveConfig}>
          <label>
            Gist-ID
            <input
              value={gistIdInput}
              onChange={(e) => setGistIdInput(e.target.value)}
              placeholder="bijv. a1b2c3d4e5..."
            />
          </label>
          <label>
            GitHub-token (voor private Gist)
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="ghp_... (gist-scope)"
            />
          </label>
          <button className="submit-btn" type="submit" disabled={!gistIdInput.trim()}>
            Opslaan &amp; laden
          </button>
          {editing && (
            <button type="button" className="reset-btn" onClick={() => setEditing(false)}>
              Annuleren
            </button>
          )}
        </form>
      </div>
    );
  }

  const currency = data?.account.currencyCode ?? "EUR";
  const ppl = data?.cash.ppl ?? data?.cash.result;

  return (
    <div className="card">
      <div className="chart-head">
        <h2>
          Trading212 — echt portfolio
          {data?.environment === "demo" && " (practice)"}
        </h2>
        <div className="range-row">
          <button onClick={() => config && void refresh(config)} disabled={loading}>
            {loading ? "Laden…" : "Vernieuwen"}
          </button>
          <button
            onClick={() => {
              setGistIdInput(config.gistId);
              setTokenInput(config.token);
              setEditing(true);
            }}
          >
            Instellingen
          </button>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      {data && (
        <>
          <div className="stats" style={{ marginTop: 10 }}>
            <div className="stat-tile">
              <div className="label">Totale waarde</div>
              <div className="value">{money(data.cash.total, currency)}</div>
              {ppl != null && (
                <div className={`delta ${ppl >= 0 ? "up" : "down"}`}>
                  {ppl >= 0 ? "▲" : "▼"} {money(Math.abs(ppl), currency)}
                </div>
              )}
            </div>
            <div className="stat-tile">
              <div className="label">Vrij saldo</div>
              <div className="value">{money(data.cash.free, currency)}</div>
            </div>
            <div className="stat-tile">
              <div className="label">Belegd</div>
              <div className="value">{money(data.cash.invested, currency)}</div>
            </div>
          </div>

          {data.positions.length === 0 ? (
            <div className="empty">Geen open posities.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Fonds</th>
                  <th className="num">Aantal</th>
                  <th className="num">GAK</th>
                  <th className="num">Koers</th>
                  <th className="num">Resultaat</th>
                </tr>
              </thead>
              <tbody>
                {data.positions.map((p) => {
                  const cost = p.quantity * p.averagePrice;
                  const pnlPct = cost ? p.ppl / cost : 0;
                  const cur = p.instrumentCurrency ?? currency;
                  return (
                    <tr key={p.ticker}>
                      <td>
                        <div className="sym">{p.shortName ?? p.ticker}</div>
                        <div className="name">{p.name}</div>
                      </td>
                      <td className="num">{formatQty(p.quantity)}</td>
                      <td className="num">{money(p.averagePrice, cur)}</td>
                      <td className="num">{money(p.currentPrice, cur)}</td>
                      <td className={`num ${p.ppl >= 0 ? "up" : "down"}`}>
                        {money(p.ppl, currency)} ({formatPct(pnlPct)})
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <div className="empty" style={{ fontSize: 12 }}>
            Laatst opgehaald door agent:{" "}
            {new Date(data.fetchedAt).toLocaleString("nl-NL")}
            {data.errors.length > 0 && ` — ${data.errors.length} waarschuwing(en) bij de agent-run`}
          </div>
        </>
      )}
    </div>
  );
}
