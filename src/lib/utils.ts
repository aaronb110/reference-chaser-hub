import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
// Re-export normalisers so other files can import from '@/lib/utils'
export { trimAll, toTitleCaseName, normaliseEmail, ukToE164 } from '@/utils/normalise';
