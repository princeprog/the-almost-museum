"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { getExhibitRooms, type Exhibit, type ExhibitStatus, type ExhibitType } from "@/lib/domain";
import { filterAndSortExhibits, type GalleryFilters, type GalleryRoom, type GallerySort } from "@/lib/gallery";
import { ExhibitRepository } from "@/lib/persistence";
import { useGalleryPreferenceStore } from "@/lib/stores/gallery-preferences";
import { cn } from "@/lib/utils";

type GalleryFilterControls = Omit<GalleryFilters, "sort">;

const defaultFilterControls: GalleryFilterControls = {
  room: "lobby",
  type: "all",
  status: "all",
  tag: "all",
  query: "",
};

const roomOptions: Array<{ label: string; value: GalleryRoom }> = [
  { label: "Lobby", value: "lobby" },
  { label: "Workshop", value: "workshop" },
  { label: "Archive", value: "archive" },
  { label: "Hall of Second Chances", value: "hall-of-second-chances" },
];

const typeOptions: ExhibitType[] = ["project", "draft", "idea", "experiment", "message"];
const statusOptions: ExhibitStatus[] = ["unfinished", "active", "revived", "archived", "completed", "transformed", "released"];

const galleryLayout = {
  grid: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
  list: "grid-cols-1",
} as const;

export interface MuseumGalleryProps {
  initialExhibits?: readonly Exhibit[];
  repository?: ExhibitRepository;
}

