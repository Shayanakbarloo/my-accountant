export function money(amount) {
  return "$" + Math.round(amount || 0).toLocaleString("en-US");
}