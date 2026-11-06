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
