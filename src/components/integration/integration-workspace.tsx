"use client";

import { FormEvent, ReactNode, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { gatewayRequest } from "@/lib/gateway-api";
import { orderApi } from "@/lib/order-api";
import { readSession, writeSession } from "@/lib/client-session";
import { SessionState, WalletResponse, WalletTransaction } from "@/types/integration";

const defaultSession: SessionState = { token: "", userId: "", role: "TITIPER" };
type Tab = "auth" | "profile" | "inventory" | "voucher" | "wallet" | "order";

function bearer(token: string) {
  const t = token.trim();
  return t ? `Bearer ${t}` : "";
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-base font-semibold">{title}</h3>
      {subtitle && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </article>
  );
}

function JsonPane({ data, title }: { data: unknown; title: string }) {
  if (data === null) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-950 p-3 dark:border-slate-700">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">{title}</p>
      <pre className="max-h-96 overflow-auto text-xs text-slate-100">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

export function IntegrationWorkspace() {
  const [tab, setTab] = useState<Tab>("auth");
  const [session, setSession] = useState<SessionState>(() => {
    const local = readSession();
    return local.token || local.userId ? local : defaultSession;
  });
  const auth = useMemo(() => bearer(session.token), [session.token]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [payload, setPayload] = useState<unknown>(null);

  const [registerForm, setRegisterForm] = useState({ username: "", email: "", password: "" });
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });

  const [lookupForm, setLookupForm] = useState({ id: "", username: "", email: "", bulk: "" });
  const [profileForm, setProfileForm] = useState({ username: "", fullName: "", phoneNumber: "", bio: "" });
  const [kycForm, setKycForm] = useState({ fullName: "", identityDocumentUrl: "", socialMediaUrl: "" });
  const [adminProfile, setAdminProfile] = useState({ userId: "", decision: "APPROVED", status: "ACTIVE", delta: 1 });

  const [productForm, setProductForm] = useState({
    id: "",
    name: "",
    description: "",
    price: 0,
    stock: 1,
    originCountry: "",
    purchaseDate: "",
    search: "",
  });

  const [voucherForm, setVoucherForm] = useState({
    code: "",
    quota: 1,
    discountValue: 10,
    minPurchase: 0,
    discountType: "PERCENTAGE",
    expiryDate: "",
    termsAndConditions: "",
    amount: 0,
    additionalQuota: 0,
    isActive: true,
    newExpiry: "",
  });

  const [walletForm, setWalletForm] = useState({
    amount: 10000,
    description: "manual action",
    roleHeader: "JASTIPER",
    historyStatus: "",
    orderId: "",
    idempotencyKey: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "wallet-contract-idem-1",
  });

  const [orderForm, setOrderForm] = useState({
    productId: "",
    userId: "",
    jastiperId: "",
    jumlah: 1,
    alamatPengiriman: "",
    voucherCode: "",
    idempotencyKey: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "idem-1",
    status: "PAID",
    page: 0,
    size: 10,
    sortBy: "id",
    direction: "asc",
  });

  async function run<T>(request: () => Promise<T>, ok: string) {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const result = await request();
      setPayload(result as unknown);
      setMessage(ok);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  const invHeaders = { "X-User-Id": session.userId, "X-User-Role": session.role };

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-2xl font-bold">Integration Workspace</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            UX final per modul untuk validasi auth/profile, inventory, voucher, wallet, dan order.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Session Context</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <input className="rounded-md border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="JWT token (tanpa Bearer)" value={session.token} onChange={(e) => setSession((p) => ({ ...p, token: e.target.value }))} />
            <input className="rounded-md border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="User ID UUID" value={session.userId} onChange={(e) => setSession((p) => ({ ...p, userId: e.target.value }))} />
            <input className="rounded-md border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Role TITIPER/JASTIPER/ADMIN" value={session.role} onChange={(e) => setSession((p) => ({ ...p, role: e.target.value }))} />
          </div>
          <div className="mt-3">
            <Button type="button" variant="outline" onClick={() => writeSession(session)}>
              Simpan ke Local Session
            </Button>
          </div>
        </section>

        <section className="flex flex-wrap gap-2">
          {(["auth", "profile", "inventory", "voucher", "wallet", "order"] as Tab[]).map((key) => (
            <Button key={key} variant={tab === key ? "default" : "outline"} onClick={() => setTab(key)}>
              {key.toUpperCase()}
            </Button>
          ))}
        </section>

        {tab === "auth" && (
          <section className="grid gap-4 lg:grid-cols-2">
            <Card title="Register">
              <form className="grid gap-2" onSubmit={(e) => {
                e.preventDefault();
                run(() => gatewayRequest("auth", "api/auth/register", { method: "POST", body: registerForm }), "Register berhasil.");
              }}>
                <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="Username" value={registerForm.username} onChange={(e) => setRegisterForm((p) => ({ ...p, username: e.target.value }))} required />
                <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="Email" value={registerForm.email} onChange={(e) => setRegisterForm((p) => ({ ...p, email: e.target.value }))} required />
                <input className="rounded border p-2 text-sm dark:bg-slate-950" type="password" placeholder="Password" value={registerForm.password} onChange={(e) => setRegisterForm((p) => ({ ...p, password: e.target.value }))} required />
                <Button type="submit" disabled={loading}>Register</Button>
              </form>
            </Card>
            <Card title="Login + Verify">
              <form className="grid gap-2" onSubmit={(e) => {
                e.preventDefault();
                run(async () => {
                  const resp = await gatewayRequest<{ data?: { token?: string } }>("auth", "api/auth/login", { method: "POST", body: loginForm });
                  const token = resp?.data?.token ?? (resp as { token?: string })?.token ?? "";
                  setSession((p) => ({ ...p, token }));
                  return resp;
                }, "Login berhasil.");
              }}>
                <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="Email" value={loginForm.email} onChange={(e) => setLoginForm((p) => ({ ...p, email: e.target.value }))} required />
                <input className="rounded border p-2 text-sm dark:bg-slate-950" type="password" placeholder="Password" value={loginForm.password} onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))} required />
                <div className="flex gap-2">
                  <Button type="submit" disabled={loading}>Login</Button>
                  <Button type="button" variant="outline" disabled={loading} onClick={() => run(() => gatewayRequest("auth", "api/auth/verify", { headers: { Authorization: auth } }), "Verify sukses.")}>Verify</Button>
                </div>
              </form>
            </Card>
          </section>
        )}

        {tab === "profile" && (
          <section className="grid gap-4 lg:grid-cols-2">
            <Card title="Lookup & Read">
              <div className="grid gap-2">
                <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="Lookup ID" value={lookupForm.id} onChange={(e) => setLookupForm((p) => ({ ...p, id: e.target.value }))} />
                <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="Lookup Username" value={lookupForm.username} onChange={(e) => setLookupForm((p) => ({ ...p, username: e.target.value }))} />
                <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="Lookup Email" value={lookupForm.email} onChange={(e) => setLookupForm((p) => ({ ...p, email: e.target.value }))} />
                <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="Bulk IDs (comma separated)" value={lookupForm.bulk} onChange={(e) => setLookupForm((p) => ({ ...p, bulk: e.target.value }))} />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" disabled={loading} onClick={() => {
                    const q = new URLSearchParams();
                    if (lookupForm.id) q.set("id", lookupForm.id);
                    if (lookupForm.username) q.set("username", lookupForm.username);
                    if (lookupForm.email) q.set("email", lookupForm.email);
                    run(() => gatewayRequest("auth", `api/profile/lookup?${q.toString()}`), "Lookup berhasil.");
                  }}>Lookup</Button>
                  <Button type="button" variant="outline" disabled={loading} onClick={() => run(() => gatewayRequest("auth", "api/profile/lookup/bulk", { method: "POST", body: { userIds: lookupForm.bulk.split(",").map((x) => x.trim()).filter(Boolean) } }), "Bulk lookup berhasil.")}>Bulk</Button>
                  <Button type="button" variant="outline" disabled={loading} onClick={() => run(() => gatewayRequest("auth", "api/profile/me", { headers: { Authorization: auth } }), "My profile berhasil.")}>Me</Button>
                  <Button type="button" variant="outline" disabled={loading} onClick={() => run(() => gatewayRequest("auth", "api/profile/jastiper", { headers: { Authorization: auth } }), "Jastiper list berhasil.")}>Jastiper</Button>
                  <Button type="button" variant="outline" disabled={loading} onClick={() => run(() => gatewayRequest("auth", "api/profile/admin/users", { headers: { Authorization: auth } }), "Admin users berhasil.")}>Admin Users</Button>
                </div>
              </div>
            </Card>
            <Card title="Update, KYC, Admin">
              <form className="grid gap-2" onSubmit={(e) => {
                e.preventDefault();
                run(() => gatewayRequest("auth", "api/profile/me", { method: "PUT", body: profileForm, headers: { Authorization: auth } }), "Update profile berhasil.");
              }}>
                <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="Username" value={profileForm.username} onChange={(e) => setProfileForm((p) => ({ ...p, username: e.target.value }))} />
                <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="Full Name" value={profileForm.fullName} onChange={(e) => setProfileForm((p) => ({ ...p, fullName: e.target.value }))} />
                <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="Phone" value={profileForm.phoneNumber} onChange={(e) => setProfileForm((p) => ({ ...p, phoneNumber: e.target.value }))} />
                <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="Bio" value={profileForm.bio} onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))} />
                <Button type="submit" disabled={loading}>Update My Profile</Button>
              </form>
              <form className="mt-3 grid gap-2" onSubmit={(e) => {
                e.preventDefault();
                run(() => gatewayRequest("auth", "api/profile/kyc/submit", { method: "POST", body: kycForm, headers: { Authorization: auth } }), "KYC submit berhasil.");
              }}>
                <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="KYC Full Name" value={kycForm.fullName} onChange={(e) => setKycForm((p) => ({ ...p, fullName: e.target.value }))} />
                <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="Identity URL" value={kycForm.identityDocumentUrl} onChange={(e) => setKycForm((p) => ({ ...p, identityDocumentUrl: e.target.value }))} />
                <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="Social URL" value={kycForm.socialMediaUrl} onChange={(e) => setKycForm((p) => ({ ...p, socialMediaUrl: e.target.value }))} />
                <Button type="submit" disabled={loading}>Submit KYC</Button>
              </form>
              <div className="mt-3 grid gap-2">
                <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="Target User ID" value={adminProfile.userId} onChange={(e) => setAdminProfile((p) => ({ ...p, userId: e.target.value }))} />
                <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="Decision APPROVED/REJECTED" value={adminProfile.decision} onChange={(e) => setAdminProfile((p) => ({ ...p, decision: e.target.value }))} />
                <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="Status ACTIVE/BANNED/PENDING" value={adminProfile.status} onChange={(e) => setAdminProfile((p) => ({ ...p, status: e.target.value }))} />
                <input className="rounded border p-2 text-sm dark:bg-slate-950" type="number" placeholder="Delta" value={adminProfile.delta} onChange={(e) => setAdminProfile((p) => ({ ...p, delta: Number(e.target.value) }))} />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" disabled={loading} onClick={() => run(() => gatewayRequest("auth", "api/profile/admin/role/upgrade", { method: "PUT", headers: { Authorization: auth }, body: { userId: adminProfile.userId } }), "Upgrade role berhasil.")}>Upgrade</Button>
                  <Button type="button" variant="outline" disabled={loading} onClick={() => run(() => gatewayRequest("auth", "api/profile/admin/role/demote", { method: "PUT", headers: { Authorization: auth }, body: { userId: adminProfile.userId } }), "Demote role berhasil.")}>Demote</Button>
                  <Button type="button" variant="outline" disabled={loading} onClick={() => run(() => gatewayRequest("auth", "api/profile/admin/kyc/decision", { method: "PUT", headers: { Authorization: auth }, body: { userId: adminProfile.userId, decision: adminProfile.decision } }), "KYC decision berhasil.")}>KYC Decision</Button>
                  <Button type="button" variant="outline" disabled={loading} onClick={() => run(() => gatewayRequest("auth", "api/profile/admin/status", { method: "PUT", headers: { Authorization: auth }, body: { userId: adminProfile.userId, status: adminProfile.status } }), "Status update berhasil.")}>Set Status</Button>
                  <Button type="button" variant="outline" disabled={loading} onClick={() => run(() => gatewayRequest("auth", "api/profile/admin/jastiper/stats", { method: "PUT", headers: { Authorization: auth }, body: { userId: adminProfile.userId, delta: adminProfile.delta } }), "Stats update berhasil.")}>Set Stats</Button>
                </div>
              </div>
            </Card>
          </section>
        )}

        {tab === "inventory" && (
          <section className="grid gap-4 lg:grid-cols-2">
            <Card title="Mutate Product">
              <form className="grid gap-2" onSubmit={(e) => {
                e.preventDefault();
                run(() => gatewayRequest("inventory", "api/products/create", { method: "POST", body: {
                  name: productForm.name, description: productForm.description, price: productForm.price, stock: productForm.stock, originCountry: productForm.originCountry, purchaseDate: productForm.purchaseDate
                }, headers: invHeaders }), "Create product berhasil.");
              }}>
                <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="Product ID (update/delete)" value={productForm.id} onChange={(e) => setProductForm((p) => ({ ...p, id: e.target.value }))} />
                <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="Name" value={productForm.name} onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))} />
                <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="Description" value={productForm.description} onChange={(e) => setProductForm((p) => ({ ...p, description: e.target.value }))} />
                <input className="rounded border p-2 text-sm dark:bg-slate-950" type="number" placeholder="Price" value={productForm.price} onChange={(e) => setProductForm((p) => ({ ...p, price: Number(e.target.value) }))} />
                <input className="rounded border p-2 text-sm dark:bg-slate-950" type="number" placeholder="Stock" value={productForm.stock} onChange={(e) => setProductForm((p) => ({ ...p, stock: Number(e.target.value) }))} />
                <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="Origin Country" value={productForm.originCountry} onChange={(e) => setProductForm((p) => ({ ...p, originCountry: e.target.value }))} />
                <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="Purchase Date" value={productForm.purchaseDate} onChange={(e) => setProductForm((p) => ({ ...p, purchaseDate: e.target.value }))} />
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={loading}>Create</Button>
                  <Button type="button" variant="outline" disabled={loading} onClick={() => run(() => gatewayRequest("inventory", `api/products/update/${productForm.id}`, { method: "PUT", body: {
                    name: productForm.name, description: productForm.description, price: productForm.price, stock: productForm.stock, originCountry: productForm.originCountry, purchaseDate: productForm.purchaseDate
                  }, headers: invHeaders }), "Update product berhasil.")}>Update</Button>
                  <Button type="button" variant="outline" disabled={loading} onClick={() => run(() => gatewayRequest("inventory", `api/products/delete/${productForm.id}`, { method: "DELETE", headers: invHeaders }), "Delete product berhasil.")}>Delete</Button>
                </div>
              </form>
            </Card>
            <Card title="Query Product">
              <div className="grid gap-2">
                <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="Product ID" value={productForm.id} onChange={(e) => setProductForm((p) => ({ ...p, id: e.target.value }))} />
                <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="Search name" value={productForm.search} onChange={(e) => setProductForm((p) => ({ ...p, search: e.target.value }))} />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" disabled={loading} onClick={() => run(() => gatewayRequest("inventory", "api/products/list"), "List product berhasil.")}>List</Button>
                  <Button type="button" variant="outline" disabled={loading} onClick={() => run(() => gatewayRequest("inventory", `api/products/${productForm.id}`), "Get product berhasil.")}>Get by ID</Button>
                  <Button type="button" variant="outline" disabled={loading} onClick={() => run(() => gatewayRequest("inventory", `api/products/search?name=${encodeURIComponent(productForm.search)}`), "Search product berhasil.")}>Search</Button>
                  <Button type="button" variant="outline" disabled={loading} onClick={() => run(() => gatewayRequest("inventory", "api/products/my-catalog", { headers: invHeaders }), "My catalog berhasil.")}>My Catalog</Button>
                  <Button type="button" variant="outline" disabled={loading} onClick={() => run(() => gatewayRequest("inventory", `api/products/jastiper/${session.userId}`), "Produk jastiper berhasil dimuat.")}>By Jastiper</Button>
                </div>
              </div>
            </Card>
          </section>
        )}

        {tab === "voucher" && (
          <section className="grid gap-4 lg:grid-cols-2">
            <Card title="Voucher Public">
              <div className="grid gap-2">
                <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="Voucher code" value={voucherForm.code} onChange={(e) => setVoucherForm((p) => ({ ...p, code: e.target.value }))} />
                <input className="rounded border p-2 text-sm dark:bg-slate-950" type="number" placeholder="Amount" value={voucherForm.amount} onChange={(e) => setVoucherForm((p) => ({ ...p, amount: Number(e.target.value) }))} />
                <div className="flex gap-2">
                  <Button type="button" disabled={loading} onClick={() => run(() => gatewayRequest("voucher", "api/vouchers/available"), "Available voucher berhasil.")}>Available</Button>
                  <Button type="button" variant="outline" disabled={loading} onClick={() => run(() => gatewayRequest("voucher", "api/vouchers/validate", { method: "POST", body: { code: voucherForm.code, amount: voucherForm.amount } }), "Validate voucher berhasil.")}>Validate</Button>
                  <Button type="button" variant="outline" disabled={loading} onClick={() => run(() => gatewayRequest("voucher", "api/vouchers/use", { method: "POST", body: { code: voucherForm.code } }), "Use voucher berhasil.")}>Use</Button>
                </div>
              </div>
            </Card>
            <Card title="Voucher Admin">
              <div className="grid gap-2">
                <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="Code" value={voucherForm.code} onChange={(e) => setVoucherForm((p) => ({ ...p, code: e.target.value }))} />
                <input className="rounded border p-2 text-sm dark:bg-slate-950" type="number" placeholder="Quota" value={voucherForm.quota} onChange={(e) => setVoucherForm((p) => ({ ...p, quota: Number(e.target.value) }))} />
                <input className="rounded border p-2 text-sm dark:bg-slate-950" type="number" placeholder="Discount Value" value={voucherForm.discountValue} onChange={(e) => setVoucherForm((p) => ({ ...p, discountValue: Number(e.target.value) }))} />
                <input className="rounded border p-2 text-sm dark:bg-slate-950" type="number" placeholder="Min Purchase" value={voucherForm.minPurchase} onChange={(e) => setVoucherForm((p) => ({ ...p, minPurchase: Number(e.target.value) }))} />
                <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="Discount Type" value={voucherForm.discountType} onChange={(e) => setVoucherForm((p) => ({ ...p, discountType: e.target.value }))} />
                <input className="rounded border p-2 text-sm dark:bg-slate-950" type="datetime-local" placeholder="Expiry" value={voucherForm.expiryDate} onChange={(e) => setVoucherForm((p) => ({ ...p, expiryDate: e.target.value }))} />
                <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="Terms" value={voucherForm.termsAndConditions} onChange={(e) => setVoucherForm((p) => ({ ...p, termsAndConditions: e.target.value }))} />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" disabled={loading} onClick={() => run(() => gatewayRequest("voucher", "api/vouchers/admin/create", { method: "POST", body: {
                    code: voucherForm.code, quota: voucherForm.quota, discountValue: voucherForm.discountValue, minPurchase: voucherForm.minPurchase, discountType: voucherForm.discountType, expiryDate: voucherForm.expiryDate, termsAndConditions: voucherForm.termsAndConditions
                  } }), "Create voucher berhasil.")}>Create</Button>
                  <Button type="button" variant="outline" disabled={loading} onClick={() => run(() => gatewayRequest("voucher", "api/vouchers/admin/list"), "Admin list voucher berhasil.")}>List</Button>
                  <Button type="button" variant="outline" disabled={loading} onClick={() => run(() => gatewayRequest("voucher", `api/vouchers/admin/update/${voucherForm.code}`, { method: "PATCH", body: {
                    additionalQuota: voucherForm.additionalQuota, isActive: voucherForm.isActive, newExpiry: voucherForm.newExpiry || undefined
                  } }), "Update voucher berhasil.")}>Update</Button>
                </div>
              </div>
            </Card>
          </section>
        )}

        {tab === "wallet" && (
          <section className="grid gap-4 lg:grid-cols-2">
            <Card title="Wallet Operations">
              <div className="grid gap-2">
                <input className="rounded border p-2 text-sm dark:bg-slate-950" type="number" placeholder="Amount" value={walletForm.amount} onChange={(e) => setWalletForm((p) => ({ ...p, amount: Number(e.target.value) }))} />
                <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="Description" value={walletForm.description} onChange={(e) => setWalletForm((p) => ({ ...p, description: e.target.value }))} />
                <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="X-Role for withdraw" value={walletForm.roleHeader} onChange={(e) => setWalletForm((p) => ({ ...p, roleHeader: e.target.value }))} />
                <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="History status (optional)" value={walletForm.historyStatus} onChange={(e) => setWalletForm((p) => ({ ...p, historyStatus: e.target.value }))} />
                <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="Contract Order ID (UUID order)" value={walletForm.orderId} onChange={(e) => setWalletForm((p) => ({ ...p, orderId: e.target.value }))} />
                <input className="rounded border p-2 font-mono text-sm dark:bg-slate-950" placeholder="Contract Idempotency Key" value={walletForm.idempotencyKey} onChange={(e) => setWalletForm((p) => ({ ...p, idempotencyKey: e.target.value }))} />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" disabled={loading} onClick={() => run(() => gatewayRequest<WalletResponse>("wallet", `wallet/${session.userId}`, { headers: { Authorization: auth } }), "Get wallet berhasil.")}>Get</Button>
                  <Button type="button" variant="outline" disabled={loading} onClick={() => run(() => gatewayRequest("wallet", `wallet?userId=${session.userId}`, { method: "POST", headers: { Authorization: auth } }), "Create wallet berhasil.")}>Create</Button>
                  <Button type="button" variant="outline" disabled={loading} onClick={() => run(() => gatewayRequest("wallet", "wallet/topup", { method: "POST", headers: { Authorization: auth }, body: { userId: session.userId, amount: walletForm.amount } }), "Topup berhasil.")}>Topup</Button>
                  <Button type="button" variant="outline" disabled={loading} onClick={() => run(() => gatewayRequest("wallet", "wallet/pay", { method: "POST", headers: { Authorization: auth, "Idempotency-Key": `${Date.now()}-${walletForm.amount}` }, body: { userId: session.userId, amount: walletForm.amount, description: walletForm.description } }), "Pay berhasil.")}>Pay</Button>
                  <Button type="button" variant="outline" disabled={loading} onClick={() => run(() => gatewayRequest("wallet", "wallet/refund", { method: "POST", headers: { Authorization: auth }, body: { userId: session.userId, amount: walletForm.amount, description: walletForm.description } }), "Refund berhasil.")}>Refund</Button>
                  <Button type="button" variant="outline" disabled={loading} onClick={() => run(() => gatewayRequest("wallet", "wallet/withdraw", { method: "POST", headers: { Authorization: auth, "X-Role": walletForm.roleHeader }, body: { userId: session.userId, amount: walletForm.amount, description: walletForm.description } }), "Withdraw berhasil.")}>Withdraw</Button>
                  <Button type="button" variant="outline" disabled={loading} onClick={() => run(() => gatewayRequest<WalletTransaction[]>("wallet", `wallet/${session.userId}/transactions${walletForm.historyStatus ? `?status=${walletForm.historyStatus}` : ""}`, { headers: { Authorization: auth } }), "History berhasil.")}>History</Button>
                </div>
              </div>
            </Card>
            <Card title="Wallet Contract API">
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" disabled={loading} onClick={() => run(() => gatewayRequest("wallet", "api/contracts/wallet/check-balance", { method: "POST", headers: { Authorization: auth }, body: { userId: session.userId, amount: walletForm.amount } }), "Check balance contract berhasil.")}>Check Balance</Button>
                <Button type="button" variant="outline" disabled={loading} onClick={() => run(() => gatewayRequest("wallet", "api/contracts/wallet/deduct", { method: "POST", headers: { Authorization: auth }, body: { userId: session.userId, orderId: walletForm.orderId, amount: walletForm.amount, idempotencyKey: walletForm.idempotencyKey } }), "Deduct contract berhasil.")}>Deduct</Button>
                <Button type="button" variant="outline" disabled={loading} onClick={() => run(() => gatewayRequest("wallet", "api/contracts/wallet/refund", { method: "POST", headers: { Authorization: auth }, body: { userId: session.userId, orderId: walletForm.orderId, amount: walletForm.amount, idempotencyKey: walletForm.idempotencyKey } }), "Refund contract berhasil.")}>Refund Contract</Button>
              </div>
            </Card>
          </section>
        )}

        {tab === "order" && (
          <section className="grid gap-4 lg:grid-cols-2">
            <Card title="Order Checkout">
              <form className="grid gap-2" onSubmit={(e: FormEvent) => {
                e.preventDefault();
                run(() => orderApi.checkout({
                  productId: orderForm.productId,
                  userId: orderForm.userId,
                  jastiperId: orderForm.jastiperId,
                  jumlah: orderForm.jumlah,
                  alamatPengiriman: orderForm.alamatPengiriman,
                  voucherCode: orderForm.voucherCode || undefined,
                }, { authorization: auth, idempotencyKey: orderForm.idempotencyKey }), "Checkout order berhasil.");
              }}>
                <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="Product ID" value={orderForm.productId} onChange={(e) => setOrderForm((p) => ({ ...p, productId: e.target.value }))} />
                <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="User ID" value={orderForm.userId} onChange={(e) => setOrderForm((p) => ({ ...p, userId: e.target.value }))} />
                <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="Jastiper ID" value={orderForm.jastiperId} onChange={(e) => setOrderForm((p) => ({ ...p, jastiperId: e.target.value }))} />
                <input className="rounded border p-2 text-sm dark:bg-slate-950" type="number" min={1} placeholder="Jumlah" value={orderForm.jumlah} onChange={(e) => setOrderForm((p) => ({ ...p, jumlah: Number(e.target.value) }))} />
                <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="Alamat Pengiriman" value={orderForm.alamatPengiriman} onChange={(e) => setOrderForm((p) => ({ ...p, alamatPengiriman: e.target.value }))} />
                <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="Voucher Code" value={orderForm.voucherCode} onChange={(e) => setOrderForm((p) => ({ ...p, voucherCode: e.target.value }))} />
                <input className="rounded border p-2 font-mono text-sm dark:bg-slate-950" placeholder="Idempotency Key" value={orderForm.idempotencyKey} onChange={(e) => setOrderForm((p) => ({ ...p, idempotencyKey: e.target.value }))} />
                <Button type="submit" disabled={loading}>Checkout</Button>
              </form>
            </Card>
            <Card title="Order Admin Monitor">
              <div className="grid gap-2">
                <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="Status" value={orderForm.status} onChange={(e) => setOrderForm((p) => ({ ...p, status: e.target.value }))} />
                <div className="grid gap-2 md:grid-cols-2">
                  <input className="rounded border p-2 text-sm dark:bg-slate-950" type="number" placeholder="Page" value={orderForm.page} onChange={(e) => setOrderForm((p) => ({ ...p, page: Number(e.target.value) }))} />
                  <input className="rounded border p-2 text-sm dark:bg-slate-950" type="number" placeholder="Size" value={orderForm.size} onChange={(e) => setOrderForm((p) => ({ ...p, size: Number(e.target.value) }))} />
                  <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="SortBy" value={orderForm.sortBy} onChange={(e) => setOrderForm((p) => ({ ...p, sortBy: e.target.value }))} />
                  <input className="rounded border p-2 text-sm dark:bg-slate-950" placeholder="Direction" value={orderForm.direction} onChange={(e) => setOrderForm((p) => ({ ...p, direction: e.target.value }))} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" disabled={loading} onClick={() => run(() => gatewayRequest("order", "api/orders/admin/summary", { headers: { Authorization: auth } }), "Order summary berhasil.")}>Summary</Button>
                  <Button type="button" variant="outline" disabled={loading} onClick={() => run(() => gatewayRequest("order", "api/orders/admin/active", { headers: { Authorization: auth } }), "Order active berhasil.")}>Active</Button>
                  <Button type="button" variant="outline" disabled={loading} onClick={() => run(() => gatewayRequest("order", `api/orders/admin/by-status?status=${encodeURIComponent(orderForm.status)}`, { headers: { Authorization: auth } }), "By status berhasil.")}>By Status</Button>
                  <Button type="button" variant="outline" disabled={loading} onClick={() => run(() => gatewayRequest("order", `api/orders/admin/active/paged?page=${orderForm.page}&size=${orderForm.size}&sortBy=${encodeURIComponent(orderForm.sortBy)}&direction=${encodeURIComponent(orderForm.direction)}`, { headers: { Authorization: auth } }), "Active paged berhasil.")}>Active Paged</Button>
                  <Button type="button" variant="outline" disabled={loading} onClick={() => run(() => gatewayRequest("order", `api/orders/admin/by-status/paged?status=${encodeURIComponent(orderForm.status)}&page=${orderForm.page}&size=${orderForm.size}&sortBy=${encodeURIComponent(orderForm.sortBy)}&direction=${encodeURIComponent(orderForm.direction)}`, { headers: { Authorization: auth } }), "By status paged berhasil.")}>By Status Paged</Button>
                </div>
              </div>
            </Card>
          </section>
        )}

        <JsonPane title="Latest Response" data={payload} />
        {message && <p className="rounded-lg border border-slate-300 bg-slate-100 p-3 text-sm text-slate-700">{message}</p>}
        {error && <p className="rounded-lg border border-slate-300 bg-slate-100 p-3 text-sm text-slate-700">{error}</p>}
      </div>
    </main>
  );
}

