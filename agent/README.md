# 📊 Trading212 Agent — README

Autonome Trading212-import-agent voor de Tradr-app. Haalt je echte portfolio op
via de **officiële Trading212 REST API** en pusht het naar een private GitHub
Gist, waar de app het uitleest. Geen browser-automatisering, geen MFA-gedoe —
alleen een API-key.

## 1. Architectuur & bestanden

```
Trading212 API ──(Node fetch)──▶ trading212-agent ──(GitHub API)──▶ Gist ──(app pull)──▶ Tradr-app
                                      │
                                      ├─ account info + cash
                                      ├─ open posities (verrijkt met namen)
                                      ├─ open orders + orderhistorie
                                      └─ dividenden + transacties
```

### Bestandsstructuur

```
C:\Agents\trading-agent\
├── .env                     ← credentials (NIET in git)
├── .env.example             ← template
├── .gitignore
├── trading212-agent.mjs     ← hoofdscript
├── package.json
├── runagent.bat             ← wrapper voor Task Scheduler
├── instruments-cache.json   ← ticker→naam cache (auto, ~wekelijks ververst)
├── data\portfolio.json      ← laatste opgehaalde payload (lokale kopie)
└── logs\agent-YYYY-MM-DD.log
```

## 2. Eenmalige setup

### 2.1 Vereisten

- Node.js ≥ 20 (voor `--env-file` support) — geen npm-dependencies nodig
- Trading212-account (Invest of ISA; practice werkt ook via `T212_ENV=demo`)
- GitHub-account + Personal Access Token met **gist**-scope

### 2.2 Trading212 API-key genereren

1. Open de Trading212-app (mobiel of web)
2. **Instellingen → API (Beta) → Genereer API-key**
3. Vink alle **lees**-scopes aan: account data, portfolio, orders, history
   (schrijf-scopes zijn niet nodig — de agent leest alleen)
4. Kopieer de key naar `.env`

### 2.3 Installatie

```powershell
# kopieer de agent-map uit de repo naar je agents-map, bv.:
#   C:\Agents\trading-agent
cd C:\Agents\trading-agent
copy .env.example .env
notepad .env        # vul T212_API_KEY en GITHUB_TOKEN in, GIST_ID leeg laten
```

### 2.4 Eerste run

```powershell
node --env-file=.env trading212-agent.mjs
```

Bij de eerste run maakt de agent zelf een **private Gist** aan en print het ID:

```
Nieuwe private Gist aangemaakt: a1b2c3d4...
Zet in .env:  GIST_ID=a1b2c3d4...
```

Zet dat ID in `.env` én in de Tradr-app (Trading212-paneel → instellingen).

## 3. `.env`-parameters

| Parameter | Verplicht | Default | Beschrijving |
|---|---|---|---|
| `T212_API_KEY` | ✅ | — | API-key uit de Trading212-app. Geen quotes. |
| `GITHUB_TOKEN` | aanbevolen | — | PAT met gist-scope; nodig voor sync naar de app. |
| `GIST_ID` | aanbevolen | *(leeg)* | Leeg bij eerste run → agent maakt Gist en print het ID. |
| `T212_ENV` | — | `live` | `live` = echt account, `demo` = practice account. |
| `HISTORY_LIMIT` | — | `50` | Aantal items orderhistorie/dividenden/transacties. |
| `SKIP_GIST` | — | `false` | `true` = alleen lokaal opslaan (`data\portfolio.json`). |
| `INSTRUMENTS_MAX_AGE_DAYS` | — | `7` | Verversinterval van de ticker→naam cache. |

**Regels voor .env:** `KEY=value` per regel, zonder quotes, geen spaties rond
de `=`, comments alleen op eigen regels met `#`.

## 4. Windows Task Scheduler

De data verandert alleen tijdens beurstijden; 2× per dag is ruim voldoende
(bijv. 08:00 en 22:00). PowerShell **als admin**:

