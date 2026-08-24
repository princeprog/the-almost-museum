"use client";

import { useEffect, useState } from "react";

import { EmptyCollectionState } from "@/components/empty-collection-state";
import { MuseumGallery } from "@/components/museum-gallery";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
      <Card aria-labelledby="onboarding-recovery-title" className="max-w-2xl" role="region">
        <CardHeader>
          <CardTitle aria-level={1} id="onboarding-recovery-title" role="heading">Your collection could not be opened.</CardTitle>
          <CardDescription role="alert">Your collection could not be opened. Your local records have not been changed. Try again when this browser is ready.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={() => setLoadAttempt((current) => current + 1)} variant="outline">Try opening collection again</Button>
        </CardFooter>
      </Card>
    );
  }
  if (exhibits === null) return <p role="status">Opening your private collection…</p>;
  if (exhibits.length === 0) {
    return <EmptyCollectionState onInstallDemo={handleInstallDemo} />;
  }

  return <MuseumGallery initialExhibits={exhibits} repository={repository} />;
}
