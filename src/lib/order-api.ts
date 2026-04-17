import { CheckoutPayload, Order, OrderStatus, RatingPayload } from "@/types/order";

interface ApiOptions {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  headers?: Record<string, string>;
}

function toQueryString(query?: ApiOptions["query"]): string {
  if (!query) return "";
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  });
  const output = params.toString();
  return output ? `?${output}` : "";
}

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, query, headers } = options;
  const response = await fetch(`/api/proxy${path}${toQueryString(query)}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(headers ?? {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

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

export const orderApi = {
  checkout(payload: CheckoutPayload, idempotencyKey?: string) {
    return request<Order>("/orders/checkout", {
      method: "POST",
      body: payload,
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
    });
  },
  getAll() {
    return request<Order[]>("/orders");
  },
  getTitiperActive(userId: string) {
    return request<Order[]>(`/orders/titiper/${userId}/active`);
  },
  getTitiperHistory(userId: string) {
    return request<Order[]>(`/orders/titiper/${userId}/history`);
  },
  getJastiperTodo(jastiperId: string) {
    return request<Order[]>(`/orders/jastiper/${jastiperId}/todo`);
  },
  getJastiperProcessing(jastiperId: string) {
    return request<Order[]>(`/orders/jastiper/${jastiperId}/processing`);
  },
  getJastiperCompleted(jastiperId: string) {
    return request<Order[]>(`/orders/jastiper/${jastiperId}/completed`);
  },
  getAdminActive() {
    return request<Order[]>("/orders/admin/active");
  },
  updateStatus(orderId: string, status: OrderStatus) {
    return request<Order>(`/orders/${orderId}/status`, {
      method: "PATCH",
      query: { status },
    });
  },
  cancelByJastiper(orderId: string, jastiperId: string) {
    return request<Order>(`/orders/${orderId}/cancel`, {
      method: "POST",
      query: { jastiperId },
    });
  },
  submitRating(orderId: string, payload: RatingPayload) {
    return request<Order>(`/orders/${orderId}/rating`, {
      method: "POST",
      body: payload,
    });
  },
};
