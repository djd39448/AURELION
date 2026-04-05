/**
 * @module lib/utils
 * @description Shared utility helpers for the AURELION frontend.
 * Currently provides the `cn()` class-name merging utility used across
 * every shadcn/ui component and custom component in the project.
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merge and de-duplicate Tailwind CSS class names.
 *
 * Combines `clsx` (conditional class joining) with `tailwind-merge`
 * (intelligent deduplication of conflicting Tailwind utilities like
 * `p-2 p-4` -> `p-4`).
 *
 * @param inputs - Any number of class values (strings, arrays, objects, falsy values).
 * @returns A single, deduplicated class string safe for the `className` prop.
 *
 * @example
 * cn("px-4 py-2", isActive && "bg-primary", "px-6")
 * // => "py-2 bg-primary px-6"  (px-4 merged away by px-6)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
