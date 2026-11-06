/**
 * This file provides functions to connect to backend APIs.
 */

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
  private static readonly baseUrl = process.env.API_URL;

  private static getUrl(endpoint: string, config?: HTTPConfig): string {
    let url = `${this.baseUrl}/${endpoint}`;
    if (config?.params) {
      url += `?${new URLSearchParams(config.params).toString()}`;
    }
    return url;
  }

  static setUser: ((user: User | null) => unknown) | null = null;

  private static handleResponse<T>(
    response: Response
  ): Promise<ApiResponse<T>> {
    if (!response.ok) {
      if (response.status === 401) {
        $api.setUser?.(null);
      }

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

  // One refresh shared by every request that gets a 401 at the same time
  private static refreshing: Promise<boolean> | null = null;

  /** Swaps the refresh token for new tokens. Resolves false if it cannot. */
  private static refreshTokens(): Promise<boolean> {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      return Promise.resolve(false);
    }

    $api.refreshing =
      $api.refreshing ||
      fetch($api.getUrl("auth/tokens", { params: { refreshToken } }))
        .then(async (response) => {
          if (!response.ok) {
            return false;
          }
          const { data } = await response.json();
          if (!data?.accessToken || !data?.refreshToken) {
            return false;
          }
          localStorage.setItem("accessToken", data.accessToken);
          localStorage.setItem("refreshToken", data.refreshToken);
          return true;
        })
        .catch(() => false)
        .finally(() => {
          $api.refreshing = null;
        });

    return $api.refreshing;
  }

  private static async handleRequest<T>(
    url: string,
    method: string,
    data?: unknown,
    config?: HTTPConfig,
    isRetry = false
  ): Promise<ApiResponse<T>> {
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
    if (response.status === 401 && usesStoredToken && !isRetry) {
      if (await $api.refreshTokens()) {
        return $api.handleRequest<T>(url, method, data, config, true);
      }
      clearSession();
    } else if (response.status === 401 && usesStoredToken) {
      clearSession();
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

// 2. Using the existing Firebase connection
import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  DocumentData,
} from "firebase/firestore";
import { db } from "../firebase"; // Assuming firebase.ts is in the root
import { User } from "@/store";
import { clearSession } from "./session";

/**
 * Fetches data from a Firestore collection.
 *
 * @param collectionName The name of the collection to fetch data from.
 * @returns A promise that resolves with an array of documents, or an empty array if an error occurs.
 */
export const getFirestoreData = async <T extends { id: string }>(
  collectionName: string
): Promise<T[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const data: T[] = [];
    querySnapshot.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() } as T);
    });
    return data;
  } catch (error) {
    console.error("Failed to get data from Firestore:", error);
    return [];
  }
};

/**
 * Adds a new document to a Firestore collection.
 *
 * @param collectionName The name of the collection to add the document to.
 * @param data The data to be added.
 * @returns A promise that resolves with the newly created document, or null if an error occurs.
 */
export const addFirestoreData = async <T extends DocumentData>(
  collectionName: string,
  data: T
): Promise<T | null> => {
  try {
    const docRef = await addDoc(collection(db, collectionName), data);
    return { id: docRef.id, ...data } as T;
  } catch (error) {
    console.error("Failed to add data to Firestore:", error);
    return null;
  }
};

/**
 * Fetches a single document from a Firestore collection by its ID.
 *
 * @param collectionName The name of the collection.
 * @param id The ID of the document to fetch.
 * @returns A promise that resolves with the document data, or null if it doesn't exist or an error occurs.
 */
export const getFirestoreDoc = async <T extends { id: string }>(
  collectionName: string,
  id: string
): Promise<T | null> => {
  try {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T;
    } else {
      console.log("No such document!");
      return null;
    }
  } catch (error) {
    console.error("Failed to get document from Firestore:", error);
    return null;
  }
};
