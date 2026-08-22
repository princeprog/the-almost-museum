import { getExhibitRooms, type Exhibit, type ExhibitStatus, type ExhibitType, type MuseumRoom } from "@/lib/domain";

export type GalleryRoom = "lobby" | MuseumRoom;
export type GallerySort = "updated-desc" | "created-desc" | "title-asc";

export interface GalleryFilters {
  room: GalleryRoom;
  type: ExhibitType | "all";
  status: ExhibitStatus | "all";
  tag: string | "all";
  query: string;
  sort: GallerySort;
}

function includesCaseInsensitive(value: string, query: string): boolean {
  return value.toLocaleLowerCase().includes(query.toLocaleLowerCase());
}

function matchesQuery(exhibit: Exhibit, query: string): boolean {
  const normalizedQuery = query.trim();
  if (normalizedQuery === "") return true;

  return [exhibit.title, exhibit.museumLabel, exhibit.type, exhibit.status, ...exhibit.tags]
    .some((value) => includesCaseInsensitive(value, normalizedQuery));
}

function byDateDescending(field: "createdAt" | "updatedAt") {
  return (left: Exhibit, right: Exhibit) => (
    Date.parse(right[field]) - Date.parse(left[field]) || left.title.localeCompare(right.title)
  );
}

/** Filters a read-only Exhibit collection for the gallery without mutating canonical records. */
export function filterAndSortExhibits(exhibits: readonly Exhibit[], filters: GalleryFilters): Exhibit[] {
  const tag = filters.tag.toLocaleLowerCase();
  const filtered = exhibits.filter((exhibit) => (
    (filters.room === "lobby" || getExhibitRooms(exhibit).includes(filters.room))
    && (filters.type === "all" || exhibit.type === filters.type)
    && (filters.status === "all" || exhibit.status === filters.status)
    && (filters.tag === "all" || exhibit.tags.some((item) => item.toLocaleLowerCase() === tag))
    && matchesQuery(exhibit, filters.query)
  ));

  return [...filtered].sort(
    filters.sort === "title-asc"
      ? (left, right) => left.title.localeCompare(right.title)
      : byDateDescending(filters.sort === "created-desc" ? "createdAt" : "updatedAt"),
  );
}
