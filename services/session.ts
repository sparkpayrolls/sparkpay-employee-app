import useStore from "@/store";

/**
 * Log-out: forget the tokens and everything kept for this person. Calls no
 * API, so it works offline and after the tokens have expired.
 */
export const clearSession = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  sessionStorage.clear();
  useStore.setState({ user: null });
};
