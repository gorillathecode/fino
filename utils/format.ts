// Format numbers as EUR currency, German style
export function formatEUR(amount: number, showSign = false): string {
  const formatted = new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(Math.round(amount)));

  if (showSign) {
    return `${amount < 0 ? '−' : '+'}${formatted} €`;
  }
  return `${formatted} €`;
}
