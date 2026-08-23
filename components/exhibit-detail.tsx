"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";

import { AlmostTimeline } from "@/components/almost-timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
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
    <div className="exhibit-detail__file-preview">
      {artifact.kind === "image" ? (
        // Local object URLs are intentionally not eligible for Next image optimization.
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={artifact.label} src={objectUrl} />
      ) : null}
      {artifact.kind === "pdf" ? <iframe aria-label={artifact.label} src={objectUrl} title={artifact.label} /> : null}
      {artifact.kind === "audio" ? <audio aria-label={artifact.label} controls src={objectUrl} /> : null}
      <a download={artifact.fileName ?? artifact.label} href={objectUrl}>Download {artifact.label}</a>
    </div>
  );
}

function ArtifactCard({ artifact, onRemove }: Readonly<{ artifact: Artifact; onRemove: (artifact: Artifact) => void }>) {
  return (
    <li className="exhibit-detail__artifact">
      <div className="exhibit-detail__artifact-heading">
        <div>
          <Badge variant="outline">{formatLabel(artifact.kind)}</Badge>
          <h3>{artifact.label}</h3>
        </div>
        <Button onClick={() => onRemove(artifact)} variant="quiet">Remove {artifact.label}</Button>
      </div>
      <ArtifactPreview artifact={artifact} />
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

  if (exhibitId === undefined) {
    return <main className="exhibit-detail exhibit-detail--missing"><p className="museum-eyebrow">Exhibit</p><h1>Choose an Exhibit</h1><p>Open an Exhibit from the Museum to visit its story and artifacts.</p><Button asChild variant="secondary"><Link href="/museum">Return to the Museum</Link></Button></main>;
  }
  if (loadError) {
    return (
      <main className="exhibit-detail exhibit-detail--missing">
        <p className="museum-eyebrow">Connection to your collection interrupted</p>
        <h1>This Exhibit could not be opened.</h1>
        <p role="alert">This Exhibit could not be opened. Your local records have not been changed. Try opening this Exhibit again when the browser is ready.</p>
        <div className="exhibit-detail__actions">
          <Button onClick={() => setLoadAttempt((current) => current + 1)}>Try opening this Exhibit again</Button>
          <Button asChild variant="secondary"><Link href="/museum">Return to the Museum</Link></Button>
        </div>
      </main>
    );
  }
  if (isLoading || (!isMissing && exhibit?.id !== exhibitId)) return <main className="exhibit-detail"><p role="status">Opening this Exhibit…</p></main>;
  if (isMissing || exhibit === undefined) {
    return <main className="exhibit-detail exhibit-detail--missing"><p className="museum-eyebrow">Not found</p><h1>That Exhibit is not here</h1><p>It may have been removed, or the link may be incomplete.</p><Button asChild variant="secondary"><Link href="/museum">Return to the Museum</Link></Button></main>;
  }

  const rooms = getExhibitRooms(exhibit);
  return (
    <main className="exhibit-detail">
      <header className="exhibit-detail__header">
        <div>
          <p className="museum-eyebrow">{formatLabel(exhibit.type)} / {formatLabel(exhibit.status)}</p>
          <h1 ref={exhibitHeadingRef} tabIndex={-1}>{exhibit.title}</h1>
          <p>{exhibit.museumLabel}</p>
        </div>
        <div className="exhibit-detail__actions">
          <Button asChild variant="quiet"><Link href="/museum">Museum</Link></Button>
          <Button onClick={() => { setFormValues(exhibit); setIsEditing(true); }}>Edit Exhibit</Button>
          {(["revive", "archive", "complete", "transform", "release"] as ClosureAction[])
            .filter((action) => canApplyClosureAction(exhibit, action))
            .map((action) => <Button key={action} onClick={() => void openClosureDialog(action)} variant="secondary">{closureLabels[action]}</Button>)}
        </div>
      </header>

      {message !== undefined ? <p className="exhibit-detail__message" role={message.intent}>{message.text}</p> : null}

      {isEditing ? (
        <form className="exhibit-detail__edit" noValidate onSubmit={saveChanges}>
          <h2>Edit this Exhibit</h2>
          <Field className="museum-field"><FieldLabel htmlFor="detail-title">Working title</FieldLabel><Input id="detail-title" label="" onChange={(event) => setTitle(event.target.value)} value={title} /></Field>
          <Field className="museum-field"><FieldLabel htmlFor="detail-type">Exhibit type</FieldLabel><NativeSelect className="w-full" id="detail-type" onChange={(event) => setType(event.target.value as ExhibitType)} value={type}>{exhibitTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</NativeSelect></Field>
          <Field className="museum-field"><FieldLabel htmlFor="detail-label">Museum label</FieldLabel><Input id="detail-label" label="" onChange={(event) => setMuseumLabel(event.target.value)} value={museumLabel} /></Field>
          <Field className="museum-field"><FieldLabel htmlFor="detail-started">Why it started</FieldLabel><Textarea id="detail-started" onChange={(event) => setWhyStarted(event.target.value)} value={whyStarted} /></Field>
          <Field className="museum-field"><FieldLabel htmlFor="detail-stopped">Why it stopped</FieldLabel><Textarea id="detail-stopped" onChange={(event) => setWhyStopped(event.target.value)} value={whyStopped} /></Field>
          <Field className="museum-field"><FieldLabel htmlFor="detail-taught">What it taught me</FieldLabel><Textarea id="detail-taught" onChange={(event) => setWhatItTaughtMe(event.target.value)} value={whatItTaughtMe} /></Field>
          <Field className="museum-field"><FieldLabel htmlFor="detail-tags">Tags</FieldLabel><Input id="detail-tags" label="" onChange={(event) => setTags(event.target.value)} value={tags} /></Field>
          <div className="exhibit-detail__actions"><Button type="submit">Save changes</Button><Button onClick={() => setIsEditing(false)} variant="secondary">Cancel editing</Button></div>
        </form>
      ) : (
        <section className="exhibit-detail__story" aria-labelledby="exhibit-story-title">
          <div><p className="museum-eyebrow">Rooms</p><ul aria-label="Museum rooms">{rooms.map((room) => <li key={room}>{roomLabels[room]}</li>)}</ul></div>
          <div><h2 id="exhibit-story-title">The story so far</h2><dl>
            {exhibit.whyStarted !== undefined ? <div><dt>Why it started</dt><dd>{exhibit.whyStarted}</dd></div> : null}
            {exhibit.whyStopped !== undefined ? <div><dt>Why it stopped</dt><dd>{exhibit.whyStopped}</dd></div> : null}
            {exhibit.whatItTaughtMe !== undefined ? <div><dt>What it taught me</dt><dd>{exhibit.whatItTaughtMe}</dd></div> : null}
          </dl>{exhibit.tags.length > 0 ? <ul aria-label="Exhibit tags" className="museum-gallery__tags">{exhibit.tags.map((tag) => <li key={tag}><Badge variant="outline">{tag}</Badge></li>)}</ul> : null}</div>
        </section>
      )}

      <AlmostTimeline error={isTimelineUnavailable} history={history} isLoading={isTimelineLoading} />

      <section className="exhibit-detail__artifacts" aria-labelledby="artifact-title">
        <header><p className="museum-eyebrow">Artifacts</p><h2 id="artifact-title">Kept with this Exhibit</h2></header>
        {artifacts.length > 0 ? <ul>{artifacts.map((artifact) => <ArtifactCard artifact={artifact} key={artifact.id} onRemove={removeArtifact} />)}</ul> : <p>Nothing is attached yet. A note, link, or local file can stay with this work.</p>}
        <div className="exhibit-detail__attachment-forms">
          <div><h3>Add a link</h3><Field className="museum-field"><FieldLabel htmlFor="detail-link-label">Link label</FieldLabel><Input id="detail-link-label" label="" onChange={(event) => setLinkLabel(event.target.value)} value={linkLabel} /></Field><Field className="museum-field"><FieldLabel htmlFor="detail-link-address">Link address</FieldLabel><Input id="detail-link-address" label="" onChange={(event) => setLinkAddress(event.target.value)} value={linkAddress} /></Field><Button onClick={() => void addLink()} variant="secondary">Add link</Button></div>
          <div><h3>Add a note</h3><Field className="museum-field"><FieldLabel htmlFor="detail-note-label">Note label</FieldLabel><Input id="detail-note-label" label="" onChange={(event) => setNoteLabel(event.target.value)} value={noteLabel} /></Field><Field className="museum-field"><FieldLabel htmlFor="detail-note">Note</FieldLabel><Textarea id="detail-note" onChange={(event) => setNote(event.target.value)} value={note} /></Field><Button onClick={() => void addNote()} variant="secondary">Add note</Button></div>
          <div><h3>Add a local file</h3><label className="museum-field" htmlFor="detail-file"><span className="museum-field__label">Image, PDF, or audio</span><input accept="image/*,application/pdf,audio/*" className="museum-input" id="detail-file" onChange={(event) => void addFile(event)} type="file" /></label></div>
        </div>
      </section>

      {closureAction !== undefined ? (
        <Dialog
          description={closureAction === "transform"
            ? "Choose an existing Exhibit or begin a linked successor. Both records will remain connected."
            : "This records a new status change in the Exhibit timeline."}
          isOpen
          onOpenChange={(isOpen) => { if (!isOpen) closeClosureDialog(); }}
          restoreFocusRef={exhibitHeadingRef}
          shouldRestoreFocusRef={shouldRestoreClosureFocusRef}
          title={closureDialogTitles[closureAction]}
        >
          <div className="exhibit-detail__closure-dialog">
            {closureAction === "transform" ? (
              <>
                <label className="museum-field exhibit-detail__choice"><input checked={transformMode === "existing"} name="transform-target" onChange={() => setTransformMode("existing")} type="radio" /> <span>Create a link to an existing Exhibit</span></label>
                {transformMode === "existing" ? <Field className="museum-field"><FieldLabel htmlFor="transform-existing">Existing Exhibit</FieldLabel><NativeSelect className="w-full" id="transform-existing" onChange={(event) => setRelatedExhibitId(event.target.value)} value={relatedExhibitId}><option value="">Choose an Exhibit</option>{transformCandidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title} — {candidate.museumLabel}</option>)}</NativeSelect></Field> : null}
                <label className="museum-field exhibit-detail__choice"><input checked={transformMode === "new"} name="transform-target" onChange={() => setTransformMode("new")} type="radio" /> <span>Create a new Exhibit</span></label>
                {transformMode === "new" ? <div className="exhibit-detail__new-target"><Field className="museum-field"><FieldLabel htmlFor="transform-new-title">New Exhibit title</FieldLabel><Input id="transform-new-title" label="" onChange={(event) => setNewExhibitTitle(event.target.value)} value={newExhibitTitle} /></Field><Field className="museum-field"><FieldLabel htmlFor="transform-new-type">New Exhibit type</FieldLabel><NativeSelect className="w-full" id="transform-new-type" onChange={(event) => setNewExhibitType(event.target.value as ExhibitType)} value={newExhibitType}>{exhibitTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</NativeSelect></Field><Field className="museum-field"><FieldLabel htmlFor="transform-new-label">New Exhibit label</FieldLabel><Input id="transform-new-label" label="" onChange={(event) => setNewExhibitLabel(event.target.value)} value={newExhibitLabel} /></Field></div> : null}
              </>
            ) : null}
            {closureAction === "release" ? <label className="museum-field exhibit-detail__choice"><input checked={releaseAcknowledged} onChange={(event) => setReleaseAcknowledged(event.target.checked)} type="checkbox" /> <span>I understand this Exhibit will be released from the active collection.</span></label> : null}
            <div className="exhibit-detail__actions">
              <Button disabled={isTransitioning} onClick={closeClosureDialog} variant="secondary">Cancel</Button>
              <Button disabled={isTransitioning || (closureAction === "release" && !releaseAcknowledged)} onClick={() => void applyClosureCeremony()}>{isTransitioning ? "Recording ceremony…" : closureAction === "transform" ? "Transform Exhibit" : closureConfirmLabels[closureAction]}</Button>
            </div>
          </div>
        </Dialog>
      ) : null}
    </main>
  );
}
