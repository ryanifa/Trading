import { useStore } from "../lib/store";
import { formatEur, formatPct, formatPrice, formatQty } from "../lib/format";

export function Portfolio({ onSelect }: { onSelect: (symbol: string) => void }) {
  const { quotes, portfolio, resetPortfolio } = useStore();
  const positions = Object.values(portfolio.positions);

  return (
    <div className="card">
      <h2>Posities</h2>
      {positions.length === 0 ? (
        <div className="empty">Nog geen posities — plaats je eerste order.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Fonds</th>
              <th className="num">Aantal</th>
              <th className="num">GAK</th>
              <th className="num">Waarde</th>
              <th className="num">Resultaat</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((pos) => {
              const q = quotes.get(pos.symbol);
              if (!q) return null;
              const value = pos.qty * q.price;
              const cost = pos.qty * pos.avgPrice;
              const pnl = value - cost;
              const pnlPct = cost ? pnl / cost : 0;
              const dirClass = pnl >= 0 ? "up" : "down";
              return (
                <tr
                  key={pos.symbol}
                  onClick={() => onSelect(pos.symbol)}
                  style={{ cursor: "pointer" }}
                >
                  <td className="sym">{pos.symbol}</td>
                  <td className="num">{formatQty(pos.qty)}</td>
                  <td className="num">{formatPrice(pos.avgPrice)}</td>
                  <td className="num">{formatEur(value)}</td>
                  <td className={`num ${dirClass}`}>
                    {formatEur(pnl)} ({formatPct(pnlPct)})
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <button className="reset-btn" onClick={resetPortfolio}>
        Portfolio resetten
      </button>
    </div>
  );
}
