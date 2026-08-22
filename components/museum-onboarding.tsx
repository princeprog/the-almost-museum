"use client";

import { useEffect, useState } from "react";

import { EmptyCollectionState } from "@/components/empty-collection-state";
import { MuseumGallery } from "@/components/museum-gallery";
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
    const installation = await installHarborQueueDemo(repository);
    setExhibits((current) => current?.some(({ id }) => id === installation.exhibit.id)
      ? current
      : [...(current ?? []), installation.exhibit]);
  }

  if (exhibits === null) return <p role="status">Opening your private collection…</p>;
  if (exhibits.length === 0) {
    return <EmptyCollectionState onInstallDemo={handleInstallDemo} />;
  }

  return <MuseumGallery initialExhibits={exhibits} repository={repository} />;
}
