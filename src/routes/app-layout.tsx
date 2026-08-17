import { Newspaper } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { ThemeToggle } from "~/components/theme-toggle";
import { cn } from "~/lib/utils";

type NavItem = {
  to: string;
  label: string;
};

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Discover" },
  { to: "/feed", label: "My feed" },
];

/**
 * The header is sticky at every breakpoint, so its height has to be fixed and
 * known: anything else that sticks — the feed's filter bar — must offset by
 * exactly this much or the two overlap at `top-0`. `border-box` sizing means
 * `h-14` already includes the bottom border, so the offset matches precisely.
 */
const HEADER_HEIGHT_CLASS = "h-14";

/** Apply to any other sticky element so it parks directly under the header. */
export const STICKY_BELOW_HEADER_CLASS = "top-14";

export function AppLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      {/* Solid background rather than a translucent blur: virtualized rows
          scroll underneath and must not show through. z-40 keeps the header
          above the feed but below Radix overlays, which portal at z-50. */}
      <header
        className={cn(
          "sticky top-0 z-40 border-b border-border bg-background",
          HEADER_HEIGHT_CLASS,
        )}
      >
        <div className="mx-auto flex h-full w-full max-w-3xl items-center gap-4 px-4">
          <NavLink to="/" className="flex items-center gap-2 font-semibold">
            <Newspaper className="size-5" />
            <span>News</span>
          </NavLink>

          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
