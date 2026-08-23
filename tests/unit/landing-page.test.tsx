import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "../../app/page";

describe("Almost landing page", () => {
  it("introduces a private museum for unfinished work without framing it as a failure", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: "Not everything unfinished is a failure." }),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Almost is a private museum for unfinished ideas, projects, and experiments.",
      ),
    ).toBeVisible();
  });

  it("provides a named route into the museum", () => {
    render(<HomePage />);

    expect(screen.getByRole("link", { name: "Enter the Museum" })).toHaveAttribute("href", "/museum");
  });

  it("keeps the introduction and supporting note in a responsive landing structure", () => {
    const { container } = render(<HomePage />);

    const main = screen.getByRole("main");
    expect(main).toHaveClass("landing-page");
    expect(main.querySelector(".landing-page__hero")).toBeInTheDocument();
    expect(main.querySelector(".landing-page__note")).toBeInTheDocument();
    expect(container.querySelector(".landing-page__frame")).toBeInTheDocument();
  });
});
