import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AcceptInvite from "./AcceptInvite";

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/accept-invite" element={<AcceptInvite />} />
      </Routes>
    </MemoryRouter>
  );

describe("AcceptInvite error screen", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("does not offer 'Sign in to finish joining' when the link has no token", async () => {
    renderAt("/accept-invite");

    expect(await screen.findByText("No onboarding token provided.")).toBeTruthy();
    expect(screen.queryByText("Sign in to finish joining")).toBeNull();
  });

  it("offers it when the link has a token but the invite cannot be loaded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 400,
        json: async () => ({ message: "invalid onboarding code" }),
      }))
    );

    renderAt("/accept-invite?token=T1");

    expect(await screen.findByText("invalid onboarding code")).toBeTruthy();
    expect(screen.getByText("Sign in to finish joining")).toBeTruthy();
  });
});
