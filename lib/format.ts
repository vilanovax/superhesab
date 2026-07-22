export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("fa-IR").format(amount);
}

export function formatDateFa(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function memberLabel(user: {
  name: string | null;
  phone: string;
}): string {
  return user.name?.trim() || user.phone;
}
