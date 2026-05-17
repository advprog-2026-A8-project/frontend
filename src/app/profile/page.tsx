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
    <main className="bg-[linear-gradient(165deg,#fff7ed_0%,#fefce8_35%,#dbeafe_100%)] dark:bg-[linear-gradient(165deg,#0b1220_0%,#111827_50%,#1f2937_100%)]">
      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-lg shadow-orange-100/60 dark:border-slate-700 dark:bg-slate-900/80 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">Akun Saya</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">Profil Pengguna JSON</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Kelola data profil pribadi dan pengajuan KYC untuk aktivasi peran jastiper.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
              <p className="text-xs uppercase tracking-wide text-orange-700">Role</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{role}</p>
            </div>
            <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
              <p className="text-xs uppercase tracking-wide text-orange-700">User ID</p>
              <p className="mt-1 truncate text-sm font-medium text-slate-900">{profile?.id ?? session.userId ?? "-"}</p>
            </div>
            <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
              <p className="text-xs uppercase tracking-wide text-orange-700">KYC Status</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{profile?.kycStatus ?? "-"}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            {isJastiper && (
              <Link href="/jastiper" className="rounded-md border border-slate-300 px-3 py-1.5 dark:border-slate-700">
                Buka Jastiper Center
              </Link>
            )}
            {isAdmin && (
              <Link href="/admin" className="rounded-md border border-slate-300 px-3 py-1.5 dark:border-slate-700">
                Buka Admin Center
              </Link>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Edit Informasi Profil</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Pastikan informasi profil valid untuk memperlancar transaksi.</p>
            <form onSubmit={updateProfile} className="mt-5 grid gap-3">
              <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Username" value={form.username} onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))} />
              <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Nama lengkap" value={form.fullName} onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))} />
              <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Nomor telepon" value={form.phoneNumber} onChange={(e) => setForm((prev) => ({ ...prev, phoneNumber: e.target.value }))} />
              <textarea className="min-h-24 rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Bio singkat" value={form.bio} onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))} />
              <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900" disabled={loading}>
                Simpan Profil
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Pengajuan KYC Jastiper</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Ajukan KYC jika Anda ingin menjalankan flow sebagai jastiper.</p>
            <form onSubmit={submitKyc} className="mt-5 grid gap-3">
              <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Nama lengkap sesuai identitas" value={kycForm.fullName} onChange={(e) => setKycForm((prev) => ({ ...prev, fullName: e.target.value }))} required />
              <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="URL dokumen identitas" value={kycForm.identityDocumentUrl} onChange={(e) => setKycForm((prev) => ({ ...prev, identityDocumentUrl: e.target.value }))} />
              <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="URL media sosial" value={kycForm.socialMediaUrl} onChange={(e) => setKycForm((prev) => ({ ...prev, socialMediaUrl: e.target.value }))} />
              <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700" disabled={loading}>
                Submit KYC
              </button>
            </form>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => run(loadMyProfile, "Profil berhasil dimuat.")} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-500 dark:border-slate-700 dark:text-slate-100">
              Muat Profil Saya
            </button>
            <button onClick={() => run(async () => { await gatewayRequest("auth", "api/profile/jastiper", { headers: { Authorization: auth } }); }, "Daftar jastiper berhasil dimuat.")} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-500 dark:border-slate-700 dark:text-slate-100">
              Lihat Daftar Jastiper
            </button>
          </div>
          {message && <p className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
          {error && <p className="mt-4 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        </section>
      </section>
    </main>
  );
}
