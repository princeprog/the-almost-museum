import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Circle,
  Clock3,
  Folder,
  Heart,
  History,
  Leaf,
  LockKeyhole,
  Pencil,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Sun,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { LandingReveal } from "@/components/landing-reveal";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type BenefitTone = "blue" | "cream";
type StatusTone = "blue" | "gray" | "lilac" | "sand";
type WorkflowTone = "blue" | "green" | "sand" | "lilac";

type Benefit = {
  title: string;
  description: string;
  icon: LucideIcon;
  tone: BenefitTone;
};

type ExhibitPreview = {
  category: string;
  number: string;
  title: string;
  description: string;
  status: string;
  statusTone: StatusTone;
  date: string;
  image: string;
  imageAlt: string;
};

type WorkflowStep = {
  number: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: WorkflowTone;
};

const iconToneClasses: Record<BenefitTone, string> = {
  blue: "bg-landing-blue-soft",
  cream: "bg-landing-cream",
};

const statusToneClasses: Record<StatusTone, string> = {
  blue: "bg-landing-blue-soft text-landing-muted",
  gray: "bg-landing-gray-soft text-landing-muted",
  lilac: "bg-landing-lilac text-landing-muted",
  sand: "bg-landing-sand text-landing-muted",
};

const workflowToneClasses: Record<WorkflowTone, string> = {
  blue: "bg-landing-blue-soft",
  green: "bg-landing-green-soft",
  sand: "bg-landing-sand",
  lilac: "bg-landing-lilac",
};

const benefits: Benefit[] = [
  {
    title: "Capture fragments",
    description: "Save drafts, notes, screenshots, files, and experiments exactly as they were.",
    icon: ScanLine,
    tone: "blue",
  },
  {
    title: "Preserve the story",
    description: "Keep the evidence, changes, and history behind work that almost existed.",
    icon: Clock3,
    tone: "blue",
  },
  {
    title: "Private & local-first",
    description: "No accounts, no social pressure, and no cloud storage required.",
    icon: LockKeyhole,
    tone: "cream",
  },
  {
    title: "Return when ready",
    description: "Revisit abandoned ideas later and decide what to do next.",
    icon: History,
    tone: "cream",
  },
];

const exhibits: ExhibitPreview[] = [
  {
    category: "Product concept",
    number: "#0021",
    title: "Focus Timer",
    description: "A minimal hardware timer that helps you focus without distractions.",
    status: "Unfinished",
    statusTone: "sand",
    date: "May 8, 2024",
    image: "/landing/focus-timer.png",
    imageAlt: "Black Focus Timer concept with two silver controls",
  },
  {
    category: "Web app",
    number: "#0175",
    title: "Studio Dashboard",
    description: "Internal tool for tracking projects, capacity, and team bandwidth.",
    status: "On Hold",
    statusTone: "blue",
    date: "Apr 22, 2024",
    image: "/landing/studio-dashboard.png",
    imageAlt: "Studio Dashboard interface showing charts and project metrics",
  },
  {
    category: "Experiment",
    number: "#0488",
    title: "Light Refraction Study",
    description: "Exploring how light, material, and space interact.",
    status: "Draft",
    statusTone: "lilac",
    date: "Feb 11, 2024",
    image: "/landing/light-refraction.png",
    imageAlt: "Faceted translucent form from the Light Refraction Study",
  },
  {
    category: "Branding",
    number: "#0310",
    title: "Verda Brand Exploration",
    description: "Early directions for a sustainable home goods brand.",
    status: "Unfinished",
    statusTone: "sand",
    date: "Jan 30, 2024",
    image: "/landing/verda-brand.png",
    imageAlt: "Verda sustainable home goods brand mood board",
  },
  {
    category: "Research",
    number: "#0062",
    title: "Data Visualization Exploration",
    description: "Testing ways to reveal patterns in complex datasets.",
    status: "Abandoned",
    statusTone: "gray",
    date: "Nov 3, 2023",
    image: "/landing/data-visualization.png",
    imageAlt: "Dark data visualization made from a field of plotted points",
  },
];

