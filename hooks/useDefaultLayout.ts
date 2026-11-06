import { useEffect, useState } from "react";
import useStore, { User } from "@/store";
import { $api } from "@/services/api";

export const useDefaultLayout = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { user, setUser } = useStore();

  useEffect(() => {
    $api
      .get<User>("users/me")
      .then(({ data }) => {
        setUser(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  return { isAuthenticated: !!user, isLoading };
};
