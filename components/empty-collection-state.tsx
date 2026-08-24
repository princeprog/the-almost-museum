"use client";

import Link from "next/link";
import { Archive, ArrowRight } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
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
      className="mx-auto min-h-[calc(100svh-10rem)] w-full max-w-3xl border px-6 py-12 sm:px-10 sm:py-16"
      role="region"
    >
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Archive aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle aria-level={1} id="empty-collection-title" role="heading">
          Your collection is empty.
        </EmptyTitle>
        <EmptyDescription>
          Start with something unfinished, or install a single example to see how an Exhibit can hold its story.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="gap-4">
        <div className="w-full max-w-md rounded-lg border bg-muted/30 p-4 text-left">
          <p className="font-medium">See how an Exhibit comes together</p>
          <p className="text-muted-foreground" id="harbor-queue-demo-description">
            The demo adds one unfinished example, The Harbor Queue Redesign, to this private collection.
          </p>
        </div>
        <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
          <Link className={buttonVariants({ className: "min-h-11 w-full sm:w-auto" })} href="/exhibit/new">
            Create Exhibit
            <ArrowRight aria-hidden="true" data-icon="inline-end" />
          </Link>
          <Button
            aria-describedby="harbor-queue-demo-description"
            className="min-h-11 w-full sm:w-auto"
            onClick={onInstallDemo}
            variant="outline"
          >
            Install Harbor Queue demo
          </Button>
        </div>
      </EmptyContent>
    </Empty>
  );
}
