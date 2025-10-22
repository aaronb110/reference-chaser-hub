// src/lib/utils.ts
// 🧰 Refevo Utility Functions

/** Trim whitespace from all string properties in an object */
export function trimAll<T extends Record<string, any>>(obj: T): T {
  const result: Record<string, any> = {};
  for (const key in obj) {
    const value = obj[key];
    result[key] = typeof value === "string" ? value.trim() : value;
  }
  return result as T;
}

/** Convert a name into title case (e.g. "john SMITH" -> "John Smith") */
export function toTitleCaseName(str: string): string {
  return str.replace(/\w\S*/g, (txt) =>
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

/** Convert an email to lowercase and trimmed */
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Convert UK mobile number (07xxxxxxxxx) to +447xxxxxxxxx format */
export function ukToE164(mobile: string): string {
  if (!mobile) return mobile;
  const cleaned = mobile.replace(/\s+/g, "");
  if (cleaned.startsWith("+44")) return cleaned;
  if (cleaned.startsWith("0")) return "+44" + cleaned.slice(1);
  return cleaned;
}
