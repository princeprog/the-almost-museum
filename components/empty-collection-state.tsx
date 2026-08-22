"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

export interface EmptyCollectionStateProps {
  onInstallDemo: () => void;
}

/** A deliberate first-run choice; rendering it never writes to the collection. */
export function EmptyCollectionState({ onInstallDemo }: Readonly<EmptyCollectionStateProps>) {
  return (
    <section aria-labelledby="empty-collection-title" className="empty-collection-state">
      <p className="museum-eyebrow">Collection</p>
      <h1 id="empty-collection-title">Your collection is empty.</h1>
      <p>
        Start with something unfinished, or install a single example to see how an Exhibit can hold its story.
      </p>
      <div className="empty-collection-state__actions">
        <Link className="museum-button museum-button--primary" href="/exhibit/new">
          Create Exhibit
        </Link>
        <Button aria-describedby="harbor-queue-demo-description" onClick={onInstallDemo} variant="secondary">
          Install Harbor Queue demo
        </Button>
      </div>
      <p id="harbor-queue-demo-description">
        Adds one unfinished example, The Harbor Queue Redesign, to this private collection.
      </p>
    </section>
  );
}
