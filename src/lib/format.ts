const eur = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const eurPrecise = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

const pct = new Intl.NumberFormat("nl-NL", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "always",
});

const qtyFmt = new Intl.NumberFormat("nl-NL", {
  maximumFractionDigits: 4,
});

export function formatEur(value: number): string {
  return eur.format(value);
}

export function formatPrice(value: number): string {
  return value < 1 ? eurPrecise.format(value) : eur.format(value);
}

export function formatPct(fraction: number): string {
  return pct.format(fraction);
}

export function formatQty(value: number): string {
  return qtyFmt.format(value);
}

export function formatTime(t: number): string {
  return new Date(t).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
