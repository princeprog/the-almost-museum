import type { HistoryEvent } from "@/lib/domain";

export interface AlmostTimelineProps {
  history?: HistoryEvent[];
  isLoading?: boolean;
  error?: boolean;
}

const fieldLabels: Record<string, string> = {
  museumLabel: "Museum label",
  relatedExhibitIds: "related Exhibits",
  tags: "tags",
  title: "working title",
  type: "Exhibit type",
  whatItTaughtMe: "what it taught me",
  whyStarted: "why it started",
  whyStopped: "why it stopped",
};

function readString(details: Record<string, unknown>, key: string): string | undefined {
  const value = details[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function formatLabel(value: string): string {
  return value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function describeFields(details: Record<string, unknown>): string | undefined {
  const fields = details.fields;
  if (!Array.isArray(fields)) return undefined;

  const labels = fields
    .filter((field): field is string => typeof field === "string")
    .map((field) => fieldLabels[field] ?? formatLabel(field));
  return labels.length > 0 ? labels.join(" and ") : undefined;
}

function describeStatusChange(details: Record<string, unknown>): string {
  switch (readString(details, "action")) {
    case "archive": return "This Exhibit was archived.";
    case "complete": return "This Exhibit was marked complete.";
    case "release": return "This Exhibit was released.";
    case "revive": return "This Exhibit was reopened.";
    default: return "This Exhibit changed status.";
  }
}

function describeEvent(event: HistoryEvent): string {
  const { details } = event;
  switch (event.type) {
    case "created": {
      const status = readString(details, "status");
      const type = readString(details, "type");
      return status !== undefined && type !== undefined
        ? `This Exhibit entered the collection as an ${status} ${formatLabel(type)}.`
        : "This Exhibit entered the collection.";
    }
    case "edited": {
      const fields = describeFields(details);
      return fields === undefined ? "Catalog details were revised." : `Catalog details were revised: ${fields}.`;
    }
    case "artifact-added": {
      const kind = readString(details, "kind");
      return kind === undefined ? "An artifact was added to the collection." : `A ${formatLabel(kind).toLowerCase()} artifact was added to the collection.`;
    }
    case "artifact-removed": {
      const kind = readString(details, "kind");
      return kind === undefined ? "An artifact was removed from the collection." : `A ${formatLabel(kind).toLowerCase()} artifact was removed from the collection.`;
    }
    case "transformed": return "This Exhibit was transformed into a related Exhibit.";
    case "status-changed": return describeStatusChange(details);
  }
}

function describeDetail(event: HistoryEvent): string | undefined {
  const from = readString(event.details, "from");
  const to = readString(event.details, "to");
  const relatedExhibitId = readString(event.details, "relatedExhibitId");
  if (relatedExhibitId !== undefined) return `Related Exhibit: ${relatedExhibitId}.`;
  if (from !== undefined && to !== undefined) return `From ${from} to ${to}.`;
  return undefined;
}

function formatOccurredAt(occurredAt: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(occurredAt));
}

/** A read-only rendering of append-only history from the canonical Exhibit repository. */
export function AlmostTimeline({ history = [], isLoading = false, error = false }: Readonly<AlmostTimelineProps>) {
  if (isLoading) return <section className="almost-timeline" aria-label="The Almost timeline"><p role="status">Opening the timeline…</p></section>;
  if (error) {
    return <section className="almost-timeline almost-timeline--unavailable" aria-labelledby="timeline-title"><p className="museum-eyebrow">Record</p><h2 id="timeline-title">The timeline is unavailable</h2><p>The rest of this Exhibit is still here; try opening it again for its record.</p></section>;
  }
  if (history.length === 0) {
    return <section className="almost-timeline" aria-labelledby="timeline-title"><p className="museum-eyebrow">Record</p><h2 id="timeline-title">The Almost timeline</h2><p>This Exhibit has not recorded an event yet.</p></section>;
  }

  const chronologicalHistory = [...history].sort((left, right) => left.occurredAt.localeCompare(right.occurredAt) || left.id.localeCompare(right.id));
  return (
    <section className="almost-timeline" aria-labelledby="timeline-title">
      <header><p className="museum-eyebrow">Record</p><h2 id="timeline-title">The Almost timeline</h2><p>Every change stays part of the record.</p></header>
      <ol>
        {chronologicalHistory.map((event) => {
          const detail = describeDetail(event);
          return <li key={event.id}><time dateTime={event.occurredAt}>{formatOccurredAt(event.occurredAt)}</time><p>{describeEvent(event)}</p>{detail !== undefined ? <p className="almost-timeline__detail">{detail}</p> : null}</li>;
        })}
      </ol>
    </section>
  );
}
