import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getInvite,
  Invite,
  inviteCountry,
  resolveInviteCountry,
} from "./invite";

const invite = (overrides: Partial<Invite> = {}): Invite => ({
  email: "amaka@mail.com",
  firstname: "Amaka",
  lastname: "Okafor",
  company: { name: "Brightway Ltd", country: "company-country" },
  ...overrides,
});

const countriesApi = () => {
  const fetchMock = vi.fn(async (_url: string) => ({
    ok: true,
    status: 200,
    json: async () => ({
      data: [
        { id: "ghana-id", iso2: "GH" },
        { id: "nigeria-id", iso2: "NG" },
      ],
    }),
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

describe("inviteCountry", () => {
  it("uses the employee's own country when they have one", () => {
    expect(inviteCountry(invite({ country: "employee-country" }))).toBe(
      "employee-country"
    );
  });

  it("falls back to the employer's country", () => {
    expect(inviteCountry(invite())).toBe("company-country");
  });

  it("is empty rather than a guessed country when neither is known", () => {
    expect(inviteCountry(invite({ company: { name: "Brightway Ltd" } }))).toBe(
      ""
    );
  });
});

describe("resolveInviteCountry", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("does not call the API when the invite has a country", async () => {
    const fetchMock = countriesApi();

    await expect(resolveInviteCountry(invite())).resolves.toBe(
      "company-country"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("looks Nigeria up by code when the backend sends no country (older backend)", async () => {
    const fetchMock = countriesApi();

    await expect(
      resolveInviteCountry(invite({ company: { name: "Brightway Ltd" } }))
    ).resolves.toBe("nigeria-id");
    expect(String(fetchMock.mock.calls[0][0])).toContain("countries?all=true");
  });
});

describe("fallbackCountry against production data", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("finds Nigeria by name when the record has no iso2 (production today)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string) => ({
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ id: "6151053e38bc69b9207a53d5", name: "Nigeria" }],
        }),
      }))
    );

    await expect(
      resolveInviteCountry(invite({ company: { name: "Brightway Ltd" } }))
    ).resolves.toBe("6151053e38bc69b9207a53d5");
  });
});

describe("getInvite", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps a crafted token inside the invite path instead of reaching other endpoints", async () => {
    const fetchMock = vi.fn(async (_url: string) => ({
      ok: false,
      status: 400,
      json: async () => ({ message: "invalid onboarding code" }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    await getInvite("../../users/me?x=1").catch(() => undefined);

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("employees/onboard/..%2F..%2Fusers%2Fme%3Fx%3D1");
    expect(new URL(url, "http://api.test").pathname).toMatch(
      /^\/(.*\/)?employees\/onboard\/[^/]+$/
    );
  });
});
