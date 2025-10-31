// utils/normalise.ts
export const trimAll = <T extends Record<string, any>>(obj: T): T => {
  const out: Record<string, any> = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string") out[k] = v.trim();
    else if (Array.isArray(v)) out[k] = v.map((x) => (typeof x === "string" ? x.trim() : x));
    else if (v && typeof v === "object") out[k] = trimAll(v);
    else out[k] = v;
  }
  return out as T;
};

export const normaliseEmail = (email: string) => email.trim().toLowerCase();

/**
 * Title-cases names while handling hyphens and apostrophes.
 * Examples:
 *  - "mary o’neill-jones" -> "Mary O’Neill-Jones"
 *  - "  jean   luc  " -> "Jean Luc"
 *  - "o'brien" -> "O'Brien"
 */
export const toTitleCaseName = (raw: string) => {
  const clean = raw.replace(/\s+/g, " ").trim().toLowerCase();
  if (!clean) return "";

  const cap = (s: string) => s ? s[0].toUpperCase() + s.slice(1) : s;

  // Split by space, then for each token handle hyphens and apostrophes
  return clean
    .split(" ")
    .map((token) => {
      // hyphen split
      const hyphenParts = token.split("-");
      const hyphenCased = hyphenParts
        .map((hp) => hp.split(/(['’])/)) // keep apostrophes as separators
        .map((parts) =>
          parts
            .map((p, i) => (i % 2 === 1 ? p : cap(p))) // cap the name parts, keep apostrophe characters
            .join("")
        )
        .map((p) => {
          // Common Irish/Scottish prefixes can look better with both letters capped
          // e.g. "mcgregor" -> "McGregor", "macdonald" -> "MacDonald"
          if (/^mc[a-z]/i.test(p)) return "Mc" + cap(p.slice(2));
          if (/^mac[a-z]/i.test(p)) return "Mac" + cap(p.slice(3));
          return p;
        })
        .join("-");
      return hyphenCased;
    })
    .join(" ");
};

// Converts a UK number to +44 E.164 format (basic version)
export function ukToE164(raw: string): string {
  if (!raw) return "";
  let digits = raw.replace(/[^\d]/g, "");

  // Remove leading 00
  if (digits.startsWith("00")) digits = digits.slice(2);

  // Replace leading 0 with +44
  if (digits.startsWith("0")) digits = `44${digits.slice(1)}`;

  // Add + if missing
  if (!digits.startsWith("44")) digits = `44${digits}`;

  return `+${digits}`;
}
