import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "../../app/page";

describe("Almost landing page", () => {
  it("introduces a private archive for unfinished work", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: "Give unfinished work a place to live." }),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Almost Museum is a private, local-first digital museum for unfinished ideas, abandoned projects, experiments, drafts, and things that almost existed.",
      ),
    ).toBeVisible();
  });

  it("provides a named route into the museum", () => {
    render(<HomePage />);

    expect(screen.getAllByRole("link", { name: "Enter the Museum" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Enter the Museum" })[0]).toHaveAttribute("href", "/museum");
  });

  it("presents the complete museum story in a responsive landing structure", () => {
    const { container } = render(<HomePage />);

    const main = screen.getByRole("main");
    expect(main).toHaveClass("landing-page");
    expect(main.querySelectorAll(".landing-screen")).toHaveLength(4);
    expect(screen.getByRole("region", { name: "Why preserve unfinished work" })).toBeVisible();
    expect(container.querySelectorAll('[data-slot="card"]')).toHaveLength(5);
    expect(container.querySelectorAll('[data-slot="card-action"]')).toHaveLength(5);
    expect(screen.getByTestId("exhibit-track")).toBeVisible();
    expect(screen.getByTestId("workflow-track")).toBeVisible();
    expect(screen.getByTestId("value-track")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Your museum. Your way." })).toBeVisible();
    expect(screen.getByRole("heading", { name: "A calm space for unfinished things." })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Save the work worth remembering." })).toBeVisible();
  });
});
