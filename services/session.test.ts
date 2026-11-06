import { beforeEach, describe, expect, it } from "vitest";
import useStore from "@/store";
import { clearSession } from "./session";

describe("clearSession (log-out)", () => {
  beforeEach(() => {
    localStorage.setItem("accessToken", "access-1");
    localStorage.setItem("refreshToken", "refresh-1");
    sessionStorage.setItem("draft", "something");
    useStore.setState({
      user: {
        id: "u-1",
        email: "amaka@mail.com",
        firstname: "Amaka",
        lastname: "Okafor",
        country: { currency: "NGN", id: "c-1" },
      },
    });
  });

  it("removes both tokens, session storage and the stored user", () => {
    clearSession();

    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(localStorage.getItem("refreshToken")).toBeNull();
    expect(sessionStorage.length).toBe(0);
    expect(useStore.getState().user).toBeNull();
  });

  it("leaves non-personal preferences alone", () => {
    localStorage.setItem("theme", "dark");

    clearSession();

    expect(localStorage.getItem("theme")).toBe("dark");
  });
});
