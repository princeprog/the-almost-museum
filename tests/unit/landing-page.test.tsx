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
    expect(main.querySelector(".marketing-hero")).toBeInTheDocument();
    expect(main.querySelector(".benefit-strip")).toBeInTheDocument();
    expect(main.querySelector(".exhibit-showcase")).toBeInTheDocument();
    expect(main.querySelector(".how-it-works")).toBeInTheDocument();
    expect(main.querySelector(".value-strip")).toBeInTheDocument();
    expect(container.querySelector(".closing-cta")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your museum. Your way." })).toBeVisible();
    expect(screen.getByRole("heading", { name: "A calm space for unfinished things." })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Save the work worth remembering." })).toBeVisible();
  });
});
