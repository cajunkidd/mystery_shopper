import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NotFound from "./NotFound";

describe("NotFound", () => {
  it("renders the 'Not found' headline and a back-to-dashboard link", () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: /not found/i })).toBeDefined();
    const link = screen.getByRole("link", { name: /back to dashboard/i });
    expect(link.getAttribute("href")).toBe("/");
  });
});
