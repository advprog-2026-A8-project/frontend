import { gatewayRequest } from "@/lib/gateway-api";
import { CheckoutPayload, Order, OrderStatus, RatingPayload } from "@/types/order";

interface CommonHeaders {
  authorization?: string;
  idempotencyKey?: string;
}

export const orderApi = {
  checkout(payload: CheckoutPayload, headers?: CommonHeaders) {
    return gatewayRequest<Order>("order", "api/orders/checkout", {
      method: "POST",
      body: payload,
      headers: {
        Authorization: headers?.authorization,
        "Idempotency-Key": headers?.idempotencyKey,
      },
    });
  },
  getAll(headers?: CommonHeaders) {
    return gatewayRequest<Order[]>("order", "api/orders", {
      headers: { Authorization: headers?.authorization },
    });
  },
  getTitiperActive(userId: string, headers?: CommonHeaders) {
    return gatewayRequest<Order[]>("order", `api/orders/titiper/${userId}/active`, {
      headers: { Authorization: headers?.authorization },
    });
  },
  getTitiperHistory(userId: string, headers?: CommonHeaders) {
    return gatewayRequest<Order[]>("order", `api/orders/titiper/${userId}/history`, {
      headers: { Authorization: headers?.authorization },
    });
  },
  getJastiperTodo(jastiperId: string, headers?: CommonHeaders) {
    return gatewayRequest<Order[]>("order", `api/orders/jastiper/${jastiperId}/todo`, {
      headers: { Authorization: headers?.authorization },
    });
  },
  getJastiperProcessing(jastiperId: string, headers?: CommonHeaders) {
    return gatewayRequest<Order[]>("order", `api/orders/jastiper/${jastiperId}/processing`, {
      headers: { Authorization: headers?.authorization },
    });
  },
  getJastiperCompleted(jastiperId: string, headers?: CommonHeaders) {
    return gatewayRequest<Order[]>("order", `api/orders/jastiper/${jastiperId}/completed`, {
      headers: { Authorization: headers?.authorization },
    });
  },
  getAdminActive(headers?: CommonHeaders) {
    return gatewayRequest<Order[]>("order", "api/orders/admin/active", {
      headers: { Authorization: headers?.authorization },
    });
  },
  updateStatus(orderId: string, status: OrderStatus, headers?: CommonHeaders) {
    return gatewayRequest<Order>("order", `api/orders/${orderId}/status`, {
      method: "PATCH",
      query: { status },
      headers: { Authorization: headers?.authorization },
    });
  },
  cancelByJastiper(orderId: string, jastiperId: string, headers?: CommonHeaders) {
    return gatewayRequest<Order>("order", `api/orders/${orderId}/cancel`, {
      method: "POST",
      query: { jastiperId },
      headers: { Authorization: headers?.authorization },
    });
  },
  submitRating(orderId: string, payload: RatingPayload, headers?: CommonHeaders) {
    return gatewayRequest<Order>("order", `api/orders/${orderId}/rating`, {
      method: "POST",
      body: payload,
      headers: { Authorization: headers?.authorization },
    });
  },
};
