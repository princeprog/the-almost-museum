import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { museumFixture } from "../fixtures/museum";

describe("test harness", () => {
  it("renders a shared fixture with Testing Library and IndexedDB available", () => {
    render(<h1>{museumFixture.title}</h1>);

    expect(screen.getByRole("heading", { name: museumFixture.title })).toBeVisible();
    expect(indexedDB).toBeDefined();
  });
});
