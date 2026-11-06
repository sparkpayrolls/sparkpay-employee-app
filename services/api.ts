/**
 * This file provides functions to connect to backend APIs.
 */
import { clearSession } from "./session";

type ApiResponse<T> = {
  data: T;
  meta?: {
    total: number;
    perPage: number;
    pageCount: number;
    page: number;
    pagingCounter: number;
    hasPrevPage: boolean;
    hasNextPage: boolean;
    previousPage: number | null;
    nextPage: number | null;
  };
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors: Record<string, unknown> | null = null
  ) {
    super(message);
  }
}

type HTTPConfig = {
  params?: Record<string, string>;
  headers?: Record<string, string>;
};

export class $api {
  // VITE_API_URL is the standard Vite variable; API_URL (through the define
  // in vite.config.ts) keeps current deployments working until it is set.
  private static readonly baseUrl =
    import.meta.env.VITE_API_URL || process.env.API_URL;

  private static getUrl(endpoint: string, config?: HTTPConfig): string {
    let url = `${this.baseUrl}/${endpoint}`;
    if (config?.params) {
      url += `?${new URLSearchParams(config.params).toString()}`;
    }
    return url;
  }

  private static handleResponse<T>(
    response: Response
  ): Promise<ApiResponse<T>> {
    if (!response.ok) {
      // a 401 no longer resets the user here: handleRequest logs out through
      // clearSession, and only if the request belongs to the current session
      return response
        .json()
        .then((data) => {
          throw new ApiError(data.message, response.status, data.errors);
        })
        .catch((err) => {
          if (err instanceof ApiError) {
            throw err;
          }

          throw new ApiError("Failed to fetch data", response.status);
        });
    }

    return response.json().then(({ data, meta }) => ({ data, meta }));
  }

  // One refresh per session, shared by every request that gets a 401 at
  // the same time
  private static refreshing: {
    refreshToken: string;
    result: Promise<boolean>;
  } | null = null;

  /** Swaps the refresh token for new tokens. Resolves false if it cannot. */
  private static refreshTokens(): Promise<boolean> {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      return Promise.resolve(false);
    }
    if ($api.refreshing?.refreshToken === refreshToken) {
      return $api.refreshing.result;
    }

    const result = fetch(
      $api.getUrl("auth/tokens", { params: { refreshToken } })
    )
      .then(async (response) => {
        if (!response.ok) {
          return false;
        }
        const { data } = await response.json();
        if (!data?.accessToken || !data?.refreshToken) {
          return false;
        }
        // Logged out, or someone else signed in, while this was in flight:
        // never write this session's tokens over that
        if (localStorage.getItem("refreshToken") !== refreshToken) {
          return false;
        }
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        if ($api.refreshing?.result === result) {
          $api.refreshing = null;
        }
      });
    $api.refreshing = { refreshToken, result };

    return result;
  }

  private static async handleRequest<T>(
    url: string,
    method: string,
    data?: unknown,
    config?: HTTPConfig,
    isRetry = false
  ): Promise<ApiResponse<T>> {
    // the session this request belongs to: a late 401 from an earlier
    // session must not log out whoever is signed in now
    const session = localStorage.getItem("refreshToken");
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        ...config?.headers,
      },
      body: JSON.stringify(data),
    });

    // A 401 gets one refresh and one retry, then logs out. Not for login,
    // sign-up and refresh themselves, or calls that bring their own token.
    const usesStoredToken =
      !config?.headers?.Authorization && !url.includes("/auth/");
    if (response.status === 401 && usesStoredToken) {
      if (!isRetry && (await $api.refreshTokens())) {
        return $api.handleRequest<T>(url, method, data, config, true);
      }
      if (localStorage.getItem("refreshToken") === session) {
        clearSession();
      }
    }

    return $api.handleResponse<T>(response);
  }

  static async get<T>(
    endpoint: string,
    config?: HTTPConfig
  ): Promise<ApiResponse<T>> {
    return this.handleRequest<T>(
      this.getUrl(endpoint, config),
      "GET",
      undefined,
      config
    );
  }

  static async post<T>(
    endpoint: string,
    data?: unknown,
    config?: HTTPConfig
  ): Promise<ApiResponse<T>> {
    return this.handleRequest<T>(
      this.getUrl(endpoint, config),
      "POST",
      data,
      config
    );
  }

  static async put<T>(
    endpoint: string,
    data?: unknown,
    config?: HTTPConfig
  ): Promise<ApiResponse<T>> {
    return this.handleRequest<T>(
      this.getUrl(endpoint, config),
      "PUT",
      data,
      config
    );
  }

  static async delete<T>(
    endpoint: string,
    config?: HTTPConfig
  ): Promise<ApiResponse<T>> {
    return this.handleRequest<T>(
      this.getUrl(endpoint, config),
      "DELETE",
      undefined,
      config
    );
  }
}

