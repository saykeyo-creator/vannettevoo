import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSignIn = vi.fn().mockResolvedValue({ ok: true });
const mockPush = vi.fn();

vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}));

import AdminLoginPage from "@/app/admin/login/page";

describe("Admin Login Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignIn.mockResolvedValue({ ok: true });
  });

  it("renders email and password fields", () => {
    render(<AdminLoginPage />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("renders sign in button", () => {
    render(<AdminLoginPage />);
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("renders the admin portal heading", () => {
    render(<AdminLoginPage />);
    expect(screen.getByText("Admin Portal")).toBeInTheDocument();
  });

  it("calls signIn with credentials when form is submitted", async () => {
    const user = userEvent.setup();
    render(<AdminLoginPage />);

    await user.type(screen.getByLabelText("Email"), "admin@test.com");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(mockSignIn).toHaveBeenCalledWith("credentials", {
      email: "admin@test.com",
      password: "secret123",
      redirect: false,
    });
  });

  it("redirects to /admin on successful sign in", async () => {
    const user = userEvent.setup();
    render(<AdminLoginPage />);

    await user.type(screen.getByLabelText("Email"), "admin@test.com");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(mockPush).toHaveBeenCalledWith("/admin");
  });

  it("shows error message on failed sign in", async () => {
    mockSignIn.mockResolvedValue({ error: "CredentialsSignin" });
    const user = userEvent.setup();
    render(<AdminLoginPage />);

    await user.type(screen.getByLabelText("Email"), "wrong@test.com");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Invalid email or password")).toBeInTheDocument();
  });

  it("shows 'Signing in…' while request is in progress", async () => {
    // Make signIn hang
    mockSignIn.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    render(<AdminLoginPage />);

    await user.type(screen.getByLabelText("Email"), "admin@test.com");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByText("Signing in…")).toBeInTheDocument();
  });

  it("shows practice name subtitle", () => {
    render(<AdminLoginPage />);
    expect(screen.getByText(/Functional Neurology/)).toBeInTheDocument();
  });
});
