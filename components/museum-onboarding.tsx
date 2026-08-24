"use client";

import { useEffect, useState } from "react";

import { EmptyCollectionState } from "@/components/empty-collection-state";
import { MuseumGallery } from "@/components/museum-gallery";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Exhibit } from "@/lib/domain";
import { ExhibitRepository } from "@/lib/persistence";
import { installHarborQueueDemo } from "@/lib/services/install-harbor-queue-demo";

export interface MuseumOnboardingProps {
  repository?: ExhibitRepository;
}

/** Client-side first-run view that reads and writes only through ExhibitRepository. */
export function MuseumOnboarding({ repository: suppliedRepository }: Readonly<MuseumOnboardingProps>) {
  const [repository] = useState(() => suppliedRepository ?? new ExhibitRepository());
  const [exhibits, setExhibits] = useState<Exhibit[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    void repository.listExhibits()
      .then((records) => {
        if (!isCurrent) return;
        setExhibits(records);
        setLoadError(false);
      })
      .catch(() => {
        if (!isCurrent) return;
        setExhibits(null);
        setLoadError(true);
      });

    return () => {
      isCurrent = false;
      if (suppliedRepository === undefined) repository.close();
    };
  }, [loadAttempt, repository, suppliedRepository]);

  async function handleInstallDemo() {
    const installation = await installHarborQueueDemo(repository);
    setExhibits((current) => current?.some(({ id }) => id === installation.exhibit.id)
      ? current
      : [...(current ?? []), installation.exhibit]);
  }

  if (loadError) {
    return (
      <Alert className="max-w-2xl" variant="destructive">
        <AlertTitle id="onboarding-recovery-title">Your collection could not be opened.</AlertTitle>
        <AlertDescription>Your collection could not be opened. Your local records have not been changed. Try again when this browser is ready.</AlertDescription>
        <Button className="mt-3 min-h-11 w-fit sm:min-h-8" onClick={() => setLoadAttempt((current) => current + 1)} variant="outline">Try opening collection again</Button>
      </Alert>
    );
  }
  if (exhibits === null) return (
    <Card aria-label="Opening your private collection" className="w-full max-w-2xl" role="status">
      <CardHeader><CardTitle><Skeleton className="h-6 w-44" /></CardTitle><CardDescription><Skeleton className="h-4 w-full" /></CardDescription></CardHeader>
      <CardFooter><Skeleton className="h-11 w-full sm:w-48" /></CardFooter>
    </Card>
  );
  if (exhibits.length === 0) {
    return <EmptyCollectionState onInstallDemo={handleInstallDemo} />;
  }

  return <MuseumGallery initialExhibits={exhibits} repository={repository} />;
}
