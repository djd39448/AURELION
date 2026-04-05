/**
 * @module hooks/use-mobile
 * @description Custom hook that detects whether the current viewport is
 * at or below the mobile breakpoint (768px). Uses `window.matchMedia`
 * for efficient, event-driven updates rather than polling or resize listeners.
 */

import * as React from "react"

/** Breakpoint width in pixels. Viewports narrower than this are considered mobile. */
const MOBILE_BREAKPOINT = 768

/**
 * useIsMobile — reactive mobile viewport detector.
 *
 * On mount, creates a `matchMedia` query for `(max-width: 767px)` and
 * listens for changes. Returns `true` when the viewport is mobile-width,
 * `false` otherwise. On the initial server/pre-hydration render the value
 * is `undefined` (coerced to `false` by the `!!` cast).
 *
 * @returns `true` if the viewport width is below {@link MOBILE_BREAKPOINT}, `false` otherwise.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Create a MediaQueryList matching viewports narrower than the breakpoint
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    // Subscribe to viewport changes
    mql.addEventListener("change", onChange)
    // Set the initial value synchronously
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    // Cleanup: unsubscribe on unmount
    return () => mql.removeEventListener("change", onChange)
  }, [])

  // Coerce undefined (pre-mount) to false
  return !!isMobile
}
