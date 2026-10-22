export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://stellarcampus-backend.onrender.com/api"
).replace(/\/+$/, "");
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public payload: unknown,
  ) {
    super(message);
  }
}
export async function apiRequest(
  path: string,
  options: {
    method?: string;
    token?: string;
    body?: unknown;
    signal?: AbortSignal;
    timeout?: number;
  } = {},
): Promise<unknown> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) controller.abort();
  const timer = setTimeout(abort, options.timeout ?? 45000);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? (options.body === undefined ? "GET" : "POST"),
      headers: {
        Accept: "application/json",
        ...(options.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      ...(options.body !== undefined
        ? { body: JSON.stringify(options.body) }
        : {}),
      signal: controller.signal,
      cache: "no-store",
      credentials: "omit",
    });
    const text = await response.text();
    let payload: unknown;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      throw new ApiError(
        "The API returned an unreadable response. Please try again.",
        response.status,
        null,
      );
    }
    if (!response.ok) {
      const data = payload as { message?: string };
      throw new ApiError(
        typeof data?.message === "string"
          ? data.message
          : `Request failed (${response.status}). Please try again.`,
        response.status,
        payload,
      );
    }
    return payload;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted)
      throw new Error(
        "The request was cancelled or timed out. Please try again.",
      );
    throw new Error(
      "Cannot reach StellarCampus. Check your connection and try again.",
    );
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
}
