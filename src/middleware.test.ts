import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock getToken from next-auth/jwt
const mockGetToken = vi.fn();
vi.mock("next-auth/jwt", () => ({
  getToken: (...args: unknown[]) => mockGetToken(...args),
}));

// We need to import after mocking
import { middleware } from "./middleware";
import { NextRequest } from "next/server";

function createRequest(
  url: string,
  options?: { forwardedProto?: string }
): NextRequest {
  const headers = new Headers();
  if (options?.forwardedProto) {
    headers.set("x-forwarded-proto", options.forwardedProto);
  }
  return new NextRequest(new URL(url), { headers });
}

describe("Auth Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_SECRET = "test-secret";
  });

  // --- secureCookie tests (reverse proxy regression) ---

  it("passes secureCookie: true when x-forwarded-proto is https", async () => {
    mockGetToken.mockResolvedValue({ sub: "1" });
    await middleware(createRequest("http://localhost:3000/admin", { forwardedProto: "https" }));

    expect(mockGetToken).toHaveBeenCalledWith(
      expect.objectContaining({ secureCookie: true })
    );
  });

  it("passes secureCookie: true when URL protocol is https", async () => {
    mockGetToken.mockResolvedValue({ sub: "1" });
    await middleware(createRequest("https://example.com/admin"));

    expect(mockGetToken).toHaveBeenCalledWith(
      expect.objectContaining({ secureCookie: true })
    );
  });

  it("passes secureCookie: false when plain HTTP with no forwarded proto", async () => {
    mockGetToken.mockResolvedValue(null);
    await middleware(createRequest("http://localhost:3000/admin"));

    expect(mockGetToken).toHaveBeenCalledWith(
      expect.objectContaining({ secureCookie: false })
    );
  });

  it("passes the AUTH_SECRET to getToken", async () => {
    mockGetToken.mockResolvedValue(null);
    process.env.AUTH_SECRET = "my-secret-123";
    await middleware(createRequest("http://localhost:3000/admin"));

    expect(mockGetToken).toHaveBeenCalledWith(
      expect.objectContaining({ secret: "my-secret-123" })
    );
  });

  // --- Redirect logic tests ---

  it("redirects unauthenticated users from /admin to /admin/login", async () => {
    mockGetToken.mockResolvedValue(null);
    const res = await middleware(createRequest("http://localhost:3000/admin"));

    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/admin/login");
  });

  it("redirects unauthenticated users from /admin/patients to /admin/login", async () => {
    mockGetToken.mockResolvedValue(null);
    const res = await middleware(createRequest("http://localhost:3000/admin/patients"));

    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/admin/login");
  });

  it("allows unauthenticated users to access /admin/login", async () => {
    mockGetToken.mockResolvedValue(null);
    const res = await middleware(createRequest("http://localhost:3000/admin/login"));

    // NextResponse.next() returns 200
    expect(res.status).toBe(200);
  });

  it("redirects authenticated users from /admin/login to /admin", async () => {
    mockGetToken.mockResolvedValue({ sub: "1", email: "admin@test.com" });
    const res = await middleware(createRequest("http://localhost:3000/admin/login"));

    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/admin");
  });

  it("allows authenticated users to access /admin", async () => {
    mockGetToken.mockResolvedValue({ sub: "1", email: "admin@test.com" });
    const res = await middleware(createRequest("http://localhost:3000/admin"));

    expect(res.status).toBe(200);
  });

  it("allows authenticated users to access /admin sub-routes", async () => {
    mockGetToken.mockResolvedValue({ sub: "1", email: "admin@test.com" });
    const res = await middleware(createRequest("http://localhost:3000/admin/calendar"));

    expect(res.status).toBe(200);
  });

  // --- Reverse proxy full scenario ---

  it("authenticates correctly behind a reverse proxy (HTTPS via x-forwarded-proto)", async () => {
    // Simulates Render: internal HTTP request with x-forwarded-proto: https
    // The token IS present (user just signed in), so middleware should let them through
    mockGetToken.mockResolvedValue({ sub: "1", email: "admin@test.com" });
    const res = await middleware(
      createRequest("http://internal:3000/admin", { forwardedProto: "https" })
    );

    // Should NOT redirect — user is authenticated
    expect(res.status).toBe(200);

    // Must have used secureCookie: true so the cookie name matches
    expect(mockGetToken).toHaveBeenCalledWith(
      expect.objectContaining({ secureCookie: true })
    );
  });

  it("redirects to login behind a reverse proxy when not authenticated", async () => {
    // Simulates: secureCookie mismatch would cause this — token not found
    mockGetToken.mockResolvedValue(null);
    const res = await middleware(
      createRequest("http://internal:3000/admin", { forwardedProto: "https" })
    );

    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/admin/login");
  });
});
