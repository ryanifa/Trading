import { useStore } from "../lib/store";
import { formatEur, formatPrice, formatQty, formatTime } from "../lib/format";

export function OrderHistory() {
  const { portfolio } = useStore();
  const orders = portfolio.orders.slice(0, 30);

  return (
    <div className="card">
      <h2>Orderhistorie</h2>
      {orders.length === 0 ? (
        <div className="empty">Nog geen orders geplaatst.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Tijd</th>
              <th>Type</th>
              <th>Fonds</th>
              <th className="num">Aantal</th>
              <th className="num">Koers</th>
              <th className="num">Totaal</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{formatTime(o.t)}</td>
                <td>
                  <span className={`badge ${o.side}`}>
                    {o.side === "buy" ? "Koop" : "Verkoop"}
                  </span>
                </td>
                <td className="sym">{o.symbol}</td>
                <td className="num">{formatQty(o.qty)}</td>
                <td className="num">{formatPrice(o.price)}</td>
                <td className="num">{formatEur(o.qty * o.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
