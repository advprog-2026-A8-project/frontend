"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { gatewayRequest } from "@/lib/gateway-api";
import { readSession, writeSession } from "@/lib/client-session";

export default function ProfilePage() {
  const router = useRouter();
  const [session, setSession] = useState(readSession());
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ username: "", fullName: "", phoneNumber: "", bio: "" });
  const auth = session.token ? `Bearer ${session.token}` : "";
  const isAuthenticated = Boolean(session.token);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login?next=/profile");
    }
  }, [isAuthenticated, router]);

  async function run(action: () => Promise<unknown>) {
    setError("");
    try {
      const result = await action();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aksi profile gagal.");
    }
  }

  function saveSession() {
    writeSession(session);
  }

  async function updateProfile(event: FormEvent) {
    event.preventDefault();
    await run(() =>
      gatewayRequest("auth", "api/profile/me", {
        method: "PUT",
        headers: { Authorization: auth },
        body: form,
      })
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="bg-[linear-gradient(165deg,#fff7ed_0%,#fefce8_35%,#dbeafe_100%)] dark:bg-[linear-gradient(165deg,#0b1220_0%,#111827_50%,#1f2937_100%)]">
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <div className="rounded-2xl border border-slate-200 bg-white/85 p-6 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/85 dark:text-slate-300">
            Mengecek sesi login... jika belum login Anda akan diarahkan ke halaman{" "}
            <Link href="/login" className="font-semibold text-orange-600 hover:underline dark:text-orange-300">
              login
            </Link>
            .
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="bg-[linear-gradient(165deg,#fff7ed_0%,#fefce8_35%,#dbeafe_100%)] dark:bg-[linear-gradient(165deg,#0b1220_0%,#111827_50%,#1f2937_100%)]">
      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-orange-100 bg-white p-6 shadow-lg shadow-orange-100/60 sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-orange-200/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-amber-200/30 blur-3xl" />

          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">Akun Saya</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">Profil Titiper JSON</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Kelola identitas, keamanan akun, dan preferensi belanja jastip Anda dalam satu halaman.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
                <p className="text-xs uppercase tracking-wide text-orange-700">Role</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{session.role || "TITIPER"}</p>
              </div>
              <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
                <p className="text-xs uppercase tracking-wide text-orange-700">User ID</p>
                <p className="mt-1 truncate text-sm font-medium text-slate-900">{session.userId || "-"}</p>
              </div>
              <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
                <p className="text-xs uppercase tracking-wide text-orange-700">Status Login</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{session.token ? "Aktif" : "Belum Login"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="text-xl font-semibold text-slate-900">Edit Informasi Profil</h2>
            <p className="mt-1 text-sm text-slate-600">Perbarui data profil agar akun Anda terpercaya oleh pelanggan dan jastiper.</p>

            <form onSubmit={updateProfile} className="mt-5 grid gap-3 sm:grid-cols-2">
              <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-orange-400" placeholder="Username" value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} />
              <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-orange-400" placeholder="Full Name" value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} />
              <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-orange-400" placeholder="Phone Number" value={form.phoneNumber} onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))} />
              <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-orange-400" placeholder="Bio" value={form.bio} onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))} />
              <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 sm:col-span-2">
                Simpan Profil
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Keamanan & Session</h2>
            <p className="mt-1 text-sm text-slate-600">Sinkronkan token dan identitas pengguna.</p>

            <div className="mt-4 grid gap-2">
              <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-orange-400" placeholder="User ID (UUID)" value={session.userId} onChange={(e) => setSession((p) => ({ ...p, userId: e.target.value }))} />
              <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-orange-400" placeholder="Role" value={session.role} onChange={(e) => setSession((p) => ({ ...p, role: e.target.value }))} />
              <textarea className="min-h-24 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-orange-400" placeholder="JWT token" value={session.token} onChange={(e) => setSession((p) => ({ ...p, token: e.target.value }))} />
            </div>
            <button onClick={saveSession} className="mt-3 w-full rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600">
              Simpan Session
            </button>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Aktivitas Akun</h2>
          <p className="mt-1 text-sm text-slate-600">Ambil data profil dan daftar jastiper langsung dari backend authentication.</p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button onClick={() => run(() => gatewayRequest("auth", "api/profile/me", { headers: { Authorization: auth } }))} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-500">
              Muat Profil Saya
            </button>
            <button onClick={() => run(() => gatewayRequest("auth", "api/profile/jastiper", { headers: { Authorization: auth } }))} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-500">
              Lihat Daftar Jastiper
            </button>
          </div>

          {error && <p className="mt-4 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          {data !== null && <pre className="mt-4 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(data, null, 2)}</pre>}
        </section>
      </section>
    </main>
  );
}
