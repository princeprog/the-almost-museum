"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";

import { validateArtifactFile, type ValidatedFileArtifact } from "@/lib/artifacts/file-validation";
import { getStorageQuotaWarning } from "@/lib/artifacts/storage-quota";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { ExhibitStatus, ExhibitType } from "@/lib/domain";
import { ExhibitRepository, type CaptureArtifactInput } from "@/lib/persistence";

const exhibitTypes: Array<{ value: ExhibitType; label: string }> = [
  { value: "project", label: "Project" },
  { value: "draft", label: "Draft" },
  { value: "idea", label: "Idea" },
  { value: "experiment", label: "Experiment" },
  { value: "message", label: "Message" },
];

const initialStatuses: Array<{ value: Extract<ExhibitStatus, "unfinished" | "active">; label: string }> = [
  { value: "unfinished", label: "Unfinished" },
  { value: "active", label: "Active" },
];

interface LinkEvidenceDraft {
  kind: "link";
  label: string;
  value: string;
}

interface NoteEvidenceDraft {
  kind: "note";
  label: string;
  value: string;
}

interface FileEvidenceDraft extends ValidatedFileArtifact {
  previewUrl: string;
}

type EvidenceDraft = LinkEvidenceDraft | NoteEvidenceDraft | FileEvidenceDraft;

export interface ExhibitCaptureProps {
  repository?: ExhibitRepository;
  onNavigate?: (href: string) => void;
}

function optionalValue(value: string): string | undefined {
  return value.trim() || undefined;
}

function browserNavigate(href: string): void {
  window.location.assign(href);
}

function pendingFileBytes(evidence: EvidenceDraft[]): number {
  return evidence.reduce((total, item) => total + ("previewUrl" in item ? item.byteSize : 0), 0);
}

