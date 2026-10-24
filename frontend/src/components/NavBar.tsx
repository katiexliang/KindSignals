// Primary navigation. Horizontal on all sizes; wraps/scrolls on small screens.
// Active item gets a soft sage rounded highlight. Signals lives in the floating
// helper (bottom-right), not in the nav.

import { NavLink } from "react-router-dom";

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

const links: NavItem[] = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/journal", label: "Journal" },
  { to: "/signals", label: "Signals" },
  { to: "/profile", label: "Profile" },
];

export function NavBar() {
  return (
    <nav className="flex items-center gap-1 overflow-x-auto">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) =>
            `nav-link whitespace-nowrap ${isActive ? "nav-link-active" : ""}`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
