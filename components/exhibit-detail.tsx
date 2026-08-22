"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";

import { validateArtifactFile } from "@/lib/artifacts/file-validation";
import { subscribeToLocationSearch } from "@/lib/browser/location-search";
import { getExhibitRooms, type Artifact, type Exhibit, type ExhibitType } from "@/lib/domain";
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
          <p className="museum-eyebrow">{formatLabel(artifact.kind)}</p>
          <h3>{artifact.label}</h3>
        </div>
        <button className="museum-button museum-button--quiet" onClick={() => onRemove(artifact)} type="button">Remove {artifact.label}</button>
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
  const [exhibit, setExhibit] = useState<Exhibit>();
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [isLoading, setIsLoading] = useState(exhibitId !== undefined);
  const [isMissing, setIsMissing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<string>();
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

  function setFormValues(nextExhibit: Exhibit) {
    setTitle(nextExhibit.title);
    setType(nextExhibit.type);
    setMuseumLabel(nextExhibit.museumLabel);
    setWhyStarted(nextExhibit.whyStarted ?? "");
    setWhyStopped(nextExhibit.whyStopped ?? "");
    setWhatItTaughtMe(nextExhibit.whatItTaughtMe ?? "");
    setTags(nextExhibit.tags.join(", "));
  }

  function clearDetailState() {
    setExhibit(undefined);
    setArtifacts([]);
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
    } catch {
      if (!isCurrentRequest()) return;
      clearDetailState();
      setIsMissing(true);
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
      void loadExhibit(exhibitId, version);
    }

    return () => {
      if (requestVersion.current === version) requestVersion.current += 1;
    };
  // The repository is intentionally stable for a mounted detail view.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exhibitId, repository]);

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
      setMessage("Exhibit details saved.");
    } catch {
      setMessage("Your changes are still here. Please check the required fields and try again.");
    }
  }

  async function addLink() {
    if (exhibit === undefined) return;
    if (!linkLabel.trim() || !linkAddress.trim()) {
      setMessage("Add a label and a complete link address before saving the link.");
      return;
    }
    try {
      new URL(linkAddress.trim());
      const artifact = await repository.addArtifact(exhibit.id, { kind: "link", label: linkLabel, url: linkAddress });
      setArtifacts((current) => [...current, artifact]);
      setLinkLabel("");
      setLinkAddress("");
      setMessage("Link added to this Exhibit.");
    } catch {
      setMessage("Use a complete link address, including https://.");
    }
  }

  async function addNote() {
    if (exhibit === undefined) return;
    if (!noteLabel.trim() || !note.trim()) {
      setMessage("Add a label and text before saving the note.");
      return;
    }
    try {
      const artifact = await repository.addArtifact(exhibit.id, { kind: "note", label: noteLabel, note });
      setArtifacts((current) => [...current, artifact]);
      setNoteLabel("");
      setNote("");
      setMessage("Note added to this Exhibit.");
    } catch {
      setMessage("Your note is still here. Please try again.");
    }
  }

  async function addFile(event: ChangeEvent<HTMLInputElement>) {
    if (exhibit === undefined) return;
    const file = event.currentTarget.files?.item(0);
    event.currentTarget.value = "";
    if (file === null || file === undefined) return;
    const validation = validateArtifactFile(file);
    if (!validation.valid) {
      setMessage(validation.message);
      return;
    }
    try {
      const artifact = await repository.addArtifact(exhibit.id, {
        ...validation.artifact,
        label: validation.artifact.fileName,
      });
      setArtifacts((current) => [...current, artifact]);
      setMessage("Local file added to this Exhibit.");
    } catch {
      setMessage("Your file was not added. Please try again.");
    }
  }

  async function removeArtifact(artifact: Artifact) {
    try {
      await repository.removeArtifact(artifact.id);
      setArtifacts((current) => current.filter((item) => item.id !== artifact.id));
      setMessage("Attachment removed from this Exhibit.");
    } catch {
      setMessage("That attachment could not be removed. Please try again.");
    }
  }

  if (exhibitId === undefined) {
    return <main className="exhibit-detail exhibit-detail--missing"><p className="museum-eyebrow">Exhibit</p><h1>Choose an Exhibit</h1><p>Open an Exhibit from the Museum to visit its story and artifacts.</p><Link className="museum-button museum-button--secondary" href="/museum">Return to the Museum</Link></main>;
  }
  if (isLoading || (!isMissing && exhibit?.id !== exhibitId)) return <main className="exhibit-detail"><p role="status">Opening this Exhibit…</p></main>;
  if (isMissing || exhibit === undefined) {
    return <main className="exhibit-detail exhibit-detail--missing"><p className="museum-eyebrow">Not found</p><h1>That Exhibit is not here</h1><p>It may have been removed, or the link may be incomplete.</p><Link className="museum-button museum-button--secondary" href="/museum">Return to the Museum</Link></main>;
  }

  const rooms = getExhibitRooms(exhibit);
  return (
    <main className="exhibit-detail">
      <header className="exhibit-detail__header">
        <div>
          <p className="museum-eyebrow">{formatLabel(exhibit.type)} / {formatLabel(exhibit.status)}</p>
          <h1>{exhibit.title}</h1>
          <p>{exhibit.museumLabel}</p>
        </div>
        <div className="exhibit-detail__actions">
          <Link className="museum-button museum-button--quiet" href="/museum">Museum</Link>
          <button className="museum-button museum-button--primary" onClick={() => { setFormValues(exhibit); setIsEditing(true); }} type="button">Edit Exhibit</button>
        </div>
      </header>

      {message !== undefined ? <p className="exhibit-detail__message" role="status">{message}</p> : null}

      {isEditing ? (
        <form className="exhibit-detail__edit" noValidate onSubmit={saveChanges}>
          <h2>Edit this Exhibit</h2>
          <label className="museum-field" htmlFor="detail-title"><span className="museum-field__label">Working title</span><input className="museum-input" id="detail-title" onChange={(event) => setTitle(event.target.value)} value={title} /></label>
          <label className="museum-field" htmlFor="detail-type"><span className="museum-field__label">Exhibit type</span><select className="museum-input" id="detail-type" onChange={(event) => setType(event.target.value as ExhibitType)} value={type}>{exhibitTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="museum-field" htmlFor="detail-label"><span className="museum-field__label">Museum label</span><input className="museum-input" id="detail-label" onChange={(event) => setMuseumLabel(event.target.value)} value={museumLabel} /></label>
          <label className="museum-field" htmlFor="detail-started"><span className="museum-field__label">Why it started</span><textarea className="museum-input" id="detail-started" onChange={(event) => setWhyStarted(event.target.value)} value={whyStarted} /></label>
          <label className="museum-field" htmlFor="detail-stopped"><span className="museum-field__label">Why it stopped</span><textarea className="museum-input" id="detail-stopped" onChange={(event) => setWhyStopped(event.target.value)} value={whyStopped} /></label>
          <label className="museum-field" htmlFor="detail-taught"><span className="museum-field__label">What it taught me</span><textarea className="museum-input" id="detail-taught" onChange={(event) => setWhatItTaughtMe(event.target.value)} value={whatItTaughtMe} /></label>
          <label className="museum-field" htmlFor="detail-tags"><span className="museum-field__label">Tags</span><input className="museum-input" id="detail-tags" onChange={(event) => setTags(event.target.value)} value={tags} /></label>
          <div className="exhibit-detail__actions"><button className="museum-button museum-button--primary" type="submit">Save changes</button><button className="museum-button museum-button--secondary" onClick={() => setIsEditing(false)} type="button">Cancel editing</button></div>
        </form>
      ) : (
        <section className="exhibit-detail__story" aria-labelledby="exhibit-story-title">
          <div><p className="museum-eyebrow">Rooms</p><ul aria-label="Museum rooms">{rooms.map((room) => <li key={room}>{roomLabels[room]}</li>)}</ul></div>
          <div><h2 id="exhibit-story-title">The story so far</h2><dl>
            {exhibit.whyStarted !== undefined ? <div><dt>Why it started</dt><dd>{exhibit.whyStarted}</dd></div> : null}
            {exhibit.whyStopped !== undefined ? <div><dt>Why it stopped</dt><dd>{exhibit.whyStopped}</dd></div> : null}
            {exhibit.whatItTaughtMe !== undefined ? <div><dt>What it taught me</dt><dd>{exhibit.whatItTaughtMe}</dd></div> : null}
          </dl>{exhibit.tags.length > 0 ? <ul aria-label="Exhibit tags" className="museum-gallery__tags">{exhibit.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul> : null}</div>
        </section>
      )}

      <section className="exhibit-detail__artifacts" aria-labelledby="artifact-title">
        <header><p className="museum-eyebrow">Artifacts</p><h2 id="artifact-title">Kept with this Exhibit</h2></header>
        {artifacts.length > 0 ? <ul>{artifacts.map((artifact) => <ArtifactCard artifact={artifact} key={artifact.id} onRemove={removeArtifact} />)}</ul> : <p>Nothing is attached yet. A note, link, or local file can stay with this work.</p>}
        <div className="exhibit-detail__attachment-forms">
          <div><h3>Add a link</h3><label className="museum-field" htmlFor="detail-link-label"><span className="museum-field__label">Link label</span><input className="museum-input" id="detail-link-label" onChange={(event) => setLinkLabel(event.target.value)} value={linkLabel} /></label><label className="museum-field" htmlFor="detail-link-address"><span className="museum-field__label">Link address</span><input className="museum-input" id="detail-link-address" onChange={(event) => setLinkAddress(event.target.value)} value={linkAddress} /></label><button className="museum-button museum-button--secondary" onClick={() => void addLink()} type="button">Add link</button></div>
          <div><h3>Add a note</h3><label className="museum-field" htmlFor="detail-note-label"><span className="museum-field__label">Note label</span><input className="museum-input" id="detail-note-label" onChange={(event) => setNoteLabel(event.target.value)} value={noteLabel} /></label><label className="museum-field" htmlFor="detail-note"><span className="museum-field__label">Note</span><textarea className="museum-input" id="detail-note" onChange={(event) => setNote(event.target.value)} value={note} /></label><button className="museum-button museum-button--secondary" onClick={() => void addNote()} type="button">Add note</button></div>
          <div><h3>Add a local file</h3><label className="museum-field" htmlFor="detail-file"><span className="museum-field__label">Image, PDF, or audio</span><input accept="image/*,application/pdf,audio/*" className="museum-input" id="detail-file" onChange={(event) => void addFile(event)} type="file" /></label></div>
        </div>
      </section>
    </main>
  );
}
