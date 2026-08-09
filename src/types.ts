export interface Instrument {
  symbol: string;
  name: string;
  startPrice: number;
  volatility: number; // jaarlijkse volatiliteit, bv. 0.35
  drift: number; // jaarlijkse drift, bv. 0.06
}

export interface PricePoint {
  t: number; // unix ms
  p: number;
}

export interface Quote {
  symbol: string;
  price: number;
  prevClose: number;
  history: PricePoint[];
}

export interface Position {
  symbol: string;
  qty: number;
  avgPrice: number;
}

export type OrderSide = "buy" | "sell";

export interface Order {
  id: string;
  t: number;
  symbol: string;
  side: OrderSide;
  qty: number;
  price: number;
}

export interface PortfolioState {
  cash: number;
  positions: Record<string, Position>;
  orders: Order[];
}