function formatLabel(value: string): string {
  return value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function GalleryCard({ exhibit }: Readonly<{ exhibit: Exhibit }>) {
  const rooms = getExhibitRooms(exhibit);
  const titleId = `exhibit-${exhibit.id}-title`;

  return (
    <li className="min-w-0">
      <Card aria-labelledby={titleId} className="h-full" role="article">
        <CardHeader>
          <CardTitle aria-level={2} id={titleId} role="heading">
            <Link href={`/exhibit?id=${exhibit.id}`}>{exhibit.title}</Link>
          </CardTitle>
          <CardDescription>{exhibit.museumLabel}</CardDescription>
          <CardAction className="flex flex-wrap justify-end gap-1">
            <Badge variant="secondary">{formatLabel(exhibit.type)}</Badge>
            <Badge variant="outline">{formatLabel(exhibit.status)}</Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt>Rooms</dt>
              <dd>{rooms.map((room) => roomOptions.find((option) => option.value === room)?.label).join(", ")}</dd>
            </div>
            <div>
              <dt>Last tended</dt>
              <dd>{formatDate(exhibit.updatedAt)}</dd>
            </div>
          </dl>
        </CardContent>
        <CardFooter className="mt-auto flex-wrap gap-1">
          {exhibit.tags.length > 0 ? (
            <ul aria-label={`Tags for ${exhibit.title}`} className="flex list-none flex-wrap gap-1 p-0">
              {exhibit.tags.map((tag) => <li key={tag}><Badge variant="outline">{tag}</Badge></li>)}
            </ul>
          ) : (
            <span>No tags</span>
          )}
        </CardFooter>
      </Card>
    </li>
  );
}

/** A read-only responsive browsing surface; only its local view preference is persisted. */
export function MuseumGallery({ initialExhibits, repository: suppliedRepository }: Readonly<MuseumGalleryProps>) {
  const [repository] = useState(() => suppliedRepository ?? new ExhibitRepository());
  const [exhibits, setExhibits] = useState<readonly Exhibit[] | null>(initialExhibits ?? null);
  const [filterControls, setFilterControls] = useState<GalleryFilterControls>(defaultFilterControls);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const hydratePreferences = useGalleryPreferenceStore((state) => state.hydrate);
  const setSort = useGalleryPreferenceStore((state) => state.setSort);
  const setView = useGalleryPreferenceStore((state) => state.setView);
  const sort = useGalleryPreferenceStore((state) => state.sort);
  const view = useGalleryPreferenceStore((state) => state.view);

  useEffect(() => {
    hydratePreferences();
  }, [hydratePreferences]);

  useEffect(() => {
    if (initialExhibits !== undefined) {
      setExhibits(initialExhibits);
      setLoadError(false);
      return;
    }

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
  }, [initialExhibits, loadAttempt, repository, suppliedRepository]);

  const tags = useMemo(
    () => Array.from(new Set((exhibits ?? []).flatMap((exhibit) => exhibit.tags)))
      .sort((left, right) => left.localeCompare(right)),
    [exhibits],
  );
  const filters = useMemo<GalleryFilters>(
    () => ({ ...filterControls, sort }),
    [filterControls, sort],
  );
  const visibleExhibits = useMemo(
    () => exhibits === null ? [] : filterAndSortExhibits(exhibits, filters),
    [exhibits, filters],
  );
  const roomLabel = roomOptions.find((option) => option.value === filters.room)?.label ?? "Lobby";
  const resultLabel = `${visibleExhibits.length} ${visibleExhibits.length === 1 ? "exhibit" : "exhibits"} in ${roomLabel}`;

  if (loadError) {
    return (
      <Card aria-labelledby="gallery-recovery-title" className="max-w-2xl" role="region">
        <CardHeader>
          <CardTitle aria-level={1} id="gallery-recovery-title" role="heading">Your collection could not be opened.</CardTitle>
          <CardDescription role="alert">
            Your collection could not be opened. Your local records have not been changed. Try again, or return after this browser is ready.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={() => setLoadAttempt((current) => current + 1)} variant="outline">
            Try opening collection again
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (exhibits === null) return <p role="status">Opening your private collection…</p>;

  return (
    <section aria-labelledby="museum-gallery-title" className="museum-collection grid w-full gap-6">
      <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="museum-eyebrow">Collection</p>
          <h1 id="museum-gallery-title">{roomLabel}</h1>
          <p>Move gently between rooms. Nothing here needs to earn its place.</p>
        </div>
        <Button asChild>
          <Link href="/exhibit/new">Create Exhibit</Link>
        </Button>
      </header>

      <Separator />

      <div className="w-full overflow-x-auto pb-1">
        <ToggleGroup
          aria-label="Museum rooms"
          className="min-w-max"
          multiple={false}
          onValueChange={([room]) => {
            const selectedRoom = roomOptions.find((option) => option.value === room);
            if (selectedRoom) setFilterControls((current) => ({ ...current, room: selectedRoom.value }));
          }}
          value={[filterControls.room]}
          variant="outline"
        >
          {roomOptions.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value}>
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <Card aria-labelledby="museum-filters-title" role="region">
        <CardHeader>
          <CardTitle aria-level={2} id="museum-filters-title" role="heading">Filter collection</CardTitle>
          <CardDescription>Narrow this room by title, type, status, tag, or the order you last tended it.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Field className="md:col-span-2 xl:col-span-1">
              <FieldLabel htmlFor="gallery-search">Search collection</FieldLabel>
              <Input
                aria-describedby="gallery-search-description"
                id="gallery-search"
                label=""
                onChange={(event) => setFilterControls((current) => ({ ...current, query: event.target.value }))}
                placeholder="Title, label, or tag"
                type="search"
                value={filterControls.query}
              />
              <FieldDescription className="sr-only" id="gallery-search-description">Title, label, or tag</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="gallery-type">Exhibit type</FieldLabel>
              <NativeSelect id="gallery-type" onChange={(event) => setFilterControls((current) => ({ ...current, type: event.target.value as GalleryFilters["type"] }))} value={filterControls.type}>
                <option value="all">All types</option>
                {typeOptions.map((type) => <option key={type} value={type}>{formatLabel(type)}</option>)}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="gallery-status">Status</FieldLabel>
              <NativeSelect id="gallery-status" onChange={(event) => setFilterControls((current) => ({ ...current, status: event.target.value as GalleryFilters["status"] }))} value={filterControls.status}>
                <option value="all">All statuses</option>
                {statusOptions.map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="gallery-tag">Tag</FieldLabel>
              <NativeSelect id="gallery-tag" onChange={(event) => setFilterControls((current) => ({ ...current, tag: event.target.value }))} value={filterControls.tag}>
                <option value="all">All tags</option>
                {tags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="gallery-sort">Sort collection</FieldLabel>
              <NativeSelect id="gallery-sort" onChange={(event) => setSort(event.target.value as GallerySort)} value={sort}>
                <option value="updated-desc">Recently tended</option>
                <option value="created-desc">Recently added</option>
                <option value="title-asc">Title, A to Z</option>
              </NativeSelect>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
        <p aria-label="Gallery result count" role="status">{resultLabel}</p>
        <Button onClick={() => setView(view === "grid" ? "list" : "grid")} variant="outline">
          {view === "grid" ? "Show list view" : "Show grid view"}
        </Button>
      </div>

      <Separator />

      {visibleExhibits.length > 0 ? (
        <ul
          aria-label="Exhibits"
          className={cn("grid list-none gap-4 p-0", galleryLayout[view])}
          data-view={view}
        >
          {visibleExhibits.map((exhibit) => <GalleryCard exhibit={exhibit} key={exhibit.id} />)}
        </ul>
      ) : (
        <Card aria-labelledby="gallery-empty-title" className="max-w-2xl" role="region">
          <CardHeader>
            <CardTitle aria-level={2} id="gallery-empty-title" role="heading">Nothing is hidden here.</CardTitle>
            <CardDescription>Try a different room or loosen one of the filters to return to your collection.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => { setFilterControls(defaultFilterControls); setSort("updated-desc"); }} variant="outline">
              Clear filters
            </Button>
          </CardFooter>
        </Card>
      )}
    </section>
  );
}
