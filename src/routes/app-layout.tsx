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

export function AppLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-4 px-4 py-3">
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
