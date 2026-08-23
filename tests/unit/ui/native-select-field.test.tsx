import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("keeps native options available to keyboard and assistive-technology selection", async () => {
    const user = userEvent.setup();

    render(
      <Field>
        <FieldLabel htmlFor="room-picker">Museum room</FieldLabel>
        <NativeSelect defaultValue="unfinished" id="room-picker">
          <NativeSelectOption value="unfinished">Unfinished</NativeSelectOption>
          <NativeSelectOption value="released">Released</NativeSelectOption>
        </NativeSelect>
      </Field>,
    );

    const select = screen.getByRole("combobox", { name: "Museum room" });
    expect(select).toHaveAttribute("data-slot", "native-select");
    expect(screen.getByRole("option", { name: "Unfinished" })).toHaveProperty("selected", true);

    await user.selectOptions(select, "released");

    expect(select).toHaveValue("released");
    expect(screen.getByRole("option", { name: "Released" })).toHaveProperty("selected", true);
  });
});
