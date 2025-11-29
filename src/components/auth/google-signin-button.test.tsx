import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GoogleSignInButton } from "./google-signin-button";

// Mock react-dom useFormStatus
vi.mock("react-dom", () => ({
  useFormStatus: () => ({ pending: false }),
}));

// Mock server action
vi.mock("@/app/auth/actions", () => ({
  loginWithGoogle: vi.fn(),
}));

describe("GoogleSignInButton", () => {
  it("renders correctly", () => {
    render(<GoogleSignInButton />);
    const button = screen.getByRole("button", { name: /sign in with google/i });
    expect(button).toBeDefined();
  });
});
