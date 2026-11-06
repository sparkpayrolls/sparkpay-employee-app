/**
 * Which modules are switched on. A stub until the backend serves
 * GET /me/features: these screens only had mock data, and stay off
 * until their backend modules exist (claims M03, notifications F-05,
 * earned wage access M02).
 */
const features = {
  reimbursements: false,
  notifications: false,
  salaryAdvance: false,
};

export type Feature = keyof typeof features;

export const isFeatureEnabled = (feature: Feature): boolean =>
  features[feature];
