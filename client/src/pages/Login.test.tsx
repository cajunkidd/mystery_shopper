import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const loginFn = vi.fn();
vi.mock("../auth", () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    login: loginFn,
    logout: vi.fn(),
  }),
}));

import Login from "./Login";

describe("Login", () => {
  beforeEach(() => {
    loginFn.mockReset();
  });
  afterEach(() => {
    cleanup();
  });

  it("disables the submit button while in flight and posts the entered credentials", async () => {
    let resolveLogin: () => void = () => undefined;
    loginFn.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveLogin = resolve;
        }),
    );

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    const email = screen.getByLabelText(/email/i) as HTMLInputElement;
    const password = screen.getByLabelText(/password/i) as HTMLInputElement;
    const submit = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(email, { target: { value: "kyle@stine.test" } });
    fireEvent.change(password, { target: { value: "admin1234" } });
    fireEvent.click(submit);

    await waitFor(() => expect(submit.textContent).toMatch(/signing in/i));
    expect(loginFn).toHaveBeenCalledWith("kyle@stine.test", "admin1234");

    resolveLogin();
  });

  it("shows an error message when login rejects", async () => {
    loginFn.mockRejectedValue(new Error("nope"));
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "alex@stine.test" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() =>
      expect(screen.getByText(/invalid email or password/i)).toBeDefined(),
    );
  });
});
