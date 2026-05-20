"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { gatewayRequest } from "@/lib/gateway-api";
import { readSession } from "@/lib/client-session";

type ApiEnvelope<T> = {
  message?: string;
  data?: T;
};

type ProfileData = {
  id: string;
  username: string;
  email: string;
  fullName?: string | null;
  phoneNumber?: string | null;
  bio?: string | null;
  role: string;
  accountStatus?: string | null;
  kycStatus?: string | null;
  successfulTransactionCount?: number | null;
};

function unwrapData<T>(payload: T | ApiEnvelope<T>): T {
  if (payload && typeof payload === "object" && "data" in (payload as Record<string, unknown>)) {
    const envelope = payload as ApiEnvelope<T>;
    return (envelope.data ?? ({} as T)) as T;
  }
  return payload as T;
}

export default function ProfilePage() {
  const router = useRouter();
  const session = useMemo(() => readSession(), []);
  const auth = session.token ? `Bearer ${session.token}` : "";
  const isAuthenticated = Boolean(session.token);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [jastiperDirectory, setJastiperDirectory] = useState<ProfileData[]>([]);
  const [lookupResult, setLookupResult] = useState<ProfileData | null>(null);
  const [lookupForm, setLookupForm] = useState({ id: "", username: "", email: "" });
  const [form, setForm] = useState({ username: "", fullName: "", phoneNumber: "", bio: "" });
  const [kycForm, setKycForm] = useState({ fullName: "", identityDocumentUrl: "", socialMediaUrl: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const role = (profile?.role ?? session.role ?? "TITIPER").toUpperCase();
  const isAdmin = role.includes("ADMIN");
  const isJastiper = role.includes("JASTIPER");

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login?next=/profile");
    }
  }, [isAuthenticated, router]);

  async function run(action: () => Promise<void>, success?: string) {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await action();
      if (success) setMessage(success);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aksi profile gagal.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMyProfile() {
    const payload = await gatewayRequest<ApiEnvelope<ProfileData>>("auth", "api/profile/me", {
      headers: { Authorization: auth },
    });
    const data = unwrapData<ProfileData>(payload);
    setProfile(data);
    setForm({
      username: data.username ?? "",
      fullName: data.fullName ?? "",
      phoneNumber: data.phoneNumber ?? "",
      bio: data.bio ?? "",
    });
  }

  async function updateProfile(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      await gatewayRequest("auth", "api/profile/me", {
        method: "PUT",
        headers: { Authorization: auth },
        body: form,
      });
      await loadMyProfile();
    }, "Profil berhasil diperbarui.");
  }

  async function submitKyc(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      await gatewayRequest("auth", "api/profile/kyc/submit", {
        method: "POST",
        headers: { Authorization: auth },
        body: kycForm,
      });
      await loadMyProfile();
    }, "Pengajuan KYC berhasil dikirim.");
  }

  async function loadJastiperDirectory() {
    const payload = await gatewayRequest<ApiEnvelope<ProfileData[]>>("auth", "api/profile/jastiper", {
      headers: { Authorization: auth },
    });
    setJastiperDirectory(unwrapData<ProfileData[]>(payload));
  }

  async function lookupProfile(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (lookupForm.id.trim()) params.set("id", lookupForm.id.trim());
    if (lookupForm.username.trim()) params.set("username", lookupForm.username.trim());
    if (lookupForm.email.trim()) params.set("email", lookupForm.email.trim());
    if (params.size === 0) {
      setError("Isi salah satu field lookup: id, username, atau email.");
      return;
    }
    await run(async () => {
      const payload = await gatewayRequest<ApiEnvelope<ProfileData>>("auth", `api/profile/lookup?${params.toString()}`, {
        headers: { Authorization: auth },
      });
      setLookupResult(unwrapData<ProfileData>(payload));
    }, "Lookup profil berhasil.");
  }

  useEffect(() => {
    if (isAuthenticated) {
      run(loadMyProfile);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          Mengecek sesi login... Anda akan diarahkan ke halaman login.
        </section>
      </main>
    );
  }

  return (
    <main className="app-page">
      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-300/70 dark:border-slate-700 dark:bg-slate-900/80 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">Akun Saya</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">Profil Pengguna JSON</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Kelola data akun, pantau status verifikasi, dan ajukan KYC dalam satu halaman ringkas.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => run(loadMyProfile, "Profil berhasil dimuat.")} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-500 dark:border-slate-700 dark:text-slate-100">
              Refresh Profil
            </button>
            <button onClick={() => run(loadJastiperDirectory, "Direktori jastiper berhasil dimuat.")} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700">
              Load Direktori Jastiper
            </button>
            {isJastiper && (
              <Link href="/jastiper" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700">
                Buka Jastiper Center
              </Link>
            )}
            {isAdmin && (
              <Link href="/admin" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700">
                Buka Admin Center
              </Link>
            )}
          </div>
          {message && <p className="mt-4 rounded-xl border border-slate-300 bg-slate-100 p-3 text-sm text-slate-700">{message}</p>}
          {error && <p className="mt-4 rounded-xl border border-slate-300 bg-slate-100 p-3 text-sm text-slate-700">{error}</p>}

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-700">Role</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{role}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-700">Status Akun</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{profile?.accountStatus ?? "-"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-700">KYC Status</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{profile?.kycStatus ?? "-"}</p>
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
              <p className="text-xs uppercase tracking-wide text-slate-700 dark:text-slate-300">User ID</p>
              <p className="mt-1 truncate font-mono text-sm text-slate-900 dark:text-slate-100">{profile?.id ?? session.userId ?? "-"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
              <p className="text-xs uppercase tracking-wide text-slate-700 dark:text-slate-300">Email</p>
              <p className="mt-1 truncate text-sm text-slate-900 dark:text-slate-100">{profile?.email ?? "-"}</p>
            </div>
          </div>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Cari Profil & Direktori Jastiper</h2>
          <form onSubmit={lookupProfile} className="mt-4 grid gap-2 sm:grid-cols-3">
            <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Lookup by user ID" value={lookupForm.id} onChange={(e) => setLookupForm((prev) => ({ ...prev, id: e.target.value }))} />
            <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Lookup by username" value={lookupForm.username} onChange={(e) => setLookupForm((prev) => ({ ...prev, username: e.target.value }))} />
            <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Lookup by email" value={lookupForm.email} onChange={(e) => setLookupForm((prev) => ({ ...prev, email: e.target.value }))} />
            <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700 sm:col-span-3" disabled={loading}>
              Lookup Profil
            </button>
          </form>

          {lookupResult && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-950/50">
              <p className="font-semibold">{lookupResult.username} ({lookupResult.role})</p>
              <p className="truncate text-xs text-slate-500">{lookupResult.id}</p>
              <p className="text-xs">{lookupResult.email}</p>
              <p className="text-xs">KYC: {lookupResult.kycStatus ?? "-"}</p>
            </div>
          )}

          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {jastiperDirectory.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
                <p className="font-semibold">{item.username}</p>
                <p className="truncate text-xs text-slate-500">{item.id}</p>
                <p className="text-xs">{item.email}</p>
                <p className="text-xs">KYC: {item.kycStatus ?? "-"}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Edit Informasi Profil</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Pastikan informasi profil valid untuk memperlancar transaksi.</p>
            <form onSubmit={updateProfile} className="mt-5 grid gap-3">
              <label className="grid gap-1 text-sm">
                Username
                <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Username" value={form.username} onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))} />
              </label>
              <label className="grid gap-1 text-sm">
                Nama lengkap
                <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Nama lengkap" value={form.fullName} onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))} />
              </label>
              <label className="grid gap-1 text-sm">
                Nomor telepon
                <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Nomor telepon" value={form.phoneNumber} onChange={(e) => setForm((prev) => ({ ...prev, phoneNumber: e.target.value }))} />
              </label>
              <label className="grid gap-1 text-sm">
                Bio singkat
                <textarea className="min-h-24 rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Bio singkat" value={form.bio} onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))} />
              </label>
              <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900" disabled={loading}>
                Simpan Profil
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Pengajuan KYC Jastiper</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Ajukan KYC jika Anda ingin menjalankan flow sebagai jastiper.</p>
            <form onSubmit={submitKyc} className="mt-5 grid gap-3">
              <label className="grid gap-1 text-sm">
                Nama lengkap sesuai identitas
                <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Nama lengkap sesuai identitas" value={kycForm.fullName} onChange={(e) => setKycForm((prev) => ({ ...prev, fullName: e.target.value }))} required />
              </label>
              <label className="grid gap-1 text-sm">
                URL dokumen identitas
                <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="URL dokumen identitas" value={kycForm.identityDocumentUrl} onChange={(e) => setKycForm((prev) => ({ ...prev, identityDocumentUrl: e.target.value }))} />
              </label>
              <label className="grid gap-1 text-sm">
                URL media sosial
                <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="URL media sosial" value={kycForm.socialMediaUrl} onChange={(e) => setKycForm((prev) => ({ ...prev, socialMediaUrl: e.target.value }))} />
              </label>
              <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700" disabled={loading}>
                Submit KYC
              </button>
            </form>
          </section>
        </div>
      </section>
    </main>
  );
}

