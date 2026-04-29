import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../auth", () => ({
  useAuth: () => ({
    user: {
      id: "u1",
      email: "alex@stine.test",
      fullName: "Alex Sales",
      role: "employee",
      primaryLocationId: null,
      districtIds: [],
    },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

const apiMock = vi.fn();
vi.mock("../api", () => ({
  api: (...args: unknown[]) => apiMock(...args),
}));

import Settings from "./Settings";

describe("Settings", () => {
  beforeEach(() => {
    apiMock.mockReset();
    apiMock.mockImplementation(async (path: string, init?: { method?: string; body?: string }) => {
      if (path === "/me/preferences" && (!init || init.method === undefined)) {
        return { preferences: { notifyByEmail: true, notifyBySms: false } };
      }
      if (path === "/me/preferences" && init?.method === "PATCH") {
        const body = JSON.parse(init.body ?? "{}");
        return { preferences: { notifyByEmail: true, notifyBySms: false, ...body } };
      }
      throw new Error(`unexpected api call: ${path}`);
    });
  });
  afterEach(() => cleanup());

  it("renders the user identity card and the notification preferences", async () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/alex sales/i)).toBeDefined());
    expect(screen.getByText(/alex@stine\.test/)).toBeDefined();
    // The §11 data-export button should be present.
    expect(screen.getByRole("button", { name: /download my data/i })).toBeDefined();
  });

  it("PATCHes /me/preferences when an SMS toggle is flipped on", async () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getAllByRole("checkbox").length).toBeGreaterThan(0));
    const checkboxes = screen.getAllByRole("checkbox");
    // Last checkbox is SMS; first is email (already true).
    const smsToggle = checkboxes[checkboxes.length - 1] as HTMLInputElement;
    expect(smsToggle.checked).toBe(false);
    fireEvent.click(smsToggle);

    await waitFor(() => {
      const patchCall = apiMock.mock.calls.find((c) => c[0] === "/me/preferences" && c[1]?.method === "PATCH");
      expect(patchCall).toBeDefined();
      expect(JSON.parse(patchCall![1]!.body)).toEqual({ notifyBySms: true });
    });
  });
});
