/**
 * @component Breadcrumbs
 * @description Navigation breadcrumb trail for deep pages. Helps users
 * understand their location in the site hierarchy and navigate back without
 * relying on the browser back button.
 *
 * Uses Home icon as the root, with chevron separators between items.
 * The last item is rendered as plain text (current page), all others as links.
 *
 * @example
 * <Breadcrumbs items={[
 *   { label: "Activities", href: "/activities" },
 *   { label: "Ocean Exploration", href: "/activities?category=Ocean" },
 *   { label: "Snorkeling Tour" }
 * ]} />
 */

import { Link } from "wouter";
import { ChevronRight, Home } from "lucide-react";
import { Fragment } from "react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  /** Whether to show the Home icon as the first breadcrumb. Defaults to true. */
  showHome?: boolean;
}

export function Breadcrumbs({ items, showHome = true }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center gap-2 text-sm mb-6 overflow-x-auto">
      {showHome && (
        <>
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <Home className="w-4 h-4" />
          </Link>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </>
      )}

      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <Fragment key={index}>
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-muted-foreground hover:text-foreground transition-colors truncate"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground font-serif truncate">
                {item.label}
              </span>
            )}

            {!isLast && (
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
