"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";

import { AlmostTimeline } from "@/components/almost-timeline";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { validateArtifactFile } from "@/lib/artifacts/file-validation";
import { subscribeToLocationSearch } from "@/lib/browser/location-search";
import {
  canApplyClosureAction,
  getExhibitRooms,
  type Artifact,
  type ClosureAction,
  type Exhibit,
  type ExhibitType,
  type HistoryEvent,
} from "@/lib/domain";
import { ExhibitRepository } from "@/lib/persistence";

const exhibitTypes: Array<{ value: ExhibitType; label: string }> = [
  { value: "project", label: "Project" },
  { value: "draft", label: "Draft" },
  { value: "idea", label: "Idea" },
  { value: "experiment", label: "Experiment" },
  { value: "message", label: "Message" },
];

const roomLabels = {
  workshop: "Workshop",
  archive: "Archive",
  "hall-of-second-chances": "Hall of Second Chances",
} as const;

const closureLabels: Record<ClosureAction, string> = {
  revive: "Revive",
  archive: "Move to Archive",
  complete: "Complete",
  transform: "Transform",
  release: "Release",
};

const closureDialogTitles: Record<ClosureAction, string> = {
  revive: "Revive this Exhibit?",
  archive: "Move to Archive?",
  complete: "Complete this Exhibit?",
  transform: "Transform this Exhibit?",
  release: "Release this Exhibit?",
};

const closureConfirmLabels: Record<Exclude<ClosureAction, "transform">, string> = {
  revive: "Revive Exhibit",
  archive: "Archive Exhibit",
  complete: "Complete Exhibit",
  release: "Release Exhibit",
};

type Feedback = {
  intent: "alert" | "status";
  text: string;
};

export interface ExhibitDetailProps {
  repository?: ExhibitRepository;
  /** Intended for route-level integration tests; browser navigation supplies this by default. */
  search?: string;
}

function optionalValue(value: string): string | undefined {
  return value.trim() || undefined;
}

