"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getExhibitRooms, type Exhibit, type ExhibitStatus, type ExhibitType } from "@/lib/domain";
import { filterAndSortExhibits, type GalleryFilters, type GalleryRoom, type GallerySort } from "@/lib/gallery";
import { ExhibitRepository } from "@/lib/persistence";
import { useGalleryPreferenceStore } from "@/lib/stores/gallery-preferences";

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

  return (
    <li className="museum-gallery__card">
      <article>
        <div className="museum-gallery__card-meta">
          <span>{formatLabel(exhibit.type)}</span>
          <span>{formatLabel(exhibit.status)}</span>
        </div>
        <h2><Link href={`/exhibit?id=${exhibit.id}`}>{exhibit.title}</Link></h2>
        <p>{exhibit.museumLabel}</p>
        <dl className="museum-gallery__card-details">
          <div>
            <dt>Rooms</dt>
            <dd>{rooms.map((room) => roomOptions.find((option) => option.value === room)?.label).join(", ")}</dd>
          </div>
          <div>
            <dt>Last tended</dt>
            <dd>{formatDate(exhibit.updatedAt)}</dd>
          </div>
        </dl>
        {exhibit.tags.length > 0 ? (
          <ul aria-label={`Tags for ${exhibit.title}`} className="museum-gallery__tags">
            {exhibit.tags.map((tag) => <li key={tag}>{tag}</li>)}
          </ul>
        ) : null}
      </article>
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
      <section aria-labelledby="gallery-recovery-title" className="museum-gallery__empty">
        <p className="museum-eyebrow">Collection unavailable</p>
        <h1 id="gallery-recovery-title">Your collection could not be opened.</h1>
        <p role="alert">Your collection could not be opened. Your local records have not been changed. Try again, or return after this browser is ready.</p>
        <button className="museum-button museum-button--secondary" onClick={() => setLoadAttempt((current) => current + 1)} type="button">Try opening collection again</button>
      </section>
    );
  }

  if (exhibits === null) return <p role="status">Opening your private collection…</p>;

  return (
    <section aria-labelledby="museum-gallery-title" className="museum-gallery">
      <header className="museum-gallery__header">
        <div>
          <p className="museum-eyebrow">Collection</p>
          <h1 id="museum-gallery-title">{roomLabel}</h1>
          <p>Move gently between rooms. Nothing here needs to earn its place.</p>
        </div>
        <Link className="museum-button museum-button--primary" href="/exhibit/new">Create Exhibit</Link>
      </header>

      <nav aria-label="Museum rooms" className="museum-gallery__rooms">
        {roomOptions.map((option) => (
          <button
            aria-pressed={filterControls.room === option.value}
            className="museum-gallery__room"
            key={option.value}
            onClick={() => setFilterControls((current) => ({ ...current, room: option.value }))}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </nav>

      <div className="museum-gallery__controls">
        <label className="museum-field" htmlFor="gallery-search">
          <span className="museum-field__label">Search collection</span>
          <input
            className="museum-input"
            id="gallery-search"
            onChange={(event) => setFilterControls((current) => ({ ...current, query: event.target.value }))}
            placeholder="Title, label, or tag"
            type="search"
            value={filterControls.query}
          />
        </label>
        <label className="museum-field" htmlFor="gallery-type">
          <span className="museum-field__label">Exhibit type</span>
          <select className="museum-input" id="gallery-type" onChange={(event) => setFilterControls((current) => ({ ...current, type: event.target.value as GalleryFilters["type"] }))} value={filterControls.type}>
            <option value="all">All types</option>
            {typeOptions.map((type) => <option key={type} value={type}>{formatLabel(type)}</option>)}
          </select>
        </label>
        <label className="museum-field" htmlFor="gallery-status">
          <span className="museum-field__label">Status</span>
          <select className="museum-input" id="gallery-status" onChange={(event) => setFilterControls((current) => ({ ...current, status: event.target.value as GalleryFilters["status"] }))} value={filterControls.status}>
            <option value="all">All statuses</option>
            {statusOptions.map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}
          </select>
        </label>
        <label className="museum-field" htmlFor="gallery-tag">
          <span className="museum-field__label">Tag</span>
          <select className="museum-input" id="gallery-tag" onChange={(event) => setFilterControls((current) => ({ ...current, tag: event.target.value }))} value={filterControls.tag}>
            <option value="all">All tags</option>
            {tags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
          </select>
        </label>
        <label className="museum-field" htmlFor="gallery-sort">
          <span className="museum-field__label">Sort collection</span>
          <select className="museum-input" id="gallery-sort" onChange={(event) => setSort(event.target.value as GallerySort)} value={sort}>
            <option value="updated-desc">Recently tended</option>
            <option value="created-desc">Recently added</option>
            <option value="title-asc">Title, A to Z</option>
          </select>
        </label>
      </div>

      <div className="museum-gallery__summary">
        <p aria-label="Gallery result count" role="status">{resultLabel}</p>
        <button className="museum-button museum-button--quiet" onClick={() => setView(view === "grid" ? "list" : "grid")} type="button">
          {view === "grid" ? "Show list view" : "Show grid view"}
        </button>
      </div>

      {visibleExhibits.length > 0 ? (
        <ul aria-label="Exhibits" className={`museum-gallery__cards museum-gallery__cards--${view}`}>
          {visibleExhibits.map((exhibit) => <GalleryCard exhibit={exhibit} key={exhibit.id} />)}
        </ul>
      ) : (
        <section aria-labelledby="gallery-empty-title" className="museum-gallery__empty">
          <p className="museum-eyebrow">Unvisited</p>
          <h2 id="gallery-empty-title">Nothing is hidden here.</h2>
          <p>Try a different room or loosen one of the filters to return to your collection.</p>
          <button className="museum-button museum-button--secondary" onClick={() => { setFilterControls(defaultFilterControls); setSort("updated-desc"); }} type="button">Clear filters</button>
        </section>
      )}
    </section>
  );
}
