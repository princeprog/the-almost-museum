import { z } from "zod";

import { createExhibitInputSchema, exhibitStatusSchema, exhibitTypeSchema } from "@/lib/domain";

const requiredTitle = z.string().refine(
  (value) => createExhibitInputSchema.shape.title.safeParse(value).success,
  { message: "Add a title before continuing." },
);

const requiredMuseumLabel = z.string().refine(
  (value) => createExhibitInputSchema.shape.museumLabel.safeParse(value).success,
  { message: "Add a museum label before saving." },
);

const initialStatusSchema = z.union([z.literal(""), exhibitStatusSchema]).refine(
  (value): value is "unfinished" | "active" => value === "unfinished" || value === "active",
  { message: "Choose an initial status before continuing." },
);

export const exhibitCaptureFormSchema = z.object({
  title: requiredTitle,
  type: z.union([z.literal(""), exhibitTypeSchema]).refine(
    (value) => value !== "",
    { message: "Choose an Exhibit type before continuing." },
  ),
  status: initialStatusSchema,
  tags: z.string(),
  museumLabel: requiredMuseumLabel,
  whyStarted: z.string(),
  whyStopped: z.string(),
  whatItTaughtMe: z.string(),
}).strict();

export type ExhibitCaptureFormValues = z.input<typeof exhibitCaptureFormSchema>;
export type ValidatedExhibitCaptureFormValues = z.output<typeof exhibitCaptureFormSchema>;
