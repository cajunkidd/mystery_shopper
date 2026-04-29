import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const apiMock = vi.fn();
vi.mock("../api", () => ({
  api: (...args: unknown[]) => apiMock(...args),
}));

import { NotificationBell } from "./NotificationBell";

describe("NotificationBell", () => {
  beforeEach(() => {
    apiMock.mockReset();
  });
  afterEach(() => cleanup());

  it("does not render the badge or dropdown when there are no unread notifications", async () => {
    apiMock.mockResolvedValue({ notifications: [], unread: 0 });
    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>,
    );
    await waitFor(() => expect(apiMock).toHaveBeenCalledWith("/notifications"));
    // No badge.
    expect(screen.queryByText(/^\d+$/)).toBeNull();
    // Dropdown is closed.
    expect(screen.queryByText(/all clear/i)).toBeNull();
  });

  it("shows the unread count and reveals notifications when clicked", async () => {
    apiMock.mockResolvedValue({
      notifications: [
        {
          id: "n1",
          kind: "review_completed",
          title: "Your shop on 2026-04-12 has been reviewed",
          body: "Score: 87%",
          link: "/shops/abc",
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],
      unread: 1,
    });
    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText("1")).toBeDefined());

    const trigger = screen.getByRole("button", { name: /notifications/i });
    fireEvent.click(trigger);

    const dropdown = await screen.findByText(/your shop on 2026-04-12/i);
    expect(dropdown).toBeDefined();
    expect(within(dropdown.closest("li")!).getByText(/score: 87%/i)).toBeDefined();
  });

  it("calls read-all when 'Mark all read' is clicked", async () => {
    apiMock.mockImplementation(async (path: string) => {
      if (path === "/notifications") {
        return {
          notifications: [
            { id: "n1", kind: "x", title: "t", body: null, link: null, read: false, createdAt: new Date().toISOString() },
          ],
          unread: 1,
        };
      }
      return { ok: true };
    });
    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText("1")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    fireEvent.click(await screen.findByRole("button", { name: /mark all read/i }));

    await waitFor(() => {
      const calls = apiMock.mock.calls.map((c) => c[0]);
      expect(calls).toContain("/notifications/read-all");
    });
  });
});
