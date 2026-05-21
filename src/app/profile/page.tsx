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

type KycFormData = {
  fullName: string;
  identityDocumentUrl: string;
  socialMediaUrl: string;
};

type KycErrors = Partial<Record<keyof KycFormData, string>>;

function unwrapData<T>(payload: T | ApiEnvelope<T>): T {
  if (payload && typeof payload === "object" && "data" in (payload as Record<string, unknown>)) {
    const envelope = payload as ApiEnvelope<T>;
    return (envelope.data ?? ({} as T)) as T;
  }
  return payload as T;
}

function labelAccountStatus(value?: string | null) {
  const status = (value ?? "").toUpperCase();
  if (status === "ACTIVE") return "Akun aktif";
  if (status === "SUSPENDED") return "Akun ditangguhkan";
  if (status === "BANNED") return "Akun diblokir";
  return "Belum tersedia";
}

function labelKycStatus(value?: string | null) {
  const status = (value ?? "").toUpperCase();
  if (status === "APPROVED") return "Terverifikasi";
  if (status === "PENDING") return "Sedang ditinjau";
  if (status === "REJECTED") return "Perlu perbaikan data";
  if (status === "NOT_SUBMITTED") return "Belum ajukan verifikasi";
  return "Belum tersedia";
}

function isValidUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function validateKycForm(form: KycFormData): KycErrors {
  const errors: KycErrors = {};
  if (!form.fullName.trim() || form.fullName.trim().length < 3) {
    errors.fullName = "Nama lengkap minimal 3 karakter.";
  }
  if (!form.identityDocumentUrl.trim()) {
    errors.identityDocumentUrl = "URL dokumen identitas wajib diisi.";
  } else if (!isValidUrl(form.identityDocumentUrl.trim())) {
    errors.identityDocumentUrl = "Format URL dokumen identitas tidak valid.";
  }
  if (form.socialMediaUrl.trim() && !isValidUrl(form.socialMediaUrl.trim())) {
    errors.socialMediaUrl = "Format URL media sosial tidak valid.";
  }
  return errors;
}

