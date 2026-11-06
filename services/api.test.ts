import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useStore from "@/store";
import { $api, ApiError } from "./api";

type Reply = { status: number; body?: unknown };

const reply = ({ status, body = {} }: Reply) => ({
  ok: status < 400,
  status,
  json: async () => body,
});

/** fetch mock answering by URL: each route gets its replies in order */
const mockFetch = (routes: Record<string, Reply[]>) => {
  const fetchMock = vi.fn(async (url: string) => {
    const route = Object.keys(routes).find((path) => url.includes(path));
    const next = route ? routes[route].shift() : undefined;
    if (!next) {
      throw new Error(`unexpected request ${url}`);
    }
    return reply(next);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const authHeader = (call: unknown[]) =>
  (call[1] as { headers: Record<string, string> }).headers.Authorization;

const signedInUser = {
  id: "u-1",
  email: "amaka@mail.com",
  firstname: "Amaka",
  lastname: "Okafor",
  country: { currency: "NGN", id: "c-1" },
};

describe("$api token refresh", () => {
  beforeEach(() => {
    localStorage.setItem("accessToken", "old-access");
    localStorage.setItem("refreshToken", "old-refresh");
    useStore.setState({ user: signedInUser });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("refreshes once on a 401 and retries the request with the new token", async () => {
    const fetchMock = mockFetch({
      "users/me": [
        { status: 401 },
        { status: 200, body: { data: { id: "u-1" } } },
      ],
      "auth/tokens": [
        {
          status: 200,
          body: { data: { accessToken: "new-access", refreshToken: "new-refresh" } },
        },
      ],
    });

    const { data } = await $api.get<{ id: string }>("users/me");

    expect(data.id).toBe("u-1");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1][0])).toContain(
      "auth/tokens?refreshToken=old-refresh"
    );
    expect(authHeader(fetchMock.mock.calls[2])).toBe("Bearer new-access");
    expect(localStorage.getItem("refreshToken")).toBe("new-refresh");
  });

  it("logs out when the refresh fails", async () => {
    mockFetch({
      "users/me": [{ status: 401 }],
      "auth/tokens": [{ status: 400 }],
    });

    await expect($api.get("users/me")).rejects.toBeInstanceOf(ApiError);

    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(localStorage.getItem("refreshToken")).toBeNull();
    expect(useStore.getState().user).toBeNull();
  });

  it("retries only once: a second 401 logs out without another refresh", async () => {
    const fetchMock = mockFetch({
      "users/me": [{ status: 401 }, { status: 401 }],
      "auth/tokens": [
        {
          status: 200,
          body: { data: { accessToken: "new-access", refreshToken: "new-refresh" } },
        },
      ],
    });

    await expect($api.get("users/me")).rejects.toBeInstanceOf(ApiError);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(localStorage.getItem("accessToken")).toBeNull();
  });

  it("shares one refresh between requests that fail at the same time", async () => {
    const fetchMock = mockFetch({
      "users/me": [{ status: 401 }, { status: 200, body: { data: 1 } }],
      "payslips": [{ status: 401 }, { status: 200, body: { data: 2 } }],
      "auth/tokens": [
        {
          status: 200,
          body: { data: { accessToken: "new-access", refreshToken: "new-refresh" } },
        },
      ],
    });

    await Promise.all([$api.get("users/me"), $api.get("payslips")]);

    const refreshes = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes("auth/tokens")
    );
    expect(refreshes).toHaveLength(1);
  });

  it("does not refresh or log out for a wrong password on login", async () => {
    const fetchMock = mockFetch({
      "auth/login": [{ status: 401, body: { message: "invalid credentials" } }],
    });

    await expect(
      $api.post("auth/login", { username: "a@b.c", password: "nope" })
    ).rejects.toThrow("invalid credentials");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("refreshToken")).toBe("old-refresh");
  });

  it("leaves calls that bring their own token alone", async () => {
    const fetchMock = mockFetch({ "employees/join": [{ status: 401 }] });

    await expect(
      $api.post(
        "employees/join",
        { token: "T" },
        { headers: { Authorization: "Bearer fresh-from-signup" } }
      )
    ).rejects.toBeInstanceOf(ApiError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("refreshToken")).toBe("old-refresh");
  });
});
