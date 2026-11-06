import { afterEach, describe, expect, it, vi } from "vitest";
import { useEffect } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { JOIN_FAILED_NOTICE, useLogin } from "./useLogin";

type Reply = { status: number; body?: unknown };

const mockApi = (routes: Record<string, Reply>) => {
  const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
    const route = Object.keys(routes).find((path) => url.includes(path));
    const { status, body = {} } = route
      ? routes[route]
      : { status: 404, body: {} };
    return { ok: status < 400, status, json: async () => body };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const signIn = {
  status: 200,
  body: {
    data: {
      accessToken: "access-1",
      refreshToken: "refresh-1",
      user: { id: "u-1", country: { id: "nigeria-id", currency: "NGN" } },
    },
  },
};

// Fills in the form and submits it, like a person tapping Sign in
function LoginHarness() {
  const { form } = useLogin();
  useEffect(() => {
    form
      .setValues({ email: "amaka@mail.com", password: "Passw0rd!" })
      .then(() => form.submitForm());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <p>{form.errors.email ?? "login page"}</p>;
}

function DashboardProbe() {
  const location = useLocation();
  const notice = (location.state as { notice?: string } | null)?.notice;
  return <p>{notice ?? "dashboard"}</p>;
}

const renderLogin = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/login" element={<LoginHarness />} />
        <Route path="/app/dashboard" element={<DashboardProbe />} />
      </Routes>
    </MemoryRouter>
  );

describe("useLogin", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("joins with the invite and goes to the dashboard", async () => {
    const fetchMock = mockApi({
      "auth/login": signIn,
      "employees/onboard/T1": {
        status: 200,
        body: { data: { company: { name: "Brightway", country: "ng" } } },
      },
      "employees/join": { status: 200 },
    });

    renderLogin("/login?onboarding_token=T1");

    expect(await screen.findByText("dashboard")).toBeTruthy();
    const join = fetchMock.mock.calls.find(([url]) =>
      String(url).includes("employees/join")
    );
    expect(JSON.parse(String((join?.[1] as RequestInit).body))).toEqual({
      token: "T1",
      country: "ng",
    });
  });

  it("does not call a failed join a wrong password: the person is signed in", async () => {
    mockApi({
      "auth/login": signIn,
      "employees/onboard/T1": { status: 400 },
      "employees/join": { status: 400, body: { message: "invalid onboarding code" } },
    });

    renderLogin("/login?onboarding_token=T1");

    expect(await screen.findByText(JOIN_FAILED_NOTICE)).toBeTruthy();
    expect(screen.queryByText("Invalid email or password")).toBeNull();
  });

  it("still reports a wrong password", async () => {
    mockApi({ "auth/login": { status: 401, body: { message: "invalid" } } });

    renderLogin("/login");

    expect(await screen.findByText("Invalid email or password")).toBeTruthy();
    expect(localStorage.getItem("accessToken")).toBeNull();
  });

  it('treats onboarding_token=null as no invite at all', async () => {
    const fetchMock = mockApi({ "auth/login": signIn });

    renderLogin("/login?onboarding_token=null");

    expect(await screen.findByText("dashboard")).toBeTruthy();
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).includes("employees/"))
    ).toBe(false);
  });
});
