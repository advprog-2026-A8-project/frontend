"use client";

import { SessionState } from "@/types/integration";

const KEY = "json_frontend_session";

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