/** Client-side, local-first capture flow for a single Exhibit and its optional written evidence. */
export function ExhibitCapture({ repository: suppliedRepository, onNavigate = browserNavigate }: Readonly<ExhibitCaptureProps>) {
  const [repository] = useState(() => suppliedRepository ?? new ExhibitRepository());
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ExhibitType | "">("");
  const [status, setStatus] = useState<"unfinished" | "active" | "">("unfinished");
  const [tags, setTags] = useState("");
  const [museumLabel, setMuseumLabel] = useState("");
  const [whyStarted, setWhyStarted] = useState("");
  const [whyStopped, setWhyStopped] = useState("");
  const [whatItTaughtMe, setWhatItTaughtMe] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [linkAddress, setLinkAddress] = useState("");
  const [noteLabel, setNoteLabel] = useState("");
  const [note, setNote] = useState("");
  const [evidence, setEvidence] = useState<EvidenceDraft[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [quotaWarning, setQuotaWarning] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const previewUrls = useRef(new Set<string>());
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrls.current.clear();
    if (suppliedRepository === undefined) repository.close();
  }, [repository, suppliedRepository]);

  useEffect(() => {
    if (errors.length > 0) errorSummaryRef.current?.focus();
  }, [errors]);

  useEffect(() => {
    const pendingBytes = pendingFileBytes(evidence);
    if (pendingBytes === 0) {
      setQuotaWarning(undefined);
      return;
    }

    let isCurrent = true;
    void navigator.storage?.estimate?.()
      .then((estimate) => {
        if (isCurrent) setQuotaWarning(getStorageQuotaWarning(estimate ?? {}, pendingBytes));
      })
      .catch(() => {
        if (isCurrent) setQuotaWarning(undefined);
      });

    return () => {
      isCurrent = false;
    };
  }, [evidence]);

  function validateIdentity(): boolean {
    const nextErrors = [
      ...(title.trim() ? [] : ["Add a title before continuing."]),
      ...(type ? [] : ["Choose an Exhibit type before continuing."]),
      ...(status ? [] : ["Choose an initial status before continuing."]),
    ];
    setErrors(nextErrors);
    return nextErrors.length === 0;
  }

  function validateStory(): boolean {
    const nextErrors = museumLabel.trim() ? [] : ["Add a museum label before saving."];
    setErrors(nextErrors);
    return nextErrors.length === 0;
  }

  function moveToEvidence() {
    if (!validateIdentity()) return;
    setStep(2);
  }

  function addLink() {
    const nextErrors = [
      ...(linkLabel.trim() ? [] : ["Give this link a short label before adding it."]),
      ...(linkAddress.trim() ? [] : ["Add a link address before adding it."]),
    ];

    try {
      if (linkAddress.trim()) new URL(linkAddress.trim());
    } catch {
      nextErrors.push("Use a complete link address, including https://.");
    }

    if (nextErrors.length > 0) {
      setErrors(nextErrors);
      return;
    }

    setEvidence((current) => [...current, { kind: "link", label: linkLabel, value: linkAddress }]);
    setLinkLabel("");
    setLinkAddress("");
    setErrors([]);
  }

  function addNote() {
    const nextErrors = [
      ...(noteLabel.trim() ? [] : ["Give this note a short label before adding it."]),
      ...(note.trim() ? [] : ["Write a note before adding it."]),
    ];
    if (nextErrors.length > 0) {
      setErrors(nextErrors);
      return;
    }

    setEvidence((current) => [...current, { kind: "note", label: noteLabel, value: note }]);
    setNoteLabel("");
    setNote("");
    setErrors([]);
  }

  function releasePreview(url: string) {
    if (!previewUrls.current.delete(url)) return;
    URL.revokeObjectURL(url);
  }

  function releaseAllPreviews() {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrls.current.clear();
  }

  function addFile(file: File) {
    const validation = validateArtifactFile(file);
    if (!validation.valid) {
      setErrors([validation.message]);
      return;
    }

    const previewUrl = URL.createObjectURL(validation.artifact.blob);
    previewUrls.current.add(previewUrl);
    setEvidence((current) => [...current, { ...validation.artifact, previewUrl }]);
    setErrors([]);
  }

  function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.item(0);
    if (file !== null && file !== undefined) addFile(file);
    event.currentTarget.value = "";
  }

  function removeEvidence(index: number) {
    setEvidence((current) => {
      const item = current[index];
      if (item !== undefined && "previewUrl" in item) releasePreview(item.previewUrl);
      return current.filter((_, evidenceIndex) => evidenceIndex !== index);
    });
  }

  async function saveExhibit() {
    if (!validateStory() || type === "" || status === "") return;

    setIsSaving(true);
    setErrors([]);
    try {
      const artifacts: CaptureArtifactInput[] = evidence.map((item) => {
        if (item.kind === "link") return { kind: "link", label: item.label, url: item.value };
        if (item.kind === "note") return { kind: "note", label: item.label, note: item.value };
        return {
          kind: item.kind,
          label: item.label,
          fileName: item.fileName,
          mimeType: item.mimeType,
          byteSize: item.byteSize,
          blob: item.blob,
        };
      });
      const exhibit = await repository.captureExhibit({
        title,
        type,
        status,
        museumLabel,
        whyStarted: optionalValue(whyStarted),
        whyStopped: optionalValue(whyStopped),
        whatItTaughtMe: optionalValue(whatItTaughtMe),
        tags: tags.split(","),
      }, artifacts);

      releaseAllPreviews();
      onNavigate(`/exhibit?id=${exhibit.id}`);
    } catch {
      setErrors(["Your Exhibit is still here. Please try saving again."]);
      setIsSaving(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === 1) moveToEvidence();
    else if (step === 2) {
      setErrors([]);
      setStep(3);
    } else void saveExhibit();
  }

  return (
    <main className="exhibit-capture">
      <header className="exhibit-capture__header">
        <p className="museum-eyebrow">New Exhibit</p>
        <h1>{step === 1 ? "Give the work a place" : step === 2 ? "Keep a trace of it" : "Tell its story"}</h1>
        <p>
          {step === 1
            ? "A working name is enough. You can return to these details later."
            : step === 2
              ? "Add a link or note if it helps hold the shape of the work."
              : "A few words of context can keep this Exhibit human and available to you."}
        </p>
      </header>

      <div className="exhibit-capture__progress" aria-label="Capture steps">
        <progress aria-label="Capture progress" max={3} value={step} />
        <ol>
          {[[1, "Identity"], [2, "Evidence"], [3, "Story"]].map(([number, label]) => (
            <li aria-current={step === number ? "step" : undefined} key={String(number)}>
              <span aria-hidden="true">{number}</span>{label}
            </li>
          ))}
        </ol>
      </div>

      <form className="exhibit-capture__step-panel" noValidate onSubmit={handleSubmit}>
        {errors.length > 0 ? (
          <div aria-live="assertive" className="exhibit-capture__errors" ref={errorSummaryRef} role="alert" tabIndex={-1}>
            {errors.map((error) => <p key={error}>{error}</p>)}
          </div>
        ) : null}

        {step === 1 ? (
          <fieldset>
            <legend>Identity</legend>
            <div className="museum-field">
              <label className="museum-field__label" htmlFor="exhibit-title">Working title <span aria-hidden="true">*</span></label>
              <input aria-describedby="exhibit-title-hint" autoFocus className="museum-input" id="exhibit-title" onChange={(event) => setTitle(event.target.value)} required value={title} />
              <span className="museum-field__hint" id="exhibit-title-hint">A name can be tentative. It only needs to help you recognize this work.</span>
            </div>
            <label className="museum-field" htmlFor="exhibit-type">
              <span className="museum-field__label">Exhibit type <span aria-hidden="true">*</span></span>
              <select className="museum-input" id="exhibit-type" onChange={(event) => setType(event.target.value as ExhibitType | "")} required value={type}>
                <option value="">Choose a type</option>
                {exhibitTypes.map(({ label, value }) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="museum-field" htmlFor="exhibit-status">
              <span className="museum-field__label">Initial status <span aria-hidden="true">*</span></span>
              <select className="museum-input" id="exhibit-status" onChange={(event) => setStatus(event.target.value as "unfinished" | "active" | "")} required value={status}>
                {initialStatuses.map(({ label, value }) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <div className="museum-field">
              <label className="museum-field__label" htmlFor="exhibit-tags">Tags</label>
              <input aria-describedby="exhibit-tags-hint" className="museum-input" id="exhibit-tags" onChange={(event) => setTags(event.target.value)} placeholder="Research, harbor, maybe later" value={tags} />
              <span className="museum-field__hint" id="exhibit-tags-hint">Separate tags with commas. They are for finding your way back, not for grading the work.</span>
            </div>
          </fieldset>
        ) : null}

        {step === 2 ? (
          <fieldset>
            <legend>Evidence</legend>
            <p className="exhibit-capture__field-note">Each trace is optional. Images, PDFs, and audio stay in this browser alongside links and notes.</p>
            <div className="exhibit-capture__evidence-form">
              <label className="museum-field" htmlFor="artifact-file">
                <span className="museum-field__label">Choose an image, PDF, or audio file</span>
                <input accept="image/*,application/pdf,audio/*" className="museum-input" id="artifact-file" onChange={handleFileSelection} type="file" />
                <span className="museum-field__hint">Up to 25 MiB per file. Your browser keeps these files in this private collection.</span>
              </label>
              {quotaWarning ? <p className="exhibit-capture__quota-warning" role="status">{quotaWarning}</p> : null}
            </div>
            <div className="exhibit-capture__evidence-form">
              <label className="museum-field" htmlFor="link-label">
                <span className="museum-field__label">Link label</span>
                <input className="museum-input" id="link-label" onChange={(event) => setLinkLabel(event.target.value)} value={linkLabel} />
              </label>
              <label className="museum-field" htmlFor="link-address">
                <span className="museum-field__label">Link address</span>
                <input className="museum-input" id="link-address" onChange={(event) => setLinkAddress(event.target.value)} placeholder="https://" type="url" value={linkAddress} />
              </label>
              <Button onClick={addLink} type="button" variant="secondary">Add link</Button>
            </div>
            <div className="exhibit-capture__evidence-form">
              <label className="museum-field" htmlFor="note-label">
                <span className="museum-field__label">Note label</span>
                <input className="museum-input" id="note-label" onChange={(event) => setNoteLabel(event.target.value)} value={noteLabel} />
              </label>
              <label className="museum-field" htmlFor="exhibit-note">
                <span className="museum-field__label">Note</span>
                <textarea className="museum-input" id="exhibit-note" onChange={(event) => setNote(event.target.value)} rows={4} value={note} />
              </label>
              <Button onClick={addNote} type="button" variant="secondary">Add note</Button>
            </div>
            {evidence.length > 0 ? (
              <ul className="exhibit-capture__evidence-list" aria-label="Evidence waiting to be saved">
                {evidence.map((item, index) => (
                  <li key={`${item.kind}-${item.label}-${index}`}>
                    <div>
                      <span><strong>{item.label}</strong> <small>{item.kind === "link" ? "Link" : item.kind === "note" ? "Note" : item.kind}</small></span>
                      {"previewUrl" in item ? (
                        <div className="exhibit-capture__file-preview">
                          {/* eslint-disable-next-line @next/next/no-img-element -- Local Blob previews require an object URL. */}
                          {item.kind === "image" ? <img alt={`Preview of ${item.fileName}`} src={item.previewUrl} /> : null}
                          {item.kind === "pdf" ? <iframe aria-label={`Preview of ${item.fileName}`} src={item.previewUrl} title={`Preview of ${item.fileName}`} /> : null}
                          {item.kind === "audio" ? <audio aria-label={`Preview of ${item.fileName}`} controls src={item.previewUrl} /> : null}
                          <a download={item.fileName} href={item.previewUrl}>Download {item.fileName}</a>
                        </div>
                      ) : null}
                    </div>
                    <Button aria-label={`Remove ${item.label}`} onClick={() => removeEvidence(index)} type="button" variant="quiet">Remove</Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </fieldset>
        ) : null}

        {step === 3 ? (
          <fieldset>
            <legend>Story</legend>
            <div className="museum-field">
              <label className="museum-field__label" htmlFor="museum-label">Museum label <span aria-hidden="true">*</span></label>
              <input aria-describedby="museum-label-hint" autoFocus className="museum-input" id="museum-label" onChange={(event) => setMuseumLabel(event.target.value)} required value={museumLabel} />
              <span className="museum-field__hint" id="museum-label-hint">A small line that helps you remember what this was trying to become.</span>
            </div>
            <label className="museum-field" htmlFor="why-started">
              <span className="museum-field__label">Why did this begin?</span>
              <textarea className="museum-input" id="why-started" onChange={(event) => setWhyStarted(event.target.value)} rows={4} value={whyStarted} />
            </label>
            <label className="museum-field" htmlFor="why-stopped">
              <span className="museum-field__label">Where did it pause?</span>
              <textarea className="museum-input" id="why-stopped" onChange={(event) => setWhyStopped(event.target.value)} rows={4} value={whyStopped} />
            </label>
            <label className="museum-field" htmlFor="what-it-taught-me">
              <span className="museum-field__label">What did it teach you?</span>
              <textarea className="museum-input" id="what-it-taught-me" onChange={(event) => setWhatItTaughtMe(event.target.value)} rows={4} value={whatItTaughtMe} />
            </label>
          </fieldset>
        ) : null}

        <div className="exhibit-capture__actions">
          <Button onClick={() => setIsCancelDialogOpen(true)} type="button" variant="quiet">Cancel capture</Button>
          <div>
            {step > 1 ? <Button onClick={() => { setErrors([]); setStep((current) => current - 1); }} type="button" variant="secondary">{step === 2 ? "Back to identity" : "Back to evidence"}</Button> : null}
            {step === 1 ? <Button type="submit">Continue to evidence</Button> : null}
            {step === 2 ? <Button type="submit">Continue to story</Button> : null}
            {step === 3 ? <Button disabled={isSaving} type="submit">{isSaving ? "Saving Exhibit…" : "Save Exhibit"}</Button> : null}
          </div>
        </div>
      </form>

      <Dialog
        description="Leaving now will discard this unsaved draft."
        isOpen={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
        title="Leave this Exhibit?"
      >
        <div className="exhibit-capture__dialog-actions">
          <Button onClick={() => setIsCancelDialogOpen(false)} variant="secondary">Keep capturing</Button>
          <Button onClick={() => onNavigate("/museum")} variant="danger">Leave without saving</Button>
        </div>
      </Dialog>
    </main>
  );
}
