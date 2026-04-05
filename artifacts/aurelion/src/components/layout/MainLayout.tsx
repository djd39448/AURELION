/**
 * @module components/layout/MainLayout
 * @description Shared page shell that wraps every route. Provides the
 * persistent Navbar (fixed top), a flex-grow main content area, and the Footer.
 *
 * The `pt-20` on `<main>` offsets for the fixed-position Navbar height (h-20 / 80px).
 * Uses `min-h-[100dvh]` for proper full-height layout on mobile browsers that
 * have dynamic viewport units (e.g. Safari address bar).
 */

import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

/**
 * MainLayout component — structural wrapper for all pages.
 *
 * @param children - The routed page component rendered inside `<main>`.
 */
export function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans selection:bg-primary/30 selection:text-primary-foreground">
      {/* Fixed-position top navigation bar */}
      <Navbar />
      {/* Main content area; pt-20 compensates for the 80px fixed Navbar */}
      <main className="flex-1 pt-20 flex flex-col w-full">
        {children}
      </main>
      {/* Site-wide footer with navigation links and legal */}
      <Footer />
    </div>
  );
}
