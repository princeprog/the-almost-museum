import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigationItems = [
  { href: "/museum", label: "Museum" },
  { href: "/exhibit/new", label: "New exhibit" },
  { href: "/settings", label: "Settings" },
];

export function MuseumShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <div aria-hidden="true" className="museum-paper-texture" />
      <div className="museum-shell relative z-10 min-h-dvh pt-3 sm:pt-5">
        <header className="site-header sticky top-0 z-50 mx-3 flex min-h-16 flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-landing-border bg-landing-card/95 px-4 py-3 text-landing-ink sm:mx-5 sm:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:px-8">
          <a
            className="skip-link order-first ml-auto min-h-11 py-3 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:text-foreground lg:col-start-3 lg:row-start-1 lg:justify-self-end"
            href="#app-root"
          >
            Skip to content
          </a>
          <Link
            className="wordmark order-first mr-auto inline-flex min-h-11 items-center gap-3 text-sm font-semibold tracking-tight no-underline sm:text-base lg:col-start-1 lg:row-start-1"
            href="/"
            aria-label="Almost Museum home"
          >
            <Image
              alt=""
              aria-hidden="true"
              className="size-8 rounded-lg object-contain"
              height={32}
              priority
              src="/brand/almost-museum-mark.png"
              width={32}
            />
            <span aria-hidden="true">Almost Museum</span>
          </Link>
          <nav
            className="primary-navigation order-last flex basis-full flex-wrap items-center gap-1 lg:col-start-2 lg:row-start-1 lg:basis-auto lg:flex-nowrap"
            aria-label="Primary navigation"
          >
            {navigationItems.map((item) => (
              <Link
                className={cn(
                  buttonVariants({ size: "sm", variant: "ghost" }),
                  "navigation-link min-h-11 px-3 text-xs font-medium normal-case lg:min-h-9",
                  item.href === "/museum" && "navigation-link--featured",
                )}
                href={item.href}
                key={item.href}
              >
                {item.label}
                {item.href === "/museum" ? <ExternalLink aria-hidden="true" data-icon="inline-end" /> : null}
              </Link>
            ))}
          </nav>
        </header>
        <div
          className="app-root mx-auto min-h-px max-w-[var(--content-width)] px-[var(--page-gutter)] py-[var(--space-8)] has-[>.landing-page]:max-w-none has-[>.landing-page]:px-3 has-[>.landing-page]:py-0 has-[>.museum-page]:max-w-none sm:has-[>.landing-page]:px-5 [&>main:not(.landing-page)]:max-w-[46rem] [&>main.museum-page]:max-w-none [&>main:has(.museum-collection)]:max-w-none"
          id="app-root"
          tabIndex={-1}
        >
          {children}
        </div>
      </div>
    </>
  );
}
