import { BackendService } from "@/types/integration";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: Method;
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
  headers?: Record<string, string | undefined>;
}

function queryString(query?: RequestOptions["query"]) {
  if (!query) return "";
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  const result = params.toString();
  return result ? `?${result}` : "";
}

export async function gatewayRequest<T>(
  service: BackendService,
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, query, headers } = options;
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;

  const response = await fetch(
    `/api/gateway/${service}/${normalizedPath}${queryString(query)}`,
    {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...Object.fromEntries(
          Object.entries(headers ?? {}).filter(([, value]) => typeof value === "string" && value.length > 0)
        ),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    }
  );

  const text = await response.text();
  let data: unknown = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null
        ? (data as { message?: string; error?: string }).message ??
          (data as { message?: string; error?: string }).error
        : undefined;
    throw new Error(message ?? "Request gagal diproses.");
  }

  return data as T;
}
