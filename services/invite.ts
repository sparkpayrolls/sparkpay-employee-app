import { $api } from "./api";

/** The invited employee, from GET /employees/onboard/:token. */
export interface Invite {
  email: string;
  firstname: string;
  lastname: string;
  country?: string;
  company: {
    name: string;
    country?: string;
  };
}

interface Country {
  id: string;
  name?: string;
  iso2?: string;
}

export const getInvite = async (token: string): Promise<Invite> => {
  const { data } = await $api.get<Invite>(`employees/onboard/${token}`);
  return data;
};

/**
 * Country for sign-up and joining: the employee's own, or their employer's
 * until onboarding sets one. Replaces a hard-coded Nigeria ID.
 */
export const inviteCountry = (invite: Invite): string =>
  invite.country || invite.company?.country || "";

/**
 * Nigeria, looked up rather than hard-coded. Only for when neither country
 * is known, for example a backend older than the employer-country lookup:
 * every invite used Nigeria before. Matched by name as well as code:
 * production's Nigeria record predates the iso2 field and has none.
 */
export const fallbackCountry = async (): Promise<string> => {
  const { data } = await $api.get<Country[]>("countries", {
    params: { all: "true" },
  });
  return (
    data.find(
      (country) => country.iso2 === "NG" || country.name === "Nigeria"
    )?.id ?? ""
  );
};

export const resolveInviteCountry = async (invite: Invite): Promise<string> =>
  inviteCountry(invite) || fallbackCountry();
