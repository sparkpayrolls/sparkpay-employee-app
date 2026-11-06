import { describe, expect, it } from "vitest";
import { Invite, inviteCountry } from "./invite";

const invite = (overrides: Partial<Invite> = {}): Invite => ({
  email: "amaka@mail.com",
  firstname: "Amaka",
  lastname: "Okafor",
  company: { name: "Brightway Ltd", country: "company-country" },
  ...overrides,
});

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
