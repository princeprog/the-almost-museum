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
  GalleryVerticalEnd,
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

import { Button } from "@/components/ui/button";

type Benefit = {
  title: string;
  description: string;
  icon: LucideIcon;
  tone: "blue" | "cream";
};

type ExhibitPreview = {
  category: string;
  number: string;
  title: string;
  description: string;
  status: string;
  statusTone: "blue" | "gray" | "lilac" | "sand";
  date: string;
  image: string;
};

type WorkflowStep = {
  number: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: "blue" | "green" | "sand" | "lilac";
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

function HeroSection() {
  return (
    <section className="marketing-hero" aria-labelledby="landing-title">
      <div className="marketing-hero__copy">
        <p className="marketing-kicker">
          <Circle aria-hidden="true" fill="currentColor" />
          A private archive for the in-between
        </p>
        <h1 aria-label="Give unfinished work a place to live." id="landing-title">
          <span>Give unfinished</span>
          <span>work a place to live.</span>
        </h1>
        <p className="marketing-hero__lede">
          Almost Museum is a private, local-first digital museum for unfinished ideas, abandoned projects,
          experiments, drafts, and things that almost existed.
        </p>
        <div className="marketing-hero__actions">
          <Button asChild className="marketing-primary-action">
            <Link href="/museum">Enter the Museum <ArrowRight aria-hidden="true" /></Link>
          </Button>
          <Link className="marketing-text-action" href="#how-it-works">
            Learn more <ChevronRight aria-hidden="true" />
          </Link>
        </div>
        <div className="marketing-hero__privacy">
          <ShieldCheck aria-hidden="true" />
          <p><strong>Local-first. Always private.</strong><span>Your museum lives on your device.</span></p>
        </div>
      </div>
      <div className="marketing-hero__visual">
        <Image
          alt="A layered architectural exhibit for Modular Shelter Study with sketches, material samples, versions, and curator notes"
          fill
          priority
          sizes="(max-width: 760px) 100vw, 58vw"
          src="/landing/hero-exhibit-composition.png"
        />
      </div>
    </section>
  );
}

function BenefitStrip() {
  return (
    <section className="benefit-strip" aria-label="Why preserve unfinished work">
      {benefits.map(({ title, description, icon: Icon, tone }) => (
        <article className="benefit-strip__item" key={title}>
          <span className={`marketing-icon marketing-icon--${tone}`}><Icon aria-hidden="true" /></span>
          <div><h2>{title}</h2><p>{description}</p></div>
        </article>
      ))}
    </section>
  );
}

function ExhibitGallery() {
  return (
    <section className="exhibit-showcase" aria-labelledby="exhibit-showcase-title">
      <div className="exhibit-showcase__header">
        <div>
          <h2 id="exhibit-showcase-title">Your museum. Your way.</h2>
          <p>Organize exhibits your way. Every project has a home, its story, and everything that made it what it was.</p>
        </div>
        <Button asChild className="marketing-outline-action" variant="secondary">
          <Link href="/museum">View all exhibits <ArrowRight aria-hidden="true" /></Link>
        </Button>
      </div>
      <div className="exhibit-showcase__grid">
        {exhibits.map((exhibit) => (
          <article className="exhibit-preview" key={exhibit.number}>
            <div className="exhibit-preview__meta"><span>{exhibit.category}</span><span>{exhibit.number}</span></div>
            <div className="exhibit-preview__image">
              <Image alt="" fill sizes="(max-width: 760px) 75vw, 18vw" src={exhibit.image} />
            </div>
            <h3>{exhibit.title}</h3>
            <p>{exhibit.description}</p>
            <div className="exhibit-preview__footer">
              <span className={`exhibit-status exhibit-status--${exhibit.statusTone}`}>{exhibit.status}</span>
              <time>{exhibit.date}</time>
            </div>
          </article>
        ))}
        <Link aria-label="View more exhibits" className="exhibit-showcase__next" href="/museum">
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="how-it-works" id="how-it-works" aria-labelledby="how-it-works-title">
      <div className="how-it-works__intro">
        <p className="marketing-section-label">Simple by design</p>
        <h2 aria-label="A calm space for unfinished things." id="how-it-works-title">A calm space for<br />unfinished things.</h2>
        <p>Almost Museum is built for reflection, not performance. A quiet place to park ideas without pressure or expiration dates.</p>
        <Image alt="A minimal museum room with an arched artwork, bench, and plant" height={85} src="/landing/workflow-illustration.png" width={200} />
      </div>
      <ol className="workflow-steps">
        {workflow.map(({ number, title, description, icon: Icon, tone }) => (
          <li className="workflow-step" key={number}>
            <div className={`workflow-step__icon workflow-step__icon--${tone}`}><Icon aria-hidden="true" /></div>
            <span className="workflow-step__number">{number}</span>
            <h3>{title}</h3>
            <p>{description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ValueStrip() {
  return (
    <section className="value-strip" aria-label="Almost Museum values">
      {values.map(({ title, description, icon: Icon }) => (
        <article key={title}><Icon aria-hidden="true" /><div><h2>{title}</h2><p>{description}</p></div></article>
      ))}
    </section>
  );
}

function ClosingCallToAction() {
  return (
    <section className="closing-cta" aria-labelledby="closing-cta-title">
      <Image alt="" fill sizes="100vw" src="/landing/closing-doorway.png" />
      <div className="closing-cta__copy">
        <h2 aria-label="Save the work worth remembering." id="closing-cta-title">Save the work<br />worth remembering.</h2>
        <p>Almost everything starts somewhere.<br />Give it a home before it disappears.</p>
        <Button asChild className="closing-cta__action">
          <Link href="/museum">Enter the Museum <ArrowRight aria-hidden="true" /></Link>
        </Button>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="marketing-footer">
      <GalleryVerticalEnd aria-label="Almost Museum" />
      <p>Almost Museum is a local-first application. No accounts. No cloud. Just you and your work.</p>
      <p>© 2024 Almost Museum</p>
    </footer>
  );
}

export function MarketingLanding() {
  return (
    <main className="landing-page">
      <div className="landing-screen landing-screen--hero">
        <HeroSection />
      </div>
      <div className="landing-screen landing-screen--collection">
        <BenefitStrip />
        <ExhibitGallery />
      </div>
      <div className="landing-screen landing-screen--process">
        <HowItWorks />
        <ValueStrip />
      </div>
      <div className="landing-screen landing-screen--closing">
        <ClosingCallToAction />
        <LandingFooter />
      </div>
    </main>
  );
}
