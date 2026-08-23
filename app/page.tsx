import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="landing-page">
      <section className="landing-page__hero" aria-labelledby="landing-title">
        <p className="museum-eyebrow">A place to keep what is still becoming</p>
        <div className="landing-page__frame">
          <p className="landing-page__catalogue">Collection no. 01</p>
          <h1 id="landing-title">Not everything unfinished is a failure.</h1>
          <p className="landing-page__lede">
            Almost is a private museum for unfinished ideas, projects, and experiments.
          </p>
        </div>
        <Button asChild className="landing-page__enter">
          <Link href="/museum">Enter the Museum <span aria-hidden="true">→</span></Link>
        </Button>
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
