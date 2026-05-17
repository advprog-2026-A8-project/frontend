"use client";

import { CheckoutDraft, SessionState } from "@/types/integration";

const KEY = "json_frontend_session";
const CHECKOUT_KEY = "json_frontend_checkout_draft";

export function readSession(): SessionState {
  if (typeof window === "undefined") return { token: "", userId: "", role: "TITIPER" };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { token: "", userId: "", role: "TITIPER" };
    return JSON.parse(raw) as SessionState;
  } catch {
    return { token: "", userId: "", role: "TITIPER" };
  }
}

export function writeSession(state: SessionState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

export function readCheckoutDraft(): CheckoutDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CHECKOUT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CheckoutDraft;
    if (!parsed.productId || !parsed.jastiperId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCheckoutDraft(draft: CheckoutDraft) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CHECKOUT_KEY, JSON.stringify(draft));
}

export function clearCheckoutDraft() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CHECKOUT_KEY);
}
