"use client";

import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface EmptyCollectionStateProps {
  onInstallDemo: () => void;
}

/** A deliberate first-run choice; rendering it never writes to the collection. */
export function EmptyCollectionState({ onInstallDemo }: Readonly<EmptyCollectionStateProps>) {
  return (
    <Card
      aria-labelledby="empty-collection-title"
      className="mx-auto w-full max-w-2xl"
      role="region"
    >
      <CardHeader>
        <CardTitle aria-level={1} id="empty-collection-title" role="heading">
          Your collection is empty.
        </CardTitle>
        <CardDescription>
          Start with something unfinished, or install a single example to see how an Exhibit can hold its story.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p id="harbor-queue-demo-description">
          The demo adds one unfinished example, The Harbor Queue Redesign, to this private collection.
        </p>
      </CardContent>
      <CardFooter className="flex-wrap gap-2">
        <Link className={buttonVariants()} href="/exhibit/new">Create Exhibit</Link>
        <Button aria-describedby="harbor-queue-demo-description" onClick={onInstallDemo} variant="outline">
          Install Harbor Queue demo
        </Button>
      </CardFooter>
    </Card>
  );
}
