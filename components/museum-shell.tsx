import Link from "next/link";
import type { ReactNode } from "react";

const navigationItems = [
  { href: "/museum", label: "Museum" },
  { href: "/exhibit/new", label: "New exhibit" },
  { href: "/settings", label: "Settings" },
];

export function MuseumShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <div aria-hidden="true" className="museum-paper-texture" />
      <div className="museum-shell">
        <a className="skip-link" href="#app-root">
          Skip to content
        </a>
        <header className="site-header">
          <Link className="wordmark" href="/" aria-label="Almost Museum home">
            <span aria-hidden="true">Almost</span>
            <span className="wordmark-label">Museum</span>
          </Link>
          <nav className="primary-navigation" aria-label="Primary navigation">
            {navigationItems.map((item) => (
              <Link
                className={`navigation-link${item.href === "/museum" ? " navigation-link--featured" : ""}`}
                href={item.href}
                key={item.href}
              >
                {item.label}{item.href === "/museum" ? <span aria-hidden="true">↗</span> : null}
              </Link>
            ))}
          </nav>
        </header>
        <div className="app-root" id="app-root" tabIndex={-1}>
          {children}
        </div>
      </div>
    </>
  );
}
