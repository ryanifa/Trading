import { FormEvent, useState } from "react";
import { OrderSide } from "../types";
import { useStore } from "../lib/store";
import { formatEur, formatQty } from "../lib/format";

export function TradePanel({ symbol }: { symbol: string }) {
  const { quotes, portfolio, placeOrder } = useStore();
  const [side, setSide] = useState<OrderSide>("buy");
  const [qtyInput, setQtyInput] = useState("1");
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const quote = quotes.get(symbol);
  if (!quote) return null;

  const qty = Number(qtyInput.replace(",", "."));
  const total = Number.isFinite(qty) && qty > 0 ? qty * quote.price : 0;
  const position = portfolio.positions[symbol];

  function submit(e: FormEvent) {
    e.preventDefault();
    const error = placeOrder(symbol, side, qty);
    if (error) {
      setFeedback({ ok: false, msg: error });
    } else {
      setFeedback({
        ok: true,
        msg: `${side === "buy" ? "Gekocht" : "Verkocht"}: ${formatQty(qty)} × ${symbol}`,
      });
    }
  }

  return (
    <div className="card">
      <h2>Order plaatsen</h2>
      <form className="trade-form" onSubmit={submit}>
        <div className="side-row" role="group" aria-label="Ordertype">
          <button
            type="button"
            className={side === "buy" ? "active-buy" : ""}
            onClick={() => setSide("buy")}
          >
            Kopen
          </button>
          <button
            type="button"
            className={side === "sell" ? "active-sell" : ""}
            onClick={() => setSide("sell")}
          >
            Verkopen
          </button>
        </div>

        <label>
          Aantal
          <input
            type="number"
            min="0"
            step="any"
            value={qtyInput}
            onChange={(e) => {
              setQtyInput(e.target.value);
              setFeedback(null);
            }}
          />
        </label>

        <div className="order-total">
          Geschatte waarde: <strong>{formatEur(total)}</strong>
          <br />
          Beschikbaar saldo: {formatEur(portfolio.cash)}
          {position && (
            <>
              <br />
              In bezit: {formatQty(position.qty)} stuks
            </>
          )}
        </div>

        <button className="submit-btn" type="submit" disabled={!(qty > 0)}>
          {side === "buy" ? "Koop" : "Verkoop"} {symbol}
        </button>

        {feedback && (
          <div className={feedback.ok ? "form-ok" : "form-error"} role="status">
            {feedback.msg}
          </div>
        )}
      </form>
    </div>
  );
}
