import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

describe("NativeSelect field", () => {
  it("exposes its label, guidance, and invalid state to assistive technology", () => {
    render(
      <Field aria-labelledby="room-label" data-invalid>
        <FieldLabel htmlFor="room" id="room-label">
          Museum room
        </FieldLabel>
        <NativeSelect
          aria-describedby="room-guidance room-error"
          aria-invalid="true"
          defaultValue="unfinished"
          id="room"
        >
          <NativeSelectOption value="unfinished">Unfinished</NativeSelectOption>
          <NativeSelectOption value="released">Released</NativeSelectOption>
        </NativeSelect>
        <FieldDescription id="room-guidance">
          Choose where this Exhibit belongs.
        </FieldDescription>
        <FieldError id="room-error">Choose an available room.</FieldError>
      </Field>,
    );

    const field = screen.getByRole("group", { name: "Museum room" });
    const select = screen.getByRole("combobox", { name: "Museum room" });

    expect(field).toHaveAttribute("data-invalid", "true");
    expect(select).toHaveAccessibleDescription(
      "Choose where this Exhibit belongs. Choose an available room.",
    );
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Choose an available room.",
    );
  });
});
