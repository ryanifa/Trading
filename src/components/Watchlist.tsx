import { INSTRUMENTS } from "../lib/priceEngine";
import { useStore } from "../lib/store";
import { formatPct, formatPrice } from "../lib/format";

export function Watchlist({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (symbol: string) => void;
}) {
  const { quotes } = useStore();

  return (
    <div className="card">
      <h2>Watchlist</h2>
      <table className="watchlist">
        <tbody>
          {INSTRUMENTS.map((inst) => {
            const q = quotes.get(inst.symbol);
            if (!q) return null;
            const changePct = (q.price - q.prevClose) / q.prevClose;
            const dirClass = changePct >= 0 ? "up" : "down";
            const arrow = changePct >= 0 ? "▲" : "▼";
            return (
              <tr
                key={inst.symbol}
                className={inst.symbol === selected ? "selected" : ""}
                onClick={() => onSelect(inst.symbol)}
              >
                <td>
                  <div className="sym">{inst.symbol}</div>
                  <div className="name">{inst.name}</div>
                </td>
                <td className="num">{formatPrice(q.price)}</td>
                <td className={`num ${dirClass}`}>
                  {arrow} {formatPct(changePct)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