const workflow: WorkflowStep[] = [
  {
    number: "1",
    title: "Create an exhibit",
    description: "Start with an idea, a file, a note, or a fragment of something.",
    icon: Pencil,
    tone: "blue",
  },
  {
    number: "2",
    title: "Add the pieces",
    description: "Collect screenshots, files, links, sketches, notes—whatever matters.",
    icon: Folder,
    tone: "green",
  },
  {
    number: "3",
    title: "Tell the story",
    description: "Add context, decisions, changes, and the story behind your work.",
    icon: BookOpen,
    tone: "sand",
  },
  {
    number: "4",
    title: "Come back later",
    description: "Revisit, reflect, revive, or let it rest. You’re always in control.",
    icon: Sparkles,
    tone: "lilac",
  },
];

const values = [
  {
    title: "Truly private",
    description: "Nothing leaves your device. You own your data.",
    icon: ShieldCheck,
  },
  {
    title: "Lightweight & fast",
    description: "Built to be simple, fast, and out of your way.",
    icon: Leaf,
  },
  {
    title: "Made for makers",
    description: "For designers, builders, writers, and dreamers.",
    icon: Heart,
  },
  {
    title: "No pressure",
    description: "There are no metrics here. Just your work, on your terms.",
    icon: Sun,
  },
];

const trackClasses =
  "snap-x snap-proximity touch-pan-x overscroll-x-contain overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

function HeroSection() {
  return (
    <section
      className="grid min-h-svh overflow-hidden bg-landing-hero md:grid-cols-[minmax(0,44%)_minmax(0,56%)]"
      aria-labelledby="landing-title"
    >
      <div className="landing-motion-up z-10 flex flex-col justify-center px-6 py-12 sm:px-10 md:px-8 md:py-16 lg:pl-[clamp(3rem,5vw,6rem)]">
        <p className="mb-6 flex items-center gap-2 text-xs font-medium text-landing-ink sm:text-sm">
          <Circle aria-hidden="true" className="size-2 fill-current text-landing-accent" />
          A private archive for the in-between
        </p>
        <h1
          className="mb-6 max-w-[12em] font-sans text-[clamp(2.5rem,10vw,3.25rem)] leading-[1.08] font-semibold tracking-[-0.045em] text-landing-ink md:text-[clamp(2.75rem,3.6vw,4.25rem)]"
          id="landing-title"
        >
          Give unfinished work a place to live.
        </h1>
        <p className="mb-7 max-w-lg text-sm leading-7 text-landing-muted sm:text-base">
          Almost Museum is a private, local-first digital museum for unfinished ideas, abandoned projects,
          experiments, drafts, and things that almost existed.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            className={cn(buttonVariants({ size: "lg" }), "min-h-11 rounded-lg px-5 normal-case")}
            href="/museum"
          >
            Enter the Museum
            <ArrowRight aria-hidden="true" data-icon="inline-end" />
          </Link>
          <Link
            className={cn(buttonVariants({ size: "lg", variant: "ghost" }), "min-h-11 normal-case")}
            href="#how-it-works"
          >
            Learn more
            <ChevronRight aria-hidden="true" data-icon="inline-end" />
          </Link>
        </div>
        <div className="mt-9 flex items-start gap-3 text-landing-ink">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 stroke-[1.8]" />
          <p className="grid gap-1 text-xs leading-5 text-landing-muted">
            <strong className="font-semibold text-landing-ink">Local-first. Always private.</strong>
            <span>Your museum lives on your device.</span>
          </p>
        </div>
      </div>
      <div className="relative min-h-[19rem] sm:min-h-[27rem] md:min-h-full">
        <Image
          alt="A layered architectural exhibit for Modular Shelter Study with sketches, material samples, versions, and curator notes"
          className="landing-motion-art object-contain object-center"
          fill
          priority
          sizes="(max-width: 767px) 100vw, 59vw"
          src="/landing/hero-exhibit-composition.png"
        />
      </div>
    </section>
  );
}

