"use client";

import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export interface EmptyCollectionStateProps {
  onInstallDemo: () => void;
}

/** A deliberate first-run choice; rendering it never writes to the collection. */
export function EmptyCollectionState({ onInstallDemo }: Readonly<EmptyCollectionStateProps>) {
  return (
    <Empty
      aria-labelledby="empty-collection-title"
      className="mx-auto w-full max-w-2xl border"
      role="region"
    >
      <EmptyHeader>
        <EmptyTitle aria-level={1} id="empty-collection-title" role="heading">
          Your collection is empty.
        </EmptyTitle>
        <EmptyDescription>
          Start with something unfinished, or install a single example to see how an Exhibit can hold its story.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <p id="harbor-queue-demo-description">
          The demo adds one unfinished example, The Harbor Queue Redesign, to this private collection.
        </p>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
        <Link className={buttonVariants({ className: "min-h-11 w-full sm:w-auto" })} href="/exhibit/new">Create Exhibit</Link>
        <Button className="min-h-11 w-full sm:w-auto" aria-describedby="harbor-queue-demo-description" onClick={onInstallDemo} variant="outline">
          Install Harbor Queue demo
        </Button>
        </div>
      </EmptyContent>
    </Empty>
  );
}
