# 📈 Tradr — Paper Trading App

Een trading-app om risicoloos te oefenen met beleggen. Je start met een
virtueel saldo van **€ 100.000** en handelt tegen gesimuleerde live koersen
(geometrische Brownse beweging). Geen echt geld, geen API-keys nodig.

## Functies

- **Live watchlist** — 9 instrumenten (AEX-fondsen + crypto) met koersen die
  elke 2 seconden bewegen
- **Koersgrafiek** — interactieve SVG-grafiek met crosshair en tooltip,
  periodes 1u / 3u / Alles
- **Orders plaatsen** — kopen en verkopen tegen de actuele marktprijs,
  met saldo- en positiechecks
- **Portfolio** — posities met gemiddelde aankoopkoers (GAK), actuele waarde
  en ongerealiseerd resultaat
- **Orderhistorie** — overzicht van alle uitgevoerde transacties
- **Persistentie** — je portfolio wordt bewaard in `localStorage`
- **Licht & donker thema** — volgt automatisch je systeeminstelling

## Ontwikkelen

```bash
npm install
npm run dev      # dev-server op http://localhost:5173
npm run build    # productie-build naar dist/
```

## Deployment

Elke push naar de `main` branch wordt automatisch gebouwd en gedeployed naar
GitHub Pages via `.github/workflows/deploy.yml`. Activeer hiervoor eenmalig
GitHub Pages in de repo-instellingen: **Settings → Pages → Source →
GitHub Actions**.

## Stack

- [Vite](https://vitejs.dev/) + [React 18](https://react.dev/) + TypeScript
- Geen verdere runtime-dependencies — de koerssimulatie en grafieken zijn
  zelf geschreven

> ⚠️ Dit is een simulatie voor educatieve doeleinden. De koersen zijn niet
> echt en dit is geen beleggingsadvies.
