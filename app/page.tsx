import Link from "next/link";

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
        <Link className="museum-button museum-button--primary landing-page__enter" href="/museum">
          Enter the Museum <span aria-hidden="true">→</span>
        </Link>
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
