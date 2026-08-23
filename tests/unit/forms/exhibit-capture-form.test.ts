import { describe, expect, it } from "vitest";

import { exhibitCaptureFormSchema } from "@/lib/forms/exhibit-capture-form";

describe("exhibit capture form schema", () => {
  it("keeps the capture flow's identity and story messages at the form boundary", () => {
    const result = exhibitCaptureFormSchema.safeParse({
      museumLabel: "   ",
      status: "",
      tags: "",
      title: "   ",
      type: "",
      whatItTaughtMe: "",
      whyStarted: "",
      whyStopped: "",
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.flatten().fieldErrors).toMatchObject({
      museumLabel: ["Add a museum label before saving."],
      status: ["Choose an initial status before continuing."],
      title: ["Add a title before continuing."],
      type: ["Choose an Exhibit type before continuing."],
    });
  });

  it("accepts values supported by the Exhibit domain while keeping narrative fields optional", () => {
    expect(exhibitCaptureFormSchema.safeParse({
      museumLabel: "A route worth returning to",
      status: "unfinished",
      tags: "harbor, navigation",
      title: "Harbor wayfinding study",
      type: "experiment",
      whatItTaughtMe: "",
      whyStarted: "",
      whyStopped: "",
    }).success).toBe(true);
  });
});
