"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
      <Alert className="max-w-2xl" variant="destructive">
          <AlertTitle id="gallery-recovery-title">Your collection could not be opened.</AlertTitle>
          <AlertDescription>
            Your collection could not be opened. Your local records have not been changed. Try again, or return after this browser is ready.
          </AlertDescription>
          <Button className="mt-3 min-h-11 w-fit sm:min-h-8" onClick={() => setLoadAttempt((current) => current + 1)} variant="outline">
            Try opening collection again
          </Button>
      </Alert>
    );
  }

  if (exhibits === null) return (
    <Card aria-label="Opening your private collection" className="w-full max-w-2xl" role="status">
      <CardHeader><Skeleton className="h-6 w-44" /><Skeleton className="h-4 w-full max-w-sm" /></CardHeader>
      <CardContent className="grid gap-3"><Skeleton className="h-11 w-full" /><Skeleton className="h-32 w-full" /></CardContent>
    </Card>
  );

  return (
    <section aria-labelledby="museum-gallery-title" className="museum-collection grid w-full gap-6">
      <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="museum-eyebrow">Collection</p>
          <h1 id="museum-gallery-title">{roomLabel}</h1>
          <p>Move gently between rooms. Nothing here needs to earn its place.</p>
        </div>
        <Link className={buttonVariants()} href="/exhibit/new">Create Exhibit</Link>
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
                onChange={(event) => setFilterControls((current) => ({ ...current, query: event.target.value }))}
                placeholder="Title, label, or tag"
                type="search"
                value={filterControls.query}
              />
              <FieldDescription className="sr-only" id="gallery-search-description">Title, label, or tag</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="gallery-type">Exhibit type</FieldLabel>
              <Select items={[{ label: "All types", value: "all" }, ...typeOptions.map((type) => ({ label: formatLabel(type), value: type }))]} onValueChange={(value) => setFilterControls((current) => ({ ...current, type: value as GalleryFilters["type"] }))} value={filterControls.type}>
                <SelectTrigger className="min-h-11 w-full sm:min-h-8" id="gallery-type"><SelectValue /></SelectTrigger>
                <SelectContent><SelectGroup><SelectItem value="all">All types</SelectItem>{typeOptions.map((type) => <SelectItem key={type} value={type}>{formatLabel(type)}</SelectItem>)}</SelectGroup></SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="gallery-status">Status</FieldLabel>
              <Select items={[{ label: "All statuses", value: "all" }, ...statusOptions.map((status) => ({ label: formatLabel(status), value: status }))]} onValueChange={(value) => setFilterControls((current) => ({ ...current, status: value as GalleryFilters["status"] }))} value={filterControls.status}>
                <SelectTrigger className="min-h-11 w-full sm:min-h-8" id="gallery-status"><SelectValue /></SelectTrigger>
                <SelectContent><SelectGroup><SelectItem value="all">All statuses</SelectItem>{statusOptions.map((status) => <SelectItem key={status} value={status}>{formatLabel(status)}</SelectItem>)}</SelectGroup></SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="gallery-tag">Tag</FieldLabel>
              <Select items={[{ label: "All tags", value: "all" }, ...tags.map((tag) => ({ label: tag, value: tag }))]} onValueChange={(value) => setFilterControls((current) => ({ ...current, tag: value ?? "all" }))} value={filterControls.tag}>
                <SelectTrigger className="min-h-11 w-full sm:min-h-8" id="gallery-tag"><SelectValue /></SelectTrigger>
                <SelectContent><SelectGroup><SelectItem value="all">All tags</SelectItem>{tags.map((tag) => <SelectItem key={tag} value={tag}>{tag}</SelectItem>)}</SelectGroup></SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="gallery-sort">Sort collection</FieldLabel>
              <Select items={[{ label: "Recently tended", value: "updated-desc" }, { label: "Recently added", value: "created-desc" }, { label: "Title, A to Z", value: "title-asc" }]} onValueChange={(value) => setSort(value as GallerySort)} value={sort}>
                <SelectTrigger className="min-h-11 w-full sm:min-h-8" id="gallery-sort"><SelectValue /></SelectTrigger>
                <SelectContent><SelectGroup><SelectItem value="updated-desc">Recently tended</SelectItem><SelectItem value="created-desc">Recently added</SelectItem><SelectItem value="title-asc">Title, A to Z</SelectItem></SelectGroup></SelectContent>
              </Select>
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
        <Empty aria-labelledby="gallery-empty-title" className="max-w-2xl border" role="region">
          <EmptyHeader>
            <EmptyTitle aria-level={2} id="gallery-empty-title" role="heading">Nothing is hidden here.</EmptyTitle>
            <EmptyDescription>Try a different room or loosen one of the filters to return to your collection.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => { setFilterControls(defaultFilterControls); setSort("updated-desc"); }} variant="outline">
              Clear filters
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </section>
  );
}
