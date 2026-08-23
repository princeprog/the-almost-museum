import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="landing-page">
      <section className="landing-page__hero" aria-labelledby="landing-title">
        <div className="landing-page__frame">
          <p className="museum-eyebrow">A private archive for the in-between</p>
          <h1 aria-label="Give unfinished work a place to live." id="landing-title">
            Give
            <span>unfinished</span>
            <span>work a place to</span>
            <span>live.</span>
          </h1>
          <p className="landing-page__lede">
            Almost is a private museum for unfinished ideas, projects, and experiments.
          </p>
          <Button asChild className="landing-page__enter">
            <Link href="/museum">Enter the Museum <span aria-hidden="true">→</span></Link>
          </Button>
          <p className="landing-page__catalogue" aria-label="Collection number 01, open archive">
            Collection no. 01 <span aria-hidden="true">·</span> Open archive <span aria-hidden="true">↗</span>
          </p>
        </div>
      </section>

      <section className="landing-page__note" aria-labelledby="landing-note-title">
        <p className="museum-eyebrow">A different kind of record</p>
        <h2 id="landing-note-title">Keep the work. Keep the context.</h2>
        <p>
          Leave a trace of what you made, what changed, and what you might want to return to—on your own terms.
        </p>
      </section>
    </main>
  );
}
