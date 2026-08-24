"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircleIcon, HardDriveIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Controller, useForm } from "react-hook-form";

import { validateArtifactFile, type ValidatedFileArtifact } from "@/lib/artifacts/file-validation";
import { getStorageQuotaWarning } from "@/lib/artifacts/storage-quota";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { ExhibitStatus, ExhibitType } from "@/lib/domain";
import {
  exhibitCaptureFormSchema,
  type ExhibitCaptureFormValues,
  type ValidatedExhibitCaptureFormValues,
} from "@/lib/forms/exhibit-capture-form";
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

const captureSteps = [[1, "Identity"], [2, "Evidence"], [3, "Story"]] as const;

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

const evidenceKindLabels = {
  audio: "Audio",
  image: "Image",
  link: "Link",
  note: "Note",
  pdf: "PDF",
} satisfies Record<EvidenceDraft["kind"], string>;

const identityFields = ["title", "type", "status"] as const;
const controlSizeClassName = "h-11 sm:h-10";
const selectControlSizeClassName = "data-[size=default]:h-11 sm:data-[size=default]:h-10";
const textareaSizeClassName = "min-h-28";

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
  const [linkLabel, setLinkLabel] = useState("");
  const [linkAddress, setLinkAddress] = useState("");
  const [noteLabel, setNoteLabel] = useState("");
  const [note, setNote] = useState("");
  const [evidence, setEvidence] = useState<EvidenceDraft[]>([]);
  const [interactionErrors, setInteractionErrors] = useState<string[]>([]);
  const [quotaWarning, setQuotaWarning] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const previewUrls = useRef(new Set<string>());
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const {
    clearErrors,
    control,
    formState: { errors: formErrors },
    handleSubmit: submitValidatedForm,
    register,
    trigger,
  } = useForm<ExhibitCaptureFormValues, unknown, ValidatedExhibitCaptureFormValues>({
    defaultValues: {
      museumLabel: "",
      status: "unfinished",
      tags: "",
      title: "",
      type: "",
      whatItTaughtMe: "",
      whyStarted: "",
      whyStopped: "",
    },
    resolver: zodResolver(exhibitCaptureFormSchema),
  });
  const stepValidationErrors = step === 1
    ? [formErrors.title?.message, formErrors.type?.message, formErrors.status?.message]
    : step === 3
      ? [formErrors.museumLabel?.message]
      : [];
  const errors = [...stepValidationErrors, ...interactionErrors]
    .filter((message): message is string => typeof message === "string");
  const errorKey = errors.join("\n");

  useEffect(() => () => {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrls.current.clear();
    if (suppliedRepository === undefined) repository.close();
  }, [repository, suppliedRepository]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (errorKey !== "") errorSummaryRef.current?.focus();
  }, [errorKey]);

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
      setInteractionErrors(nextErrors);
      return;
    }

    setEvidence((current) => [...current, { kind: "link", label: linkLabel, value: linkAddress }]);
    setLinkLabel("");
    setLinkAddress("");
    setInteractionErrors([]);
  }

  function addNote() {
    const nextErrors = [
      ...(noteLabel.trim() ? [] : ["Give this note a short label before adding it."]),
      ...(note.trim() ? [] : ["Write a note before adding it."]),
    ];
    if (nextErrors.length > 0) {
      setInteractionErrors(nextErrors);
      return;
    }

    setEvidence((current) => [...current, { kind: "note", label: noteLabel, value: note }]);
    setNoteLabel("");
    setNote("");
    setInteractionErrors([]);
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
      setInteractionErrors([validation.message]);
      return;
    }

    const previewUrl = URL.createObjectURL(validation.artifact.blob);
    previewUrls.current.add(previewUrl);
    setEvidence((current) => [...current, { ...validation.artifact, previewUrl }]);
    setInteractionErrors([]);
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

  async function saveExhibit(values: ValidatedExhibitCaptureFormValues) {
    setIsSaving(true);
    setInteractionErrors([]);
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
        title: values.title,
        type: values.type,
        status: values.status,
        museumLabel: values.museumLabel,
        whyStarted: optionalValue(values.whyStarted),
        whyStopped: optionalValue(values.whyStopped),
        whatItTaughtMe: optionalValue(values.whatItTaughtMe),
        tags: values.tags.split(","),
      }, artifacts);

      releaseAllPreviews();
      onNavigate(`/exhibit?id=${exhibit.id}`);
    } catch {
      setInteractionErrors(["Your Exhibit is still here. Please try saving again."]);
      setIsSaving(false);
    }
  }

  async function handleStepSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === 1) {
      setInteractionErrors([]);
      if (await trigger(identityFields)) setStep(2);
    } else if (step === 2) {
      clearErrors();
      setInteractionErrors([]);
      setStep(3);
    } else {
      await submitValidatedForm(saveExhibit)(event);
    }
  }

  const heading = step === 1 ? "Give the work a place" : step === 2 ? "Keep a trace of it" : "Tell its story";
  const description = step === 1
    ? "A working name is enough. You can return to these details later."
    : step === 2
      ? "Add a link or note if it helps hold the shape of the work."
      : "A few words of context can keep this Exhibit human and available to you.";
  const progressValue = Math.round((step / 3) * 100);

  return (
    <motion.main
      animate={{ opacity: 1, y: 0 }}
      aria-busy={!isHydrated}
      className="mx-auto w-full max-w-3xl font-sans"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.35, ease: "easeOut" }}
    >
      <Card className="w-full [--card-spacing:--spacing(5)] sm:[--card-spacing:--spacing(6)]">
        <form className="contents" noValidate onSubmit={(event) => void handleStepSubmit(event)}>
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Step {step} of 3</Badge>
              <span className="font-mono text-xs font-medium tracking-wider text-muted-foreground uppercase">New Exhibit</span>
            </div>
            <CardTitle>
              <h1 className="m-0 font-display text-3xl leading-tight font-normal sm:text-4xl">{heading}</h1>
            </CardTitle>
            <CardDescription className="max-w-2xl text-sm sm:text-base">{description}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div aria-label="Capture steps" className="space-y-3">
              <Progress aria-label="Capture progress" value={progressValue} />
              <ol className="grid grid-cols-3 gap-2">
                {captureSteps.map(([number, label]) => (
                  <li
                    aria-current={step === number ? "step" : undefined}
                    className="flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground sm:text-sm"
                    key={String(number)}
                  >
                    <Badge variant={step === number ? "default" : "outline"}>{number}</Badge>
                    <span className="truncate">{label}</span>
                  </li>
                ))}
              </ol>
            </div>

            <Separator />

            {errors.length > 0 ? (
              <Alert aria-live="assertive" ref={errorSummaryRef} tabIndex={-1} variant="destructive">
                <AlertCircleIcon aria-hidden="true" />
                <AlertTitle>Check the highlighted details</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc space-y-1 pl-4">
                    {errors.map((error) => <li key={error}>{error}</li>)}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : null}

            {step === 1 ? (
              <FieldSet>
                <FieldLegend className="font-display text-xl">Identity</FieldLegend>
                <FieldGroup>
                  <Field data-invalid={formErrors.title !== undefined}>
                    <FieldLabel htmlFor="exhibit-title">Working title <span aria-hidden="true">*</span></FieldLabel>
                    <Input aria-describedby="exhibit-title-hint" aria-invalid={formErrors.title !== undefined} autoFocus className={controlSizeClassName} id="exhibit-title" label="" required {...register("title")} />
                    <FieldDescription id="exhibit-title-hint">A name can be tentative. It only needs to help you recognize this work.</FieldDescription>
                  </Field>
                  <Controller
                    control={control}
                    name="type"
                    render={({ field }) => (
                      <Field data-invalid={formErrors.type !== undefined}>
                        <FieldLabel htmlFor="exhibit-type">Exhibit type <span aria-hidden="true">*</span></FieldLabel>
                        <Select
                          items={exhibitTypes}
                          name={field.name}
                          onValueChange={(value) => field.onChange(value ?? "")}
                          required
                          value={field.value || null}
                        >
                          <SelectTrigger
                            aria-invalid={formErrors.type !== undefined}
                            className={`${selectControlSizeClassName} w-full`}
                            id="exhibit-type"
                            onBlur={field.onBlur}
                            ref={field.ref}
                          >
                            <SelectValue placeholder="Choose a type" />
                          </SelectTrigger>
                          <SelectContent alignItemWithTrigger={false}>
                            <SelectGroup>
                              {exhibitTypes.map(({ label, value }) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  />
                  <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <Field data-invalid={formErrors.status !== undefined}>
                        <FieldLabel htmlFor="exhibit-status">Initial status <span aria-hidden="true">*</span></FieldLabel>
                        <Select
                          items={initialStatuses}
                          name={field.name}
                          onValueChange={(value) => field.onChange(value ?? "")}
                          required
                          value={field.value}
                        >
                          <SelectTrigger
                            aria-invalid={formErrors.status !== undefined}
                            className={`${selectControlSizeClassName} w-full`}
                            id="exhibit-status"
                            onBlur={field.onBlur}
                            ref={field.ref}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent alignItemWithTrigger={false}>
                            <SelectGroup>
                              {initialStatuses.map(({ label, value }) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  />
                  <Field>
                    <FieldLabel htmlFor="exhibit-tags">Tags</FieldLabel>
                    <Input aria-describedby="exhibit-tags-hint" className={controlSizeClassName} id="exhibit-tags" label="" placeholder="Research, harbor, maybe later" {...register("tags")} />
                    <FieldDescription id="exhibit-tags-hint">Separate tags with commas. They are for finding your way back, not for grading the work.</FieldDescription>
                  </Field>
                </FieldGroup>
              </FieldSet>
            ) : null}

            {step === 2 ? (
              <FieldSet>
                <FieldLegend className="font-display text-xl">Evidence</FieldLegend>
                <FieldDescription>Each trace is optional. Images, PDFs, and audio stay in this browser alongside links and notes.</FieldDescription>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="artifact-file">Choose an image, PDF, or audio file</FieldLabel>
                    <Input accept="image/*,application/pdf,audio/*" className={controlSizeClassName} id="artifact-file" label="" onChange={handleFileSelection} type="file" />
                    <FieldDescription>Up to 25 MiB per file. Your browser keeps these files in this private collection.</FieldDescription>
                  </Field>
                  {quotaWarning ? (
                    <Alert role="status">
                      <HardDriveIcon aria-hidden="true" />
                      <AlertTitle>Local storage notice</AlertTitle>
                      <AlertDescription>{quotaWarning}</AlertDescription>
                    </Alert>
                  ) : null}

                  <Separator />

                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="link-label">Link label</FieldLabel>
                      <Input className={controlSizeClassName} id="link-label" label="" onChange={(event) => setLinkLabel(event.target.value)} value={linkLabel} />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="link-address">Link address</FieldLabel>
                      <Input className={controlSizeClassName} id="link-address" label="" onChange={(event) => setLinkAddress(event.target.value)} placeholder="https://" type="url" value={linkAddress} />
                    </Field>
                    <Button className="min-h-11 justify-self-start sm:min-h-8" onClick={addLink} type="button" variant="outline">Add link</Button>
                  </FieldGroup>

                  <Separator />

                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="note-label">Note label</FieldLabel>
                      <Input className={controlSizeClassName} id="note-label" label="" onChange={(event) => setNoteLabel(event.target.value)} value={noteLabel} />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="exhibit-note">Note</FieldLabel>
                      <Textarea className={textareaSizeClassName} id="exhibit-note" onChange={(event) => setNote(event.target.value)} rows={4} value={note} />
                    </Field>
                    <Button className="min-h-11 justify-self-start sm:min-h-8" onClick={addNote} type="button" variant="outline">Add note</Button>
                  </FieldGroup>
                </FieldGroup>

                {evidence.length > 0 ? (
                  <ul aria-label="Evidence waiting to be saved" className="space-y-3">
                    {evidence.map((item, index) => (
                      <li key={`${item.kind}-${item.label}-${index}`}>
                        <Card size="sm">
                          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <strong className="break-words">{item.label}</strong>
                                <Badge variant="outline">{evidenceKindLabels[item.kind]}</Badge>
                              </div>
                              {"previewUrl" in item ? (
                                <div className="grid gap-3">
                                  {/* eslint-disable-next-line @next/next/no-img-element -- Local Blob previews require an object URL. */}
                                  {item.kind === "image" ? <img alt={`Preview of ${item.fileName}`} className="max-h-60 max-w-full rounded-lg border object-contain" src={item.previewUrl} /> : null}
                                  {item.kind === "pdf" ? <iframe aria-label={`Preview of ${item.fileName}`} className="h-60 w-full max-w-md rounded-lg border" src={item.previewUrl} title={`Preview of ${item.fileName}`} /> : null}
                                  {item.kind === "audio" ? <audio aria-label={`Preview of ${item.fileName}`} className="max-w-full" controls src={item.previewUrl} /> : null}
                                  <Button asChild className="min-h-11 justify-self-start sm:min-h-8" variant="outline">
                                    <a download={item.fileName} href={item.previewUrl}>Download {item.fileName}</a>
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                            <Button aria-label={`Remove ${item.label}`} className="min-h-11 sm:min-h-8" onClick={() => removeEvidence(index)} type="button" variant="ghost">Remove</Button>
                          </CardContent>
                        </Card>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </FieldSet>
            ) : null}

            {step === 3 ? (
              <FieldSet>
                <FieldLegend className="font-display text-xl">Story</FieldLegend>
                <FieldGroup>
                  <Field data-invalid={formErrors.museumLabel !== undefined}>
                    <FieldLabel htmlFor="museum-label">Museum label <span aria-hidden="true">*</span></FieldLabel>
                    <Input aria-describedby="museum-label-hint" aria-invalid={formErrors.museumLabel !== undefined} autoFocus className={controlSizeClassName} id="museum-label" label="" required {...register("museumLabel")} />
                    <FieldDescription id="museum-label-hint">A small line that helps you remember what this was trying to become.</FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="why-started">Why did this begin?</FieldLabel>
                    <Textarea className={textareaSizeClassName} id="why-started" rows={4} {...register("whyStarted")} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="why-stopped">Where did it pause?</FieldLabel>
                    <Textarea className={textareaSizeClassName} id="why-stopped" rows={4} {...register("whyStopped")} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="what-it-taught-me">What did it teach you?</FieldLabel>
                    <Textarea className={textareaSizeClassName} id="what-it-taught-me" rows={4} {...register("whatItTaughtMe")} />
                  </Field>
                </FieldGroup>
              </FieldSet>
            ) : null}
          </CardContent>

          <CardFooter className="flex-col gap-3 sm:flex-row sm:justify-between">
            <Button className="min-h-11 w-full sm:min-h-8 sm:w-auto" onClick={() => setIsCancelDialogOpen(true)} type="button" variant="ghost">Cancel capture</Button>
            <div className="grid w-full gap-2 sm:flex sm:w-auto">
              {step > 1 ? (
                <Button
                  className="min-h-11 sm:min-h-8"
                  onClick={() => { clearErrors(); setInteractionErrors([]); setStep((current) => current - 1); }}
                  type="button"
                  variant="outline"
                >
                  {step === 2 ? "Back to identity" : "Back to evidence"}
                </Button>
              ) : null}
              {step === 1 ? <Button className="min-h-11 sm:min-h-8" type="submit">Continue to evidence</Button> : null}
              {step === 2 ? <Button className="min-h-11 sm:min-h-8" type="submit">Continue to story</Button> : null}
              {step === 3 ? <Button className="min-h-11 sm:min-h-8" disabled={isSaving} type="submit">{isSaving ? "Saving Exhibit…" : "Save Exhibit"}</Button> : null}
            </div>
          </CardFooter>
        </form>
      </Card>

      <Dialog
        description="Leaving now will discard this unsaved draft."
        isOpen={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
        title="Leave this Exhibit?"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button className="min-h-11 sm:min-h-8" onClick={() => setIsCancelDialogOpen(false)} variant="outline">Keep capturing</Button>
          <Button className="min-h-11 sm:min-h-8" onClick={() => onNavigate("/museum")} variant="destructive">Leave without saving</Button>
        </div>
      </Dialog>
    </motion.main>
  );
}
