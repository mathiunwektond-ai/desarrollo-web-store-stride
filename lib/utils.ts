export function formatMoney(n: number | string | null | undefined): string {
  const num = Number(n);
  if (!Number.isFinite(num)) return "S/ 0.00";
  return "S/ " + num.toFixed(2);
}

export function formatKg(n: number | string | null | undefined): string {
  const num = Number(n);
  if (!Number.isFinite(num)) return "0";
  return Number.isInteger(num) ? String(num) : num.toFixed(3);
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function todayLocalISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function startOfToday(): string {
  return todayLocalISO();
}
