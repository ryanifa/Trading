import { useState } from "react";
import { INSTRUMENTS } from "./lib/priceEngine";
import { StoreProvider, useStore, START_CASH } from "./lib/store";
import { formatEur, formatPct } from "./lib/format";
import { Watchlist } from "./components/Watchlist";
import { PriceChart } from "./components/PriceChart";
import { TradePanel } from "./components/TradePanel";
import { Portfolio } from "./components/Portfolio";
import { OrderHistory } from "./components/OrderHistory";
import { T212Panel } from "./components/T212Panel";

function StatTiles() {
  const { quotes, portfolio } = useStore();
  const positionsValue = Object.values(portfolio.positions).reduce((sum, pos) => {
    const q = quotes.get(pos.symbol);
    return sum + (q ? pos.qty * q.price : 0);
  }, 0);
  const totalValue = portfolio.cash + positionsValue;
  const totalPnl = totalValue - START_CASH;
  const totalPnlPct = totalPnl / START_CASH;
  const dirClass = totalPnl >= 0 ? "up" : "down";
  const arrow = totalPnl >= 0 ? "▲" : "▼";

  return (
    <div className="stats">
      <div className="card stat-tile">
        <div className="label">Totale waarde</div>
        <div className="value">{formatEur(totalValue)}</div>
        <div className={`delta ${dirClass}`}>
          {arrow} {formatEur(Math.abs(totalPnl))} ({formatPct(totalPnlPct)})
        </div>
      </div>
      <div className="card stat-tile">
        <div className="label">Beschikbaar saldo</div>
        <div className="value">{formatEur(portfolio.cash)}</div>
      </div>
      <div className="card stat-tile">
        <div className="label">Belegd vermogen</div>
        <div className="value">{formatEur(positionsValue)}</div>
      </div>
    </div>
  );
}

function Dashboard() {
  const [selected, setSelected] = useState(INSTRUMENTS[0].symbol);
  const { quotes } = useStore();
  const quote = quotes.get(selected);
  const inst = INSTRUMENTS.find((i) => i.symbol === selected);

  return (
    <div className="app">
      <header className="app-header">
        <h1>📈 Tradr</h1>
        <span className="tagline">
          Paper trading met gesimuleerde koersen — geen echt geld
        </span>
      </header>

      <StatTiles />

      <div className="layout">
        <div>
          <Watchlist selected={selected} onSelect={setSelected} />
        </div>
        <div>
          {quote && inst && <PriceChart quote={quote} name={inst.name} />}
          <T212Panel />
          <OrderHistory />
        </div>
        <div>
          <TradePanel symbol={selected} />
          <Portfolio onSelect={setSelected} />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Dashboard />
    </StoreProvider>
  );
}
