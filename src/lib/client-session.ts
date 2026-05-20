"use client";

import { CheckoutDraft, SessionState } from "@/types/integration";

const KEY = "json_frontend_session";
const CHECKOUT_KEY = "json_frontend_checkout_draft";
const EMPTY_SESSION: SessionState = { token: "", userId: "", role: "TITIPER" };

function normalizeSession(raw: Partial<SessionState> | null | undefined): SessionState {
  if (!raw) return EMPTY_SESSION;
  const token = typeof raw.token === "string" ? raw.token.trim() : "";
  const userId = typeof raw.userId === "string" ? raw.userId.trim() : "";
  const role = typeof raw.role === "string" && raw.role.trim() ? raw.role.trim().toUpperCase() : "TITIPER";
  return { token, userId, role };
}

export function isSessionAuthenticated(session: SessionState): boolean {
  return Boolean(session.token && session.userId);
}

export function readSession(): SessionState {
  if (typeof window === "undefined") return EMPTY_SESSION;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY_SESSION;
    return normalizeSession(JSON.parse(raw) as Partial<SessionState>);
  } catch {
    return EMPTY_SESSION;
  }
}

export function writeSession(state: SessionState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(normalizeSession(state)));
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
