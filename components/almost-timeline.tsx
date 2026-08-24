import type { HistoryEvent } from "@/lib/domain";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

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

function describeDetails(event: HistoryEvent): string[] {
  const from = readString(event.details, "from");
  const to = readString(event.details, "to");
  const relatedExhibitId = readString(event.details, "relatedExhibitId");
  const details: string[] = [];
  if (from !== undefined && to !== undefined) details.push(`From ${from} to ${to}.`);
  if (relatedExhibitId !== undefined) details.push(`Related Exhibit: ${relatedExhibitId}.`);
  return details;
}

function formatOccurredAt(occurredAt: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(occurredAt));
}

/** A read-only rendering of append-only history from the canonical Exhibit repository. */
export function AlmostTimeline({ history = [], isLoading = false, error = false }: Readonly<AlmostTimelineProps>) {
  if (isLoading) {
    return (
      <Card aria-label="The Almost timeline" role="status">
        <CardHeader><CardTitle>The Almost timeline</CardTitle><CardDescription>Opening the timeline…</CardDescription></CardHeader>
        <CardContent className="grid gap-3"><Skeleton className="h-5 w-1/3" /><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></CardContent>
      </Card>
    );
  }
  if (error) {
    return <Alert variant="destructive"><AlertTitle aria-level={2} role="heading">The timeline is unavailable</AlertTitle><AlertDescription>The rest of this Exhibit is still here; try opening it again for its record.</AlertDescription></Alert>;
  }
  if (history.length === 0) {
    return <Card><Empty><EmptyHeader><EmptyTitle aria-level={2} role="heading">The Almost timeline</EmptyTitle><EmptyDescription>This Exhibit has not recorded an event yet.</EmptyDescription></EmptyHeader></Empty></Card>;
  }

  const chronologicalHistory = [...history].sort((left, right) => left.occurredAt.localeCompare(right.occurredAt) || left.id.localeCompare(right.id));
  return (
    <Card aria-labelledby="timeline-title">
      <CardHeader><CardTitle aria-level={2} id="timeline-title" role="heading">The Almost timeline</CardTitle><CardDescription>Every change stays part of the record.</CardDescription></CardHeader>
      <CardContent>
      <ol className="grid list-none gap-4 p-0">
        {chronologicalHistory.map((event) => {
          const details = describeDetails(event);
          return <li className="grid gap-2 border-l-2 border-primary pl-4" key={event.id}><Badge className="w-fit" variant="outline"><time dateTime={event.occurredAt}>{formatOccurredAt(event.occurredAt)}</time></Badge><p className="text-sm text-foreground">{describeEvent(event)}</p>{details.map((detail) => <p className="text-sm text-muted-foreground" key={detail}>{detail}</p>)}</li>;
        })}
      </ol>
      </CardContent>
    </Card>
  );
}
