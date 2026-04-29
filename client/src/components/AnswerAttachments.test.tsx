import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { AnswerAttachments } from "./AnswerAttachments";

const fetchMock = vi.fn();
const createObjectURL = vi.fn(() => "blob:fake-url");
const revokeObjectURL = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  globalThis.URL.createObjectURL = createObjectURL;
  globalThis.URL.revokeObjectURL = revokeObjectURL;
  localStorage.setItem("token", "test-jwt");
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("AnswerAttachments", () => {
  it("renders nothing when there are no attachments and the viewer can't edit", () => {
    const { container } = render(
      <AnswerAttachments
        shopId="shop-1"
        answerId="ans-1"
        attachments={[]}
        canEdit={false}
        onChange={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders the upload button when the viewer can edit, even with no attachments", () => {
    render(
      <AnswerAttachments
        shopId="shop-1"
        answerId="ans-1"
        attachments={[]}
        canEdit={true}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("+ Add photo")).toBeDefined();
  });

  it("fetches each image attachment with the JWT and renders thumbnails", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      blob: async () => new Blob(["fake"], { type: "image/png" }),
    } as Response);

    render(
      <AnswerAttachments
        shopId="shop-1"
        answerId="ans-1"
        attachments={[
          { id: "att-1", mimeType: "image/png", originalName: "shelf.png" },
          { id: "att-2", mimeType: "image/jpeg", originalName: "display.jpg" },
        ]}
        canEdit={false}
        onChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    // Auth header is forwarded.
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer test-jwt");

    // Thumbnails appear once the blob URLs resolve.
    const imgs = await screen.findAllByRole("img");
    expect(imgs.length).toBe(2);
    expect(imgs[0].getAttribute("alt")).toBe("shelf.png");
  });

  it("does not fetch non-image attachments (only image/ types render as thumbs)", async () => {
    render(
      <AnswerAttachments
        shopId="shop-1"
        answerId="ans-1"
        attachments={[{ id: "pdf-1", mimeType: "application/pdf", originalName: "report.pdf" }]}
        canEdit={false}
        onChange={vi.fn()}
      />,
    );
    // The non-image filename text fallback should render.
    expect(await screen.findByText(/report\.pdf/i)).toBeDefined();
    // No fetch was issued for it.
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
