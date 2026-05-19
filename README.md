# Frontend JSON (JaStip Online Nasional)

Frontend Next.js untuk integrasi penuh modul backend:
- `be-authentication`
- `be-inventory-catalog`
- `be-order`
- `be-voucher-promo`
- `be-wallet-transaksi`

## Prasyarat
- Node.js 20+
- NPM 10+
- Semua backend service sudah running

## Setup
1. Install dependency:
```bash
npm install
```
2. Copy env:
```bash
cp .env.example .env.local
```
3. Jalankan app:
```bash
npm run dev
```
4. Jalankan smoke test frontend:
```bash
npm test
```

## Default Backend URLs
`.env.example` sudah diset sesuai kontrak integrasi terbaru:
- Auth/Profile: `http://localhost:3002`
- Inventory: `http://localhost:4002`
- Order: `http://localhost:5002`
- Wallet: `http://localhost:6002`
- Voucher: `http://localhost:7002`

## Halaman Utama
- `/` landing
- `/login`, `/register`
- `/catalog`
- `/order`, `/order/list`
- `/wallet`
- `/vouchers`
- `/profile`
- `/integration` (workspace uji E2E internal, aktif jika `NEXT_PUBLIC_ENABLE_INTEGRATION_WORKSPACE=true`)

## Catatan Integrasi
- Semua request frontend melewati proxy `src/app/api/gateway/[service]/[...path]/route.ts`.
- Session disimpan di browser (`localStorage`) via `src/lib/client-session.ts`.
- Untuk endpoint yang butuh otorisasi role (mis. admin/jastiper), gunakan akun/token dengan role yang sesuai.
- Checkout order mengikuti guard backend terbaru: hanya role `TITIPER` yang boleh checkout dan user tidak boleh membeli produk milik jastiper dengan ID yang sama.