function BenefitStrip() {
  return (
    <section
      className="landing-motion-stagger grid grid-cols-2 border-y bg-landing-card px-3 py-4 sm:px-6 lg:grid-cols-4 lg:px-10 lg:py-6"
      aria-label="Why preserve unfinished work"
    >
      {benefits.map(({ title, description, icon: Icon, tone }, index) => (
        <div className="relative" key={title}>
          <article className="grid h-full content-start grid-cols-[2.5rem_1fr] gap-3 px-3 py-4 lg:px-6">
            <span
              className={cn(
                "flex size-10 items-center justify-center rounded-lg border text-landing-ink",
                iconToneClasses[tone],
              )}
            >
              <Icon aria-hidden="true" className="size-5 stroke-[1.65]" />
            </span>
            <div>
              <h2 className="mb-2 font-sans text-sm font-semibold tracking-tight text-landing-ink">{title}</h2>
              <p className="text-xs leading-5 text-landing-muted">{description}</p>
            </div>
          </article>
          {index < benefits.length - 1 ? (
            <Separator className="absolute top-3 right-0 hidden h-[calc(100%-1.5rem)] lg:block" orientation="vertical" />
          ) : null}
          {index < 2 ? <Separator className="absolute right-3 bottom-0 left-3 lg:hidden" /> : null}
        </div>
      ))}
    </section>
  );
}

