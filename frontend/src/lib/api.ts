export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    ...options,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });
  const value = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(
      value?.error?.message ?? "The request could not be completed.",
      response.status,
      value?.error?.code ?? "REQUEST_FAILED",
    );
  if (value === null)
    throw new ApiError(
      "The server returned an invalid response. Please try again.",
      502,
      "INVALID_RESPONSE",
    );
  return value as T;
}
export const send = <T>(path: string, data: unknown = {}, method = "POST") =>
  api<T>(path, { method, body: JSON.stringify(data) });
export const date = (value: string) =>
  new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
    new Date(value),
  );
