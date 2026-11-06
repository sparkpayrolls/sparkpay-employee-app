import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import useStore from "@/store";
import DefaultLayout from "./DefaultLayout";

describe("DefaultLayout", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("sends a logged-out person to the login page", async () => {
    // no tokens: GET users/me is a 401 and there is nothing to refresh with
    useStore.setState({ user: null });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) }))
    );

    render(
      <MemoryRouter initialEntries={["/app/dashboard"]}>
        <Routes>
          <Route path="/login" element={<p>login screen</p>} />
          <Route path="/app" element={<DefaultLayout />}>
            <Route path="dashboard" element={<p>dashboard</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("login screen")).toBeTruthy();
    expect(screen.queryByText("dashboard")).toBeNull();
  });
});
