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
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ username: "", fullName: "", phoneNumber: "", bio: "" });
  const [kycForm, setKycForm] = useState({ fullName: "", identityDocumentUrl: "", socialMediaUrl: "" });
  const [adminForm, setAdminForm] = useState({ userId: "", decision: "APPROVED", status: "ACTIVE", delta: 1 });
  const auth = session.token ? `Bearer ${session.token}` : "";
  const role = session.role.toUpperCase();
  const isAdmin = role.includes("ADMIN");
  const isJastiper = role.includes("JASTIPER");
  const isAuthenticated = Boolean(session.token);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login?next=/profile");
    }
  }, [isAuthenticated, router]);

  async function run(action: () => Promise<unknown>, ok?: string) {
    setError("");
    setMessage("");
    try {
      const result = await action();
      setData(result);
      if (ok) setMessage(ok);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aksi profile gagal.");
    }
  }

  function saveSession() {
    writeSession(session);
    setMessage("Session berhasil disimpan.");
  }

  async function updateProfile(event: FormEvent) {
    event.preventDefault();
    await run(
      () =>
        gatewayRequest("auth", "api/profile/me", {
          method: "PUT",
          headers: { Authorization: auth },
          body: form,
        }),
      "Profil berhasil diperbarui."
    );
  }

  async function submitKyc(event: FormEvent) {
    event.preventDefault();
    await run(
      () =>
        gatewayRequest("auth", "api/profile/kyc/submit", {
          method: "POST",
          headers: { Authorization: auth },
          body: kycForm,
        }),
      "Pengajuan KYC berhasil dikirim."
    );
  }

  async function adminAction(path: string, body: unknown, ok: string) {
    await run(
      () =>
        gatewayRequest("auth", path, {
          method: "PUT",
          headers: { Authorization: auth },
          body,
        }),
      ok
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
            <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">Profil Pengguna JSON</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Kelola profil, ajukan KYC untuk jadi Jastiper, dan jalankan aksi admin jika role Anda ADMIN.
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

            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              {isJastiper && <Link href="/jastiper" className="rounded-md border border-slate-300 px-3 py-1.5 dark:border-slate-700">Buka Jastiper Center</Link>}
              {isAdmin && <Link href="/admin" className="rounded-md border border-slate-300 px-3 py-1.5 dark:border-slate-700">Buka Admin Center</Link>}
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

            <div className="mt-6 border-t border-slate-200 pt-5">
              <h3 className="text-lg font-semibold text-slate-900">Pengajuan KYC Jastiper</h3>
              <p className="mt-1 text-sm text-slate-600">Ajukan verifikasi supaya akun bisa menjadi JASTIPER.</p>
              <form onSubmit={submitKyc} className="mt-4 grid gap-3 sm:grid-cols-2">
                <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Nama lengkap sesuai identitas" value={kycForm.fullName} onChange={(e) => setKycForm((p) => ({ ...p, fullName: e.target.value }))} required />
                <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="URL dokumen identitas" value={kycForm.identityDocumentUrl} onChange={(e) => setKycForm((p) => ({ ...p, identityDocumentUrl: e.target.value }))} />
                <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm sm:col-span-2" placeholder="URL media sosial" value={kycForm.socialMediaUrl} onChange={(e) => setKycForm((p) => ({ ...p, socialMediaUrl: e.target.value }))} />
                <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold sm:col-span-2">
                  Submit KYC
                </button>
              </form>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Keamanan & Session</h2>
            <p className="mt-1 text-sm text-slate-600">Sinkronkan token dan identitas pengguna.</p>

            <div className="mt-4 grid gap-2">
              <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="User ID (UUID)" value={session.userId} onChange={(e) => setSession((p) => ({ ...p, userId: e.target.value }))} />
              <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Role" value={session.role} onChange={(e) => setSession((p) => ({ ...p, role: e.target.value }))} />
              <textarea className="min-h-24 rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="JWT token" value={session.token} onChange={(e) => setSession((p) => ({ ...p, token: e.target.value }))} />
            </div>
            <button onClick={saveSession} className="mt-3 w-full rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600">
              Simpan Session
            </button>
          </section>
        </div>

        {isAdmin && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Admin Controls</h2>
            <p className="mt-1 text-sm text-slate-600">Role, status akun, KYC decision, dan statistik Jastiper.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <input className="rounded-lg border border-slate-300 p-2 text-sm" placeholder="Target User ID" value={adminForm.userId} onChange={(e) => setAdminForm((p) => ({ ...p, userId: e.target.value }))} />
              <input className="rounded-lg border border-slate-300 p-2 text-sm" placeholder="Decision APPROVED/REJECTED" value={adminForm.decision} onChange={(e) => setAdminForm((p) => ({ ...p, decision: e.target.value }))} />
              <input className="rounded-lg border border-slate-300 p-2 text-sm" placeholder="Status ACTIVE/BANNED/PENDING" value={adminForm.status} onChange={(e) => setAdminForm((p) => ({ ...p, status: e.target.value }))} />
              <input className="rounded-lg border border-slate-300 p-2 text-sm" type="number" placeholder="Delta" value={adminForm.delta} onChange={(e) => setAdminForm((p) => ({ ...p, delta: Number(e.target.value) }))} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => adminAction("api/profile/admin/role/upgrade", { userId: adminForm.userId }, "Upgrade role berhasil.")} className="rounded-md border border-slate-300 px-3 py-2 text-sm">Upgrade</button>
              <button onClick={() => adminAction("api/profile/admin/role/demote", { userId: adminForm.userId }, "Demote role berhasil.")} className="rounded-md border border-slate-300 px-3 py-2 text-sm">Demote</button>
              <button onClick={() => adminAction("api/profile/admin/kyc/decision", { userId: adminForm.userId, decision: adminForm.decision }, "KYC decision berhasil.")} className="rounded-md border border-slate-300 px-3 py-2 text-sm">KYC Decision</button>
              <button onClick={() => adminAction("api/profile/admin/status", { userId: adminForm.userId, status: adminForm.status }, "Status update berhasil.")} className="rounded-md border border-slate-300 px-3 py-2 text-sm">Set Status</button>
              <button onClick={() => adminAction("api/profile/admin/jastiper/stats", { userId: adminForm.userId, delta: adminForm.delta }, "Stats update berhasil.")} className="rounded-md border border-slate-300 px-3 py-2 text-sm">Set Stats</button>
            </div>
          </section>
        )}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Aktivitas Akun</h2>
          <p className="mt-1 text-sm text-slate-600">Ambil data profil dan daftar jastiper langsung dari backend authentication.</p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button onClick={() => run(() => gatewayRequest("auth", "api/profile/me", { headers: { Authorization: auth } }), "Profil berhasil dimuat.")} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-500">
              Muat Profil Saya
            </button>
            <button onClick={() => run(() => gatewayRequest("auth", "api/profile/jastiper", { headers: { Authorization: auth } }), "Daftar jastiper berhasil dimuat.")} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-500">
              Lihat Daftar Jastiper
            </button>
          </div>

          {message && <p className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
          {error && <p className="mt-4 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          {data !== null && <pre className="mt-4 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(data, null, 2)}</pre>}
        </section>
      </section>
    </main>
  );
}