```powershell
$scriptPath = "C:\Agents\trading-agent\runagent.bat"
$workDir    = "C:\Agents\trading-agent"
$action = New-ScheduledTaskAction -Execute $scriptPath -WorkingDirectory $workDir
$trigger1 = New-ScheduledTaskTrigger -Daily -At "08:00"
$trigger2 = New-ScheduledTaskTrigger -Daily -At "22:00"
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 10)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName "Trading212-agent ochtend" -Action $action -Trigger $trigger1 -Settings $settings -Principal $principal -Force
Register-ScheduledTask -TaskName "Trading212-agent avond"   -Action $action -Trigger $trigger2 -Settings $settings -Principal $principal -Force
```

Verwijderen:

```powershell
Unregister-ScheduledTask -TaskName "Trading212-agent ochtend" -Confirm:$false
Unregister-ScheduledTask -TaskName "Trading212-agent avond"   -Confirm:$false
```

## 5. Exit-codes

| Code | Betekenis | Actie |
|---|---|---|
| `0` | Alles OK. | Geen. |
| `1` | Onverwachte fout. | Check de log; run handmatig. |
| `2` | **API-key geweigerd** (401/403). | Genereer een nieuwe key in de Trading212-app en zet hem in `.env`. |
| `3` | **Gist-sync mislukt** (data staat wél lokaal in `data\portfolio.json`). | Check `GITHUB_TOKEN` (gist-scope? verlopen?) en `GIST_ID`. |

Losse endpoint-fouten (bijv. dividenden tijdelijk niet beschikbaar) killen de
run *niet* — ze komen als waarschuwing in de log én in het `errors`-veld van de
payload.

## 6. Data-formaat (`trading212.json` in de Gist)

```jsonc
{
  "version": 1,
  "fetchedAt": "2026-08-09T06:00:12.345Z",
  "environment": "live",
  "account": { "id": 12345678, "currencyCode": "EUR" },
  "cash": { "free": 1234.56, "invested": 8000.00, "total": 9500.00, "ppl": 265.44, ... },
  "positions": [
    { "ticker": "ASML_NL_EQ", "name": "ASML Holding", "quantity": 2,
      "averagePrice": 650.10, "currentPrice": 812.40, "ppl": 324.60, ... }
  ],
  "pendingOrders": [ ... ],
  "orderHistory": [ ... ],
  "dividends": [ ... ],
  "transactions": [ ... ],
  "errors": []
}
```

`ppl` = ongerealiseerd resultaat in accountvaluta. Koersen staan in de
instrumentvaluta (`instrumentCurrency`).

## 7. Rate limits

Trading212 hanteert per endpoint een limiet (portfolio ±1 req/5s, metadata
1 req/30s). De agent pauzeert tussen calls en doet bij HTTP 429 automatisch
retries met backoff. De grote instrumenten-call wordt lokaal gecachet en maar
±1× per week gedaan.

## 8. Troubleshooting

| Symptoom | Oplossing |
|---|---|
| Exit 2 direct bij start | API-key fout/verlopen, of `T212_ENV` verkeerd (live-key werkt niet op demo en andersom). |
| Exit 3 | Token zonder gist-scope, of verkeerd `GIST_ID`. Test: open `gist.github.com/<GIST_ID>` in je browser. |
| App toont oude data | Agent gedraaid? Check `fetchedAt` in de Gist. Daarna in de app op **Vernieuwen** klikken. |
| `Cannot find module` | Je zit niet in de agent-map, of Node < 20. `node -v` moet ≥ 20 zijn. |
| Lege naam bij posities | Instrumenten-cache ontbrak bij die run; volgende run lost het op (of verwijder `instruments-cache.json`). |
| Task Scheduler "Last Run Result 0x2/0x3" | Zie exit-codes hierboven; check `logs\agent-YYYY-MM-DD.log`. |

## 9. Security & credentials

**Commit nooit:** `.env` (API-key + PAT), `data/` (je portfolio),
`instruments-cache.json`, `logs/`. De meegeleverde `.gitignore` dekt dit af.

| Credential | Waar beheren | Roteren |
|---|---|---|
| Trading212 API-key | Trading212-app → Instellingen → API | Direct bij lek; key is read-only als je alleen lees-scopes aanvinkt. |
| GitHub PAT | github.com/settings/tokens | Direct bij lek; anders bij expiry. |

De Trading212-key geeft **alleen lezen** als je geen schrijf-scopes aanvinkt —
de agent kan dus nooit orders plaatsen op je echte account.