export default function ProfilePage() {
  const router = useRouter();
  const session = useMemo(() => readSession(), []);
  const auth = session.token ? `Bearer ${session.token}` : "";
  const isAuthenticated = Boolean(session.token);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [jastiperDirectory, setJastiperDirectory] = useState<ProfileData[]>([]);
  const [lookupResult, setLookupResult] = useState<ProfileData | null>(null);
  const [lookupForm, setLookupForm] = useState({ username: "", email: "" });
  const [directoryPage, setDirectoryPage] = useState(1);
  const [directoryPageSize, setDirectoryPageSize] = useState(6);

  const [form, setForm] = useState({ username: "", fullName: "", phoneNumber: "", bio: "" });
  const [kycForm, setKycForm] = useState<KycFormData>({ fullName: "", identityDocumentUrl: "", socialMediaUrl: "" });
  const [kycErrors, setKycErrors] = useState<KycErrors>({});
  const [showKycSuccess, setShowKycSuccess] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const role = (profile?.role ?? session.role ?? "TITIPER").toUpperCase();
  const isAdmin = role.includes("ADMIN");
  const isJastiper = role.includes("JASTIPER");
  const showKycForm = !isAdmin && !isJastiper;

  const directoryTotalPages = Math.max(1, Math.ceil(jastiperDirectory.length / directoryPageSize));
  const pagedDirectory = useMemo(() => {
    const start = (directoryPage - 1) * directoryPageSize;
    return jastiperDirectory.slice(start, start + directoryPageSize);
  }, [directoryPage, directoryPageSize, jastiperDirectory]);

  useEffect(() => {
    if (!isAuthenticated) router.replace("/login?next=/profile");
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (directoryPage > directoryTotalPages) setDirectoryPage(directoryTotalPages);
  }, [directoryPage, directoryTotalPages]);

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

  async function loadJastiperDirectory() {
    const payload = await gatewayRequest<ApiEnvelope<ProfileData[]>>("auth", "api/profile/jastiper", {
      headers: { Authorization: auth },
    });
    setJastiperDirectory(unwrapData<ProfileData[]>(payload));
    setDirectoryPage(1);
  }

  async function syncProfileAndDirectory() {
    await Promise.all([loadMyProfile(), loadJastiperDirectory()]);
  }

  async function updateProfile(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      await gatewayRequest("auth", "api/profile/me", {
        method: "PUT",
        headers: { Authorization: auth },
        body: form,
      });
      await syncProfileAndDirectory();
    }, "Profil berhasil diperbarui.");
  }

  async function submitKyc(event: FormEvent) {
    event.preventDefault();
    const errors = validateKycForm(kycForm);
    setKycErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError("Periksa kembali data KYC sebelum dikirim.");
      return;
    }

    await run(async () => {
      await gatewayRequest("auth", "api/profile/kyc/submit", {
        method: "POST",
        headers: { Authorization: auth },
        body: {
          fullName: kycForm.fullName.trim(),
          identityDocumentUrl: kycForm.identityDocumentUrl.trim(),
          socialMediaUrl: kycForm.socialMediaUrl.trim(),
        },
      });
      await syncProfileAndDirectory();
      setShowKycSuccess(true);
    }, "Pengajuan verifikasi berhasil dikirim.");
  }

  async function lookupProfile(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (lookupForm.username.trim()) params.set("username", lookupForm.username.trim());
    if (lookupForm.email.trim()) params.set("email", lookupForm.email.trim());
    if (params.size === 0) {
      setError("Isi username atau email untuk mencari profil.");
      return;
    }
    await run(async () => {
      const payload = await gatewayRequest<ApiEnvelope<ProfileData>>("auth", `api/profile/lookup?${params.toString()}`, {
        headers: { Authorization: auth },
      });
      setLookupResult(unwrapData<ProfileData>(payload));
    }, "Profil berhasil ditemukan.");
  }

  useEffect(() => {
    if (isAuthenticated) {
      void run(syncProfileAndDirectory);
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
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">Profil Pengguna</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Kelola data akun, ajukan verifikasi jastiper, dan temukan profil jastiper lain dengan lebih mudah.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {isJastiper && (
              <Link href="/jastiper" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700">
                Pusat Jastiper
              </Link>
            )}
            {isAdmin && (
              <Link href="/admin" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700">
                Pusat Admin
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
              <p className="mt-1 text-lg font-semibold text-slate-900">{labelAccountStatus(profile?.accountStatus)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-700">Status Verifikasi</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{labelKycStatus(profile?.kycStatus)}</p>
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
              <p className="text-xs uppercase tracking-wide text-slate-700 dark:text-slate-300">Username</p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{profile?.username ?? "-"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
              <p className="text-xs uppercase tracking-wide text-slate-700 dark:text-slate-300">Email</p>
              <p className="mt-1 truncate text-sm text-slate-900 dark:text-slate-100">{profile?.email ?? "-"}</p>
            </div>
          </div>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Direktori Jastiper</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Bagian ini membantu titiper melihat jastiper aktif beserta profil singkatnya.
          </p>

          <form onSubmit={lookupProfile} className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              placeholder="Cari username"
              value={lookupForm.username}
              onChange={(e) => setLookupForm((prev) => ({ ...prev, username: e.target.value }))}
            />
            <input
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              placeholder="Cari email"
              value={lookupForm.email}
              onChange={(e) => setLookupForm((prev) => ({ ...prev, email: e.target.value }))}
            />
            <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700" disabled={loading}>
              Cari
            </button>
          </form>

          {lookupResult && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-950/50">
              <p className="font-semibold">{lookupResult.username}</p>
              <p className="text-xs">{lookupResult.email}</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Verifikasi: {labelKycStatus(lookupResult.kycStatus)}</p>
            </div>
          )}

          {jastiperDirectory.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700">
              Belum ada data jastiper yang bisa ditampilkan.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Menampilkan {(directoryPage - 1) * directoryPageSize + 1}-{Math.min(directoryPage * directoryPageSize, jastiperDirectory.length)} dari {jastiperDirectory.length} profil.
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <label className="font-semibold">Per halaman</label>
                  <select
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
                    value={directoryPageSize}
                    onChange={(e) => {
                      setDirectoryPageSize(Number(e.target.value));
                      setDirectoryPage(1);
                    }}
                  >
                    <option value={6}>6</option>
                    <option value={9}>9</option>
                    <option value={12}>12</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {pagedDirectory.map((item) => (
                  <article key={item.id} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
                    <p className="font-semibold">{item.username}</p>
                    <p className="text-xs text-slate-500">{item.email}</p>
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">Nama: {item.fullName || "Belum diisi"}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">No. HP: {item.phoneNumber || "Belum diisi"}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">Bio: {item.bio || "Belum diisi"}</p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Verifikasi: {labelKycStatus(item.kycStatus)}</p>
                  </article>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDirectoryPage((prev) => Math.max(1, prev - 1))}
                  disabled={directoryPage <= 1}
                  className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold disabled:opacity-50 dark:border-slate-700"
                >
                  Sebelumnya
                </button>
                <span className="text-xs text-slate-600 dark:text-slate-300">Halaman {directoryPage} / {directoryTotalPages}</span>
                <button
                  type="button"
                  onClick={() => setDirectoryPage((prev) => Math.min(directoryTotalPages, prev + 1))}
                  disabled={directoryPage >= directoryTotalPages}
                  className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold disabled:opacity-50 dark:border-slate-700"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          )}
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Edit Informasi Profil</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Lengkapi data supaya calon pembeli/penitip lebih percaya.</p>
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

          {showKycForm && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Pengajuan Verifikasi Jastiper</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Pastikan data lengkap agar proses verifikasi lebih cepat.</p>
              <form onSubmit={submitKyc} className="mt-5 grid gap-3">
                <label className="grid gap-1 text-sm">
                  Nama lengkap sesuai identitas
                  <input
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    placeholder="Nama lengkap sesuai identitas"
                    value={kycForm.fullName}
                    onChange={(e) => {
                      setKycForm((prev) => ({ ...prev, fullName: e.target.value }));
                      setKycErrors((prev) => ({ ...prev, fullName: undefined }));
                    }}
                    required
                  />
                  {kycErrors.fullName && <span className="text-xs text-red-600">{kycErrors.fullName}</span>}
                </label>
                <label className="grid gap-1 text-sm">
                  URL dokumen identitas
                  <input
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    placeholder="https://..."
                    value={kycForm.identityDocumentUrl}
                    onChange={(e) => {
                      setKycForm((prev) => ({ ...prev, identityDocumentUrl: e.target.value }));
                      setKycErrors((prev) => ({ ...prev, identityDocumentUrl: undefined }));
                    }}
                  />
                  {kycErrors.identityDocumentUrl && <span className="text-xs text-red-600">{kycErrors.identityDocumentUrl}</span>}
                </label>
                <label className="grid gap-1 text-sm">
                  URL media sosial (opsional)
                  <input
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    placeholder="https://..."
                    value={kycForm.socialMediaUrl}
                    onChange={(e) => {
                      setKycForm((prev) => ({ ...prev, socialMediaUrl: e.target.value }));
                      setKycErrors((prev) => ({ ...prev, socialMediaUrl: undefined }));
                    }}
                  />
                  {kycErrors.socialMediaUrl && <span className="text-xs text-red-600">{kycErrors.socialMediaUrl}</span>}
                </label>
                <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700" disabled={loading}>
                  Kirim Pengajuan
                </button>
              </form>
            </section>
          )}
        </div>

        {showKycSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">Pengajuan berhasil dikirim</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Data verifikasi Anda sudah diterima dan sedang menunggu peninjauan admin.
              </p>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowKycSuccess(false)}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
