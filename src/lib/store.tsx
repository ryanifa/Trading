import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Order, OrderSide, PortfolioState, Quote } from "../types";
import { createQuotes, tickQuotes, TICK_MS } from "./priceEngine";

const STORAGE_KEY = "tradr-portfolio-v1";
export const START_CASH = 100_000;

function loadPortfolio(): PortfolioState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PortfolioState;
      if (typeof parsed.cash === "number" && parsed.positions && parsed.orders) {
        return parsed;
      }
    }
  } catch {
    // corrupte opslag: begin opnieuw
  }
  return { cash: START_CASH, positions: {}, orders: [] };
}

interface StoreValue {
  quotes: Map<string, Quote>;
  portfolio: PortfolioState;
  placeOrder: (symbol: string, side: OrderSide, qty: number) => string | null;
  resetPortfolio: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [quotes, setQuotes] = useState(() => createQuotes());
  const [portfolio, setPortfolio] = useState(loadPortfolio);

  useEffect(() => {
    const id = setInterval(() => setQuotes((q) => tickQuotes(q)), TICK_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio));
  }, [portfolio]);

  const placeOrder = useCallback(
    (symbol: string, side: OrderSide, qty: number): string | null => {
      const quote = quotes.get(symbol);
      if (!quote) return "Onbekend instrument.";
      if (!Number.isFinite(qty) || qty <= 0) return "Voer een geldig aantal in.";

      const price = quote.price;
      const total = qty * price;
      let error: string | null = null;

      setPortfolio((prev) => {
        const pos = prev.positions[symbol];
        if (side === "buy" && total > prev.cash + 1e-9) {
          error = "Onvoldoende saldo voor deze order.";
          return prev;
        }
        if (side === "sell" && (!pos || pos.qty < qty - 1e-9)) {
          error = "Je hebt niet genoeg stukken om te verkopen.";
          return prev;
        }

        const order: Order = {
          id: crypto.randomUUID(),
          t: Date.now(),
          symbol,
          side,
          qty,
          price,
        };

        const positions = { ...prev.positions };
        if (side === "buy") {
          const prevQty = pos?.qty ?? 0;
          const prevAvg = pos?.avgPrice ?? 0;
          const newQty = prevQty + qty;
          positions[symbol] = {
            symbol,
            qty: newQty,
            avgPrice: (prevQty * prevAvg + total) / newQty,
          };
        } else {
          const newQty = (pos?.qty ?? 0) - qty;
          if (newQty <= 1e-9) delete positions[symbol];
          else positions[symbol] = { ...pos!, qty: newQty };
        }

        return {
          cash: side === "buy" ? prev.cash - total : prev.cash + total,
          positions,
          orders: [order, ...prev.orders].slice(0, 200),
        };
      });

      return error;
    },
    [quotes]
  );

  const resetPortfolio = useCallback(() => {
    setPortfolio({ cash: START_CASH, positions: {}, orders: [] });
  }, []);

  const value = useMemo(
    () => ({ quotes, portfolio, placeOrder, resetPortfolio }),
    [quotes, portfolio, placeOrder, resetPortfolio]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore buiten StoreProvider gebruikt");
  return ctx;
}
