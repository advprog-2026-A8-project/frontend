import { beforeEach, describe, expect, it } from "vitest";
import {
  clearCheckoutDraft,
  clearSession,
  isSessionAuthenticated,
  readCheckoutDraft,
  readSession,
  writeCheckoutDraft,
  writeSession,
} from "./client-session";

describe("client-session smoke", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("normalizes session payload and marks authenticated state correctly", () => {
    writeSession({ token: " token-value ", userId: " user-id ", role: "admin" });
    const session = readSession();

    expect(session).toEqual({ token: "token-value", userId: "user-id", role: "ADMIN" });
    expect(isSessionAuthenticated(session)).toBe(true);
  });

  it("returns unauthenticated state when session is incomplete", () => {
    writeSession({ token: "token-value", userId: "", role: "TITIPER" });
    const session = readSession();

    expect(isSessionAuthenticated(session)).toBe(false);
    clearSession();
    expect(readSession()).toEqual({ token: "", userId: "", role: "TITIPER" });
  });

  it("stores checkout draft only when product and jastiper are present", () => {
    writeCheckoutDraft({ productId: "product-1", jastiperId: "jastiper-1", productName: "Produk Test" });
    expect(readCheckoutDraft()).toEqual({
      productId: "product-1",
      jastiperId: "jastiper-1",
      productName: "Produk Test",
    });

    window.localStorage.setItem("json_frontend_checkout_draft", JSON.stringify({ productId: "product-1" }));
    expect(readCheckoutDraft()).toBeNull();

    clearCheckoutDraft();
    expect(readCheckoutDraft()).toBeNull();
  });
});