function ExhibitGallery() {
  return (
    <section
      className="flex min-h-0 flex-1 flex-col bg-landing-gallery px-4 py-8 sm:px-8 lg:px-10 lg:py-10"
      aria-labelledby="exhibit-showcase-title"
    >
      <div className="mb-7 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="mb-2 font-sans text-[clamp(1.75rem,3vw,2.5rem)] leading-tight font-semibold tracking-tight text-landing-ink" id="exhibit-showcase-title">
            Your museum. Your way.
          </h2>
          <p className="max-w-xl text-sm leading-6 text-landing-muted">
            Organize exhibits your way. Every project has a home, its story, and everything that made it what it was.
          </p>
        </div>
        <Link
          className={cn(buttonVariants({ size: "lg", variant: "outline" }), "min-h-11 shrink-0 rounded-lg px-5 normal-case")}
          href="/museum"
        >
          View all exhibits
          <ArrowRight aria-hidden="true" data-icon="inline-end" />
        </Link>
      </div>
      <div
        className={cn(
          trackClasses,
          "landing-motion-stagger relative grid flex-1 auto-cols-[minmax(16rem,78vw)] grid-flow-col items-stretch gap-4 pb-3 sm:auto-cols-[20rem] xl:grid-flow-row xl:auto-cols-auto xl:grid-cols-5 xl:overflow-visible xl:pb-0",
        )}
        data-testid="exhibit-track"
      >
        {exhibits.map((exhibit) => (
          <Card className="h-full min-h-[27rem] min-w-0 snap-start py-3 transition-shadow duration-300 ease-out hover:shadow-md xl:min-h-0" key={exhibit.number}>
            <CardHeader className="gap-0 px-3">
              <CardDescription className="text-[0.65rem] font-medium tracking-wide text-landing-muted uppercase">
                {exhibit.category}
              </CardDescription>
              <CardAction className="text-[0.65rem] font-medium tracking-wide text-landing-muted">{exhibit.number}</CardAction>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4 px-3">
              <div className="relative aspect-[1.15] min-h-40 overflow-hidden rounded-lg bg-landing-image">
                <Image
                  alt={exhibit.imageAlt}
                  className="object-cover"
                  fill
                  sizes="(max-width: 1279px) 78vw, 18vw"
                  src={exhibit.image}
                />
              </div>
              <div className="grid gap-2">
                <CardTitle className="text-base font-semibold tracking-tight">{exhibit.title}</CardTitle>
                <CardDescription className="text-xs leading-5">{exhibit.description}</CardDescription>
              </div>
            </CardContent>
            <CardFooter className="justify-between border-0 bg-transparent px-3 pt-0 pb-3">
              <Badge className={cn("border-0", statusToneClasses[exhibit.statusTone])} variant="secondary">
                {exhibit.status}
              </Badge>
              <time className="text-[0.65rem] text-landing-muted">{exhibit.date}</time>
            </CardFooter>
          </Card>
        ))}
        <Link
          aria-label="View more exhibits"
          className={cn(
            buttonVariants({ size: "icon-lg", variant: "outline" }),
            "absolute top-1/2 right-2 hidden -translate-y-1/2 rounded-full bg-landing-card xl:inline-flex",
          )}
          href="/museum"
        >
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section
      className="grid flex-1 items-center gap-10 bg-landing-card px-5 py-10 sm:px-8 lg:grid-cols-[minmax(14rem,28%)_minmax(0,72%)] lg:px-10 lg:py-14"
      id="how-it-works"
      aria-labelledby="how-it-works-title"
    >
      <div>
        <p className="mb-4 text-xs font-medium tracking-widest text-landing-muted uppercase">Simple by design</p>
        <h2 className="mb-3 font-sans text-[clamp(1.75rem,3vw,2.75rem)] leading-tight font-semibold tracking-tight text-landing-ink" id="how-it-works-title">
          A calm space for unfinished things.
        </h2>
        <p className="mb-4 max-w-sm text-sm leading-6 text-landing-muted">
          Almost Museum is built for reflection, not performance. A quiet place to park ideas without pressure or expiration dates.
        </p>
        <Image
          alt="A minimal museum room with an arched artwork, bench, and plant"
          className="h-auto w-full max-w-64 object-contain"
          height={85}
          src="/landing/workflow-illustration.png"
          width={200}
        />
      </div>
      <ol
        className={cn(
          trackClasses,
          "landing-motion-stagger relative grid list-none auto-cols-[minmax(12rem,74vw)] grid-flow-col gap-4 pb-3 sm:auto-cols-[minmax(12rem,42vw)] lg:grid-flow-row lg:grid-cols-4 lg:gap-0 lg:overflow-visible lg:pb-0 before:absolute before:top-10 before:right-[9%] before:left-[9%] before:hidden before:border-t before:border-dashed before:border-landing-line lg:before:block",
        )}
        data-testid="workflow-track"
      >
        {workflow.map(({ number, title, description, icon: Icon, tone }) => (
          <li className="relative snap-start rounded-xl border bg-landing-gallery p-5 text-center lg:border-0 lg:bg-transparent lg:px-3 lg:py-0" key={number}>
            <div
              className={cn(
                "relative z-10 mx-auto flex size-20 items-center justify-center rounded-full border text-landing-ink",
                workflowToneClasses[tone],
              )}
            >
              <Icon aria-hidden="true" className="size-8 stroke-[1.45]" />
            </div>
            <span className="relative z-10 mx-auto mt-2 mb-4 flex size-5 items-center justify-center rounded-full border bg-landing-card text-[0.65rem] text-landing-muted">
              {number}
            </span>
            <h3 className="mb-2 font-sans text-sm font-semibold tracking-tight text-landing-ink">{title}</h3>
            <p className="mx-auto max-w-40 text-xs leading-5 text-landing-muted">{description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ValueStrip() {
  return (
    <section
      className={cn(
        trackClasses,
        "landing-motion-stagger mx-3 grid auto-cols-[minmax(15rem,78vw)] grid-flow-col rounded-xl bg-landing-values px-3 py-4 sm:mx-6 sm:auto-cols-[minmax(15rem,58vw)] lg:mx-10 lg:grid-flow-row lg:grid-cols-4 lg:overflow-visible lg:px-6 lg:py-6",
      )}
      data-testid="value-track"
      aria-label="Almost Museum values"
    >
      {values.map(({ title, description, icon: Icon }, index) => (
        <div className="relative snap-start" key={title}>
          <article className="grid h-full grid-cols-[2rem_1fr] gap-3 px-4 py-3 lg:px-6">
            <Icon aria-hidden="true" className="size-6 stroke-[1.45] text-landing-ink" />
            <div>
              <h2 className="mb-2 font-sans text-sm font-semibold tracking-tight text-landing-ink">{title}</h2>
              <p className="text-xs leading-5 text-landing-muted">{description}</p>
            </div>
          </article>
          {index < values.length - 1 ? (
            <Separator className="absolute top-2 right-0 hidden h-[calc(100%-1rem)] lg:block" orientation="vertical" />
          ) : null}
        </div>
      ))}
    </section>
  );
}

function ClosingCallToAction() {
  return (
    <section className="landing-motion-up relative mx-3 min-h-[calc(100svh-5rem)] flex-1 overflow-hidden rounded-xl bg-landing-dark sm:mx-6 lg:mx-10" aria-labelledby="closing-cta-title">
      <Image alt="" aria-hidden="true" className="object-cover object-[62%_center] sm:object-center" fill sizes="100vw" src="/landing/closing-doorway.png" />
      <div className="relative z-10 flex min-h-[calc(100svh-5rem)] flex-col items-start justify-center px-6 py-12 text-landing-on-dark sm:px-12 lg:px-16">
        <h2 className="mb-4 max-w-[15ch] font-sans text-[clamp(2.25rem,5vw,4.25rem)] leading-[1.08] font-semibold tracking-tight" id="closing-cta-title">
          Save the work worth remembering.
        </h2>
        <p className="mb-6 text-sm leading-6 text-landing-on-dark/85 sm:text-base">
          Almost everything starts somewhere.<br />Give it a home before it disappears.
        </p>
        <Link
          className={cn(
            buttonVariants({ size: "lg" }),
            "min-h-11 rounded-lg bg-landing-cta px-5 text-landing-dark normal-case hover:bg-landing-on-dark",
          )}
          href="/museum"
        >
          Enter the Museum
          <ArrowRight aria-hidden="true" data-icon="inline-end" />
        </Link>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="grid min-h-16 grid-cols-[auto_1fr] items-center gap-3 px-5 py-4 text-landing-muted sm:grid-cols-[1fr_auto_1fr] sm:px-8">
      <Image alt="Almost Museum" className="size-6 rounded-md object-contain" height={24} src="/brand/almost-museum-mark.png" width={24} />
      <p className="text-xs sm:text-center">Almost Museum is a local-first application. No accounts. No cloud. Just you and your work.</p>
      <p className="col-start-2 text-xs sm:col-start-auto sm:justify-self-end">© 2024 Almost Museum</p>
    </footer>
  );
}

export function MarketingLanding() {
  return (
    <main className="landing-page marketing-theme w-full max-w-none overflow-x-clip bg-landing-surface text-landing-ink">
      <LandingReveal className="landing-screen min-h-svh scroll-mt-24 lg:snap-start">
        <HeroSection />
      </LandingReveal>
      <LandingReveal className="landing-screen flex min-h-svh scroll-mt-4 flex-col bg-landing-gallery lg:snap-start">
        <BenefitStrip />
        <ExhibitGallery />
      </LandingReveal>
      <LandingReveal className="landing-screen flex min-h-svh scroll-mt-4 flex-col gap-8 bg-landing-card py-6 lg:snap-start">
        <HowItWorks />
        <ValueStrip />
      </LandingReveal>
      <LandingReveal className="landing-screen flex min-h-svh scroll-mt-4 flex-col bg-landing-surface pt-4 lg:snap-start">
        <ClosingCallToAction />
        <LandingFooter />
      </LandingReveal>
    </main>
  );
}
