"use client";

import { useEffect, useState } from "react";

import { EmptyCollectionState } from "@/components/empty-collection-state";
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
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    void repository.listExhibits().then((records) => {
      if (isCurrent) setExhibits(records);
    });

    return () => {
      isCurrent = false;
      if (suppliedRepository === undefined) repository.close();
    };
  }, [repository, suppliedRepository]);

  async function handleInstallDemo() {
    setIsInstalling(true);
    const installation = await installHarborQueueDemo(repository);
    setExhibits((current) => current?.some(({ id }) => id === installation.exhibit.id)
      ? current
      : [...(current ?? []), installation.exhibit]);
    setIsInstalling(false);
  }

  if (exhibits === null) return <p role="status">Opening your private collection…</p>;
  if (exhibits.length === 0) {
    return <EmptyCollectionState onInstallDemo={handleInstallDemo} />;
  }

  return (
    <section aria-labelledby="onboarding-collection-title">
      <p className="museum-eyebrow">Collection</p>
      <h1 id="onboarding-collection-title">Your collection has begun.</h1>
      {isInstalling ? <p role="status">Installing the Harbor Queue demo…</p> : null}
      <p>{exhibits.map((exhibit) => exhibit.title).join(", ")}</p>
    </section>
  );
}