function formatLabel(value: string): string {
  return value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function readRequestedId(search?: string): string | undefined {
  return new URLSearchParams(search ?? "").get("id")?.trim() || undefined;
}

function ExhibitTypeSelect({ id, onValueChange, value }: Readonly<{
  id: string;
  onValueChange: (value: ExhibitType) => void;
  value: ExhibitType;
}>) {
  return (
    <Select items={exhibitTypes} onValueChange={(nextValue) => onValueChange(nextValue as ExhibitType)} value={value}>
      <SelectTrigger className="w-full" id={id}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {exhibitTypes.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function ArtifactPreview({ artifact }: Readonly<{ artifact: Artifact }>) {
  const [objectUrl, setObjectUrl] = useState<string>();

  useEffect(() => {
    if ((artifact.kind !== "image" && artifact.kind !== "pdf" && artifact.kind !== "audio") || artifact.blob === undefined) {
      setObjectUrl(undefined);
      return;
    }

    if (typeof URL.createObjectURL !== "function") return;
    const url = URL.createObjectURL(artifact.blob);
    if (url === undefined) return;
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [artifact]);

  if (artifact.kind === "link" && artifact.url !== undefined) {
    return <a href={artifact.url} rel="noreferrer" target="_blank">{artifact.label}</a>;
  }
  if (artifact.kind === "note") return <p>{artifact.note}</p>;
  if (objectUrl === undefined) return <p>Local file preview unavailable.</p>;

  return (
    <div className="grid gap-3">
      {artifact.kind === "image" ? (
        // Local object URLs are intentionally not eligible for Next image optimization.
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={artifact.label} className="max-h-96 max-w-full rounded-lg border object-contain" src={objectUrl} />
      ) : null}
      {artifact.kind === "pdf" ? <iframe aria-label={artifact.label} className="h-80 w-full rounded-lg border" src={objectUrl} title={artifact.label} /> : null}
      {artifact.kind === "audio" ? <audio aria-label={artifact.label} className="max-w-full" controls src={objectUrl} /> : null}
      <a className={buttonVariants({ variant: "outline" })} download={artifact.fileName ?? artifact.label} href={objectUrl}>Download {artifact.label}</a>
    </div>
  );
}

function ArtifactCard({ artifact, onRemove }: Readonly<{ artifact: Artifact; onRemove: (artifact: Artifact) => void }>) {
  return (
    <li>
      <Card>
        <CardHeader>
          <Badge className="w-fit" variant="outline">{formatLabel(artifact.kind)}</Badge>
          <CardTitle aria-level={3} role="heading">{artifact.label}</CardTitle>
        </CardHeader>
        <CardContent><ArtifactPreview artifact={artifact} /></CardContent>
        <CardFooter className="justify-end">
          <Button onClick={() => onRemove(artifact)} variant="ghost">Remove {artifact.label}</Button>
        </CardFooter>
      </Card>
    </li>
  );
}

/** A query-addressable view that keeps every Exhibit mutation inside the canonical repository. */
export function ExhibitDetail({ repository: suppliedRepository, search }: Readonly<ExhibitDetailProps>) {
  const [repository] = useState(() => suppliedRepository ?? new ExhibitRepository());
  const [query, setQuery] = useState(search);
  const exhibitId = useMemo(() => readRequestedId(query), [query]);
  const requestVersion = useRef(0);
  const exhibitHeadingRef = useRef<HTMLHeadingElement>(null);
  const shouldRestoreClosureFocusRef = useRef(false);
  const [exhibit, setExhibit] = useState<Exhibit>();
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [isLoading, setIsLoading] = useState(exhibitId !== undefined);
  const [isTimelineLoading, setIsTimelineLoading] = useState(exhibitId !== undefined);
  const [isTimelineUnavailable, setIsTimelineUnavailable] = useState(false);
  const [isMissing, setIsMissing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<Feedback>();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ExhibitType>("project");
  const [museumLabel, setMuseumLabel] = useState("");
  const [whyStarted, setWhyStarted] = useState("");
  const [whyStopped, setWhyStopped] = useState("");
  const [whatItTaughtMe, setWhatItTaughtMe] = useState("");
  const [tags, setTags] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [linkAddress, setLinkAddress] = useState("");
  const [noteLabel, setNoteLabel] = useState("");
  const [note, setNote] = useState("");
  const [closureAction, setClosureAction] = useState<ClosureAction>();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transformMode, setTransformMode] = useState<"existing" | "new">("existing");
  const [transformCandidates, setTransformCandidates] = useState<Exhibit[]>([]);
  const [relatedExhibitId, setRelatedExhibitId] = useState("");
  const [newExhibitTitle, setNewExhibitTitle] = useState("");
  const [newExhibitType, setNewExhibitType] = useState<ExhibitType>("project");
  const [newExhibitLabel, setNewExhibitLabel] = useState("");
  const [releaseAcknowledged, setReleaseAcknowledged] = useState(false);

  function setFormValues(nextExhibit: Exhibit) {
    setTitle(nextExhibit.title);
    setType(nextExhibit.type);
    setMuseumLabel(nextExhibit.museumLabel);
    setWhyStarted(nextExhibit.whyStarted ?? "");
    setWhyStopped(nextExhibit.whyStopped ?? "");
    setWhatItTaughtMe(nextExhibit.whatItTaughtMe ?? "");
    setTags(nextExhibit.tags.join(", "));
  }

  function reportMessage(text: string, intent: Feedback["intent"] = "status") {
    setMessage({ intent, text });
  }

  function clearDetailState() {
    setExhibit(undefined);
    setArtifacts([]);
    setHistory([]);
    setIsTimelineLoading(false);
    setIsTimelineUnavailable(false);
    setLoadError(false);
    setIsEditing(false);
    setMessage(undefined);
    setTitle("");
    setType("project");
    setMuseumLabel("");
    setWhyStarted("");
    setWhyStopped("");
    setWhatItTaughtMe("");
    setTags("");
    setLinkLabel("");
    setLinkAddress("");
    setNoteLabel("");
    setNote("");
    setClosureAction(undefined);
    setIsTransitioning(false);
    setTransformMode("existing");
    setTransformCandidates([]);
    setRelatedExhibitId("");
    setNewExhibitTitle("");
    setNewExhibitType("project");
    setNewExhibitLabel("");
    setReleaseAcknowledged(false);
  }

  useEffect(() => {
    if (search !== undefined) {
      setQuery(search);
      return;
    }

    const syncQuery = () => setQuery(window.location.search);
    syncQuery();
    return subscribeToLocationSearch(syncQuery);
  }, [search]);

  async function loadExhibit(id: string, version: number) {
    const isCurrentRequest = () => requestVersion.current === version;
    try {
      const record = await repository.getExhibit(id);
      if (!isCurrentRequest()) return;
      if (record === undefined) {
        clearDetailState();
        setIsMissing(true);
        return;
      }
      const records = await repository.listArtifacts(record.id);
      if (!isCurrentRequest()) return;
      setExhibit(record);
      setArtifacts(records);
      setFormValues(record);
      setLoadError(false);
      try {
        const historyRecords = await repository.getHistory(record.id);
        if (!isCurrentRequest()) return;
        setHistory(historyRecords);
      } catch {
        if (!isCurrentRequest()) return;
        setIsTimelineUnavailable(true);
      } finally {
        if (isCurrentRequest()) setIsTimelineLoading(false);
      }
    } catch {
      if (!isCurrentRequest()) return;
      clearDetailState();
      setLoadError(true);
      setIsMissing(false);
    } finally {
      if (isCurrentRequest()) setIsLoading(false);
    }
  }

  useEffect(() => {
    const version = ++requestVersion.current;
    if (exhibitId === undefined) {
      clearDetailState();
      setIsLoading(false);
      setIsMissing(false);
    } else {
      clearDetailState();
      setIsLoading(true);
      setIsMissing(false);
      setIsTimelineLoading(true);
      void loadExhibit(exhibitId, version);
    }

    return () => {
      if (requestVersion.current === version) requestVersion.current += 1;
    };
  // The repository is intentionally stable for a mounted detail view.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exhibitId, loadAttempt, repository]);

  async function refreshTimeline(id: string) {
    const version = requestVersion.current;
    setIsTimelineLoading(true);
    setIsTimelineUnavailable(false);
    try {
      const historyRecords = await repository.getHistory(id);
      if (requestVersion.current !== version) return;
      setHistory(historyRecords);
    } catch {
      if (requestVersion.current !== version) return;
      setIsTimelineUnavailable(true);
    } finally {
      if (requestVersion.current === version) setIsTimelineLoading(false);
    }
  }

  useEffect(() => () => {
    if (suppliedRepository === undefined) repository.close();
  }, [repository, suppliedRepository]);

  async function saveChanges(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (exhibit === undefined) return;
    setMessage(undefined);
    try {
      const updated = await repository.updateExhibit(exhibit.id, {
        title,
        type,
        museumLabel,
        whyStarted: optionalValue(whyStarted),
        whyStopped: optionalValue(whyStopped),
        whatItTaughtMe: optionalValue(whatItTaughtMe),
        tags: tags.split(","),
      });
      setExhibit(updated);
      setFormValues(updated);
      setIsEditing(false);
      reportMessage("Exhibit details saved.");
      void refreshTimeline(updated.id);
    } catch {
      reportMessage("Your changes are still here. Please check the required fields and try again.", "alert");
    }
  }

  async function addLink() {
    if (exhibit === undefined) return;
    if (!linkLabel.trim() || !linkAddress.trim()) {
      reportMessage("Add a label and a complete link address before saving the link.", "alert");
      return;
    }
    try {
      new URL(linkAddress.trim());
      const artifact = await repository.addArtifact(exhibit.id, { kind: "link", label: linkLabel, url: linkAddress });
      setArtifacts((current) => [...current, artifact]);
      setLinkLabel("");
      setLinkAddress("");
      reportMessage("Link added to this Exhibit.");
      void refreshTimeline(exhibit.id);
    } catch {
      reportMessage("Use a complete link address, including https://.", "alert");
    }
  }

  async function addNote() {
    if (exhibit === undefined) return;
    if (!noteLabel.trim() || !note.trim()) {
      reportMessage("Add a label and text before saving the note.", "alert");
      return;
    }
    try {
      const artifact = await repository.addArtifact(exhibit.id, { kind: "note", label: noteLabel, note });
      setArtifacts((current) => [...current, artifact]);
      setNoteLabel("");
      setNote("");
      reportMessage("Note added to this Exhibit.");
      void refreshTimeline(exhibit.id);
    } catch {
      reportMessage("Your note is still here. Please try again.", "alert");
    }
  }

  async function addFile(event: ChangeEvent<HTMLInputElement>) {
    if (exhibit === undefined) return;
    const file = event.currentTarget.files?.item(0);
    event.currentTarget.value = "";
    if (file === null || file === undefined) return;
    const validation = validateArtifactFile(file);
    if (!validation.valid) {
      reportMessage(validation.message, "alert");
      return;
    }
    try {
      const artifact = await repository.addArtifact(exhibit.id, {
        ...validation.artifact,
        label: validation.artifact.fileName,
      });
      setArtifacts((current) => [...current, artifact]);
      reportMessage("Local file added to this Exhibit.");
      void refreshTimeline(exhibit.id);
    } catch {
      reportMessage("Your file was not added. Please try again.", "alert");
    }
  }

  async function removeArtifact(artifact: Artifact) {
    try {
      await repository.removeArtifact(artifact.id);
      setArtifacts((current) => current.filter((item) => item.id !== artifact.id));
      reportMessage("Attachment removed from this Exhibit.");
      void refreshTimeline(artifact.exhibitId);
    } catch {
      reportMessage("That attachment could not be removed. Please try again.", "alert");
    }
  }

  async function openClosureDialog(action: ClosureAction) {
    if (exhibit === undefined || !canApplyClosureAction(exhibit, action)) return;
    setMessage(undefined);
    setClosureAction(action);
    setReleaseAcknowledged(false);
    if (action !== "transform") return;

    try {
      const candidates = await repository.listExhibits();
      setTransformCandidates(candidates.filter((candidate) => candidate.id !== exhibit.id));
    } catch {
      setTransformCandidates([]);
      reportMessage("The related Exhibit list is unavailable. You can still create a new Exhibit.", "alert");
    }
  }

  function closeClosureDialog() {
    if (isTransitioning) return;
    setClosureAction(undefined);
  }

  async function applyClosureCeremony() {
    if (exhibit === undefined || closureAction === undefined) return;
    if (!canApplyClosureAction(exhibit, closureAction)) {
      setClosureAction(undefined);
      reportMessage("This ceremony is no longer available for the current Exhibit status.", "alert");
      return;
    }
    if (closureAction === "release" && !releaseAcknowledged) return;
    if (closureAction === "transform" && transformMode === "existing" && !relatedExhibitId) {
      reportMessage("Choose an existing Exhibit, or create a new one for this transformation.", "alert");
      return;
    }
    if (closureAction === "transform" && transformMode === "new" && (!newExhibitTitle.trim() || !newExhibitLabel.trim())) {
      reportMessage("Give the new Exhibit a title and museum label before transforming.", "alert");
      return;
    }

    setIsTransitioning(true);
    setMessage(undefined);
    try {
      const occurredAt = new Date();
      const updated = closureAction === "transform"
        ? transformMode === "existing"
          ? await repository.transformExhibit(exhibit.id, relatedExhibitId, occurredAt)
          : await repository.transformExhibitToNew(exhibit.id, {
            title: newExhibitTitle,
            type: newExhibitType,
            museumLabel: newExhibitLabel,
          }, occurredAt)
        : await repository.transitionExhibit(exhibit.id, {
          action: closureAction,
          occurredAt,
          ...(closureAction === "release" ? { confirmed: true } : {}),
        });
      setExhibit(updated);
      setFormValues(updated);
      shouldRestoreClosureFocusRef.current = true;
      setClosureAction(undefined);
      reportMessage(closureAction === "transform" ? "This Exhibit has been transformed and linked." : `${closureLabels[closureAction]} ceremony recorded.`);
      void refreshTimeline(updated.id);
    } catch {
      reportMessage("The ceremony could not be recorded. Your Exhibit has not been changed.", "alert");
    } finally {
      setIsTransitioning(false);
    }
  }

  useEffect(() => {
    if (closureAction !== undefined || !shouldRestoreClosureFocusRef.current) return;
    shouldRestoreClosureFocusRef.current = false;
    exhibitHeadingRef.current?.focus();
  }, [closureAction]);

  if (exhibitId === undefined) {
    return (
      <main className="mx-auto w-full max-w-2xl">
        <Empty className="border">
          <EmptyHeader><EmptyTitle aria-level={1} role="heading">Choose an Exhibit</EmptyTitle><EmptyDescription>Open an Exhibit from the Museum to visit its story and artifacts.</EmptyDescription></EmptyHeader>
          <EmptyContent><Link className={buttonVariants({ variant: "secondary" })} href="/museum">Return to the Museum</Link></EmptyContent>
        </Empty>
      </main>
    );
  }
  if (loadError) {
    return (
      <main className="mx-auto grid w-full max-w-2xl gap-4">
        <Alert variant="destructive">
          <AlertTitle>This Exhibit could not be opened.</AlertTitle>
          <AlertDescription>Your local records have not been changed. Try opening this Exhibit again when the browser is ready.</AlertDescription>
        </Alert>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setLoadAttempt((current) => current + 1)}>Try opening this Exhibit again</Button>
          <Link className={buttonVariants({ variant: "secondary" })} href="/museum">Return to the Museum</Link>
        </div>
      </main>
    );
  }
  if (isLoading || (!isMissing && exhibit?.id !== exhibitId)) {
    return <main className="mx-auto grid w-full max-w-5xl gap-4" role="status" aria-label="Opening this Exhibit"><Skeleton className="h-40 w-full" /><Skeleton className="h-72 w-full" /></main>;
  }
  if (isMissing || exhibit === undefined) {
    return (
      <main className="mx-auto w-full max-w-2xl">
        <Empty className="border">
          <EmptyHeader><EmptyTitle aria-level={1} role="heading">That Exhibit is not here</EmptyTitle><EmptyDescription>It may have been removed, or the link may be incomplete.</EmptyDescription></EmptyHeader>
          <EmptyContent><Link className={buttonVariants({ variant: "secondary" })} href="/museum">Return to the Museum</Link></EmptyContent>
        </Empty>
      </main>
    );
  }

  const rooms = getExhibitRooms(exhibit);
  const transformExhibitOptions = [
    { label: "Choose an Exhibit", value: null },
    ...transformCandidates.map((candidate) => ({ label: `${candidate.title} — ${candidate.museumLabel}`, value: candidate.id })),
  ];

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-2"><Badge>{formatLabel(exhibit.type)}</Badge><Badge variant="outline">{formatLabel(exhibit.status)}</Badge></div>
          <CardTitle><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl" ref={exhibitHeadingRef} tabIndex={-1}>{exhibit.title}</h1></CardTitle>
          <CardDescription>{exhibit.museumLabel}</CardDescription>
        </CardHeader>
        <CardFooter className="flex-wrap gap-2">
          <Link className={buttonVariants({ variant: "ghost" })} href="/museum">Museum</Link>
          <Button onClick={() => { setFormValues(exhibit); setIsEditing(true); }}>Edit Exhibit</Button>
          {(["revive", "archive", "complete", "transform", "release"] as ClosureAction[])
            .filter((action) => canApplyClosureAction(exhibit, action))
            .map((action) => <Button key={action} onClick={() => void openClosureDialog(action)} variant="secondary">{closureLabels[action]}</Button>)}
        </CardFooter>
      </Card>

      {message !== undefined ? <Alert role={message.intent} variant={message.intent === "alert" ? "destructive" : "default"}><AlertTitle>{message.intent === "alert" ? "Needs attention" : "Collection updated"}</AlertTitle><AlertDescription>{message.text}</AlertDescription></Alert> : null}

      {isEditing ? (
        <Card>
          <form noValidate onSubmit={saveChanges}>
            <CardHeader><CardTitle>Edit this Exhibit</CardTitle><CardDescription>Update the catalog details without losing the original record.</CardDescription></CardHeader>
            <CardContent>
              <FieldGroup>
                <Field><FieldLabel htmlFor="detail-title">Working title</FieldLabel><Input id="detail-title" onChange={(event) => setTitle(event.target.value)} value={title} /></Field>
                <Field><FieldLabel htmlFor="detail-type">Exhibit type</FieldLabel><ExhibitTypeSelect id="detail-type" onValueChange={setType} value={type} /></Field>
                <Field><FieldLabel htmlFor="detail-label">Museum label</FieldLabel><Input id="detail-label" onChange={(event) => setMuseumLabel(event.target.value)} value={museumLabel} /></Field>
                <Field><FieldLabel htmlFor="detail-started">Why it started</FieldLabel><Textarea id="detail-started" onChange={(event) => setWhyStarted(event.target.value)} value={whyStarted} /></Field>
                <Field><FieldLabel htmlFor="detail-stopped">Why it stopped</FieldLabel><Textarea id="detail-stopped" onChange={(event) => setWhyStopped(event.target.value)} value={whyStopped} /></Field>
                <Field><FieldLabel htmlFor="detail-taught">What it taught me</FieldLabel><Textarea id="detail-taught" onChange={(event) => setWhatItTaughtMe(event.target.value)} value={whatItTaughtMe} /></Field>
                <Field><FieldLabel htmlFor="detail-tags">Tags</FieldLabel><Input id="detail-tags" onChange={(event) => setTags(event.target.value)} value={tags} /></Field>
              </FieldGroup>
            </CardContent>
            <CardFooter className="flex-wrap justify-end gap-2"><Button onClick={() => setIsEditing(false)} variant="outline">Cancel editing</Button><Button type="submit">Save changes</Button></CardFooter>
          </form>
        </Card>
      ) : (
        <Card aria-labelledby="exhibit-story-title">
          <CardHeader><CardTitle id="exhibit-story-title">The story so far</CardTitle><CardDescription>Where this work belongs and what remains with it.</CardDescription></CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-[minmax(12rem,0.6fr)_minmax(0,1.4fr)]">
            <div className="flex flex-col gap-3"><h3 className="text-sm font-medium">Rooms</h3><ul aria-label="Museum rooms" className="flex list-none flex-wrap gap-2 p-0">{rooms.map((room) => <li key={room}><Badge variant="secondary">{roomLabels[room]}</Badge></li>)}</ul></div>
            <div className="flex flex-col gap-4"><dl className="grid gap-4">
              {exhibit.whyStarted !== undefined ? <div><dt className="text-sm font-medium">Why it started</dt><dd className="text-sm text-muted-foreground">{exhibit.whyStarted}</dd></div> : null}
              {exhibit.whyStopped !== undefined ? <div><dt className="text-sm font-medium">Why it stopped</dt><dd className="text-sm text-muted-foreground">{exhibit.whyStopped}</dd></div> : null}
              {exhibit.whatItTaughtMe !== undefined ? <div><dt className="text-sm font-medium">What it taught me</dt><dd className="text-sm text-muted-foreground">{exhibit.whatItTaughtMe}</dd></div> : null}
            </dl>{exhibit.tags.length > 0 ? <ul aria-label="Exhibit tags" className="flex list-none flex-wrap gap-2 p-0">{exhibit.tags.map((tag) => <li key={tag}><Badge variant="outline">{tag}</Badge></li>)}</ul> : null}</div>
          </CardContent>
        </Card>
      )}

      <AlmostTimeline error={isTimelineUnavailable} history={history} isLoading={isTimelineLoading} />

      <Card aria-labelledby="artifact-title">
        <CardHeader><CardTitle id="artifact-title">Kept with this Exhibit</CardTitle><CardDescription>A note, link, or local file can stay with this work.</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-6">
          {artifacts.length > 0 ? <ul className="grid list-none gap-4 p-0 md:grid-cols-2">{artifacts.map((artifact) => <ArtifactCard artifact={artifact} key={artifact.id} onRemove={removeArtifact} />)}</ul> : <Empty><EmptyHeader><EmptyTitle>No artifacts yet</EmptyTitle><EmptyDescription>Attach the evidence that helps this Exhibit keep its context.</EmptyDescription></EmptyHeader></Empty>}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card size="sm"><CardHeader><CardTitle>Add a link</CardTitle></CardHeader><CardContent><FieldGroup><Field><FieldLabel htmlFor="detail-link-label">Link label</FieldLabel><Input id="detail-link-label" onChange={(event) => setLinkLabel(event.target.value)} value={linkLabel} /></Field><Field><FieldLabel htmlFor="detail-link-address">Link address</FieldLabel><Input id="detail-link-address" onChange={(event) => setLinkAddress(event.target.value)} type="url" value={linkAddress} /></Field></FieldGroup></CardContent><CardFooter><Button onClick={() => void addLink()} variant="secondary">Add link</Button></CardFooter></Card>
            <Card size="sm"><CardHeader><CardTitle>Add a note</CardTitle></CardHeader><CardContent><FieldGroup><Field><FieldLabel htmlFor="detail-note-label">Note label</FieldLabel><Input id="detail-note-label" onChange={(event) => setNoteLabel(event.target.value)} value={noteLabel} /></Field><Field><FieldLabel htmlFor="detail-note">Note</FieldLabel><Textarea id="detail-note" onChange={(event) => setNote(event.target.value)} value={note} /></Field></FieldGroup></CardContent><CardFooter><Button onClick={() => void addNote()} variant="secondary">Add note</Button></CardFooter></Card>
            <Card size="sm"><CardHeader><CardTitle>Add a local file</CardTitle></CardHeader><CardContent><Field><FieldLabel htmlFor="detail-file">Image, PDF, or audio</FieldLabel><Input accept="image/*,application/pdf,audio/*" id="detail-file" onChange={(event) => void addFile(event)} type="file" /></Field></CardContent></Card>
          </div>
        </CardContent>
      </Card>

      {closureAction !== undefined ? (
        <Dialog onOpenChange={(isOpen) => { if (!isOpen) closeClosureDialog(); }} open>
          <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{closureDialogTitles[closureAction]}</DialogTitle>
              <DialogDescription>{closureAction === "transform" ? "Choose an existing Exhibit or begin a linked successor. Both records will remain connected." : "This records a new status change in the Exhibit timeline."}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
            {closureAction === "transform" ? (
              <FieldSet><FieldLegend variant="label">Transformation target</FieldLegend><RadioGroup onValueChange={(value) => setTransformMode(value as "existing" | "new")} value={transformMode}>
                <Field orientation="horizontal"><RadioGroupItem id="transform-existing-choice" value="existing" /><FieldLabel htmlFor="transform-existing-choice">Create a link to an existing Exhibit</FieldLabel></Field>
                {transformMode === "existing" ? <Field><FieldLabel htmlFor="transform-existing">Existing Exhibit</FieldLabel><Select items={transformExhibitOptions} onValueChange={(value) => setRelatedExhibitId(value ?? "")} value={relatedExhibitId || null}><SelectTrigger className="w-full" id="transform-existing"><SelectValue placeholder="Choose an Exhibit" /></SelectTrigger><SelectContent><SelectGroup>{transformExhibitOptions.map((option) => <SelectItem key={option.value ?? "empty"} value={option.value}>{option.label}</SelectItem>)}</SelectGroup></SelectContent></Select></Field> : null}
                <Field orientation="horizontal"><RadioGroupItem id="transform-new-choice" value="new" /><FieldLabel htmlFor="transform-new-choice">Create a new Exhibit</FieldLabel></Field>
                {transformMode === "new" ? <FieldGroup><Field><FieldLabel htmlFor="transform-new-title">New Exhibit title</FieldLabel><Input id="transform-new-title" onChange={(event) => setNewExhibitTitle(event.target.value)} value={newExhibitTitle} /></Field><Field><FieldLabel htmlFor="transform-new-type">New Exhibit type</FieldLabel><ExhibitTypeSelect id="transform-new-type" onValueChange={setNewExhibitType} value={newExhibitType} /></Field><Field><FieldLabel htmlFor="transform-new-label">New Exhibit label</FieldLabel><Input id="transform-new-label" onChange={(event) => setNewExhibitLabel(event.target.value)} value={newExhibitLabel} /></Field></FieldGroup> : null}
              </RadioGroup></FieldSet>
            ) : null}
            {closureAction === "release" ? <Field orientation="horizontal"><Checkbox checked={releaseAcknowledged} id="release-acknowledgement" onCheckedChange={setReleaseAcknowledged} /><FieldLabel htmlFor="release-acknowledgement">I understand this Exhibit will be released from the active collection.</FieldLabel></Field> : null}
            </div>
            <DialogFooter>
              <Button disabled={isTransitioning} onClick={closeClosureDialog} variant="outline">Cancel</Button>
              <Button disabled={isTransitioning || (closureAction === "release" && !releaseAcknowledged)} onClick={() => void applyClosureCeremony()}>{isTransitioning ? "Recording ceremony…" : closureAction === "transform" ? "Transform Exhibit" : closureConfirmLabels[closureAction]}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </main>
  );
}
