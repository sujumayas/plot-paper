/** Only same-site relative paths are allowed as redirect targets. */
export function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/build";
  return next;
}
