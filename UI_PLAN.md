# AMANGIZ — UI & Integration Plan

> Dokumen kerja, bukan bagian dari spec. Sumber kebenaran tetap `PRD.md`. Dokumen ini cuma mengurai PRD §4, §5, §6, §9 jadi fase eksekusi, plus mencatat keputusan yang PRD nggak tentukan secara eksplisit.

**Status backend (selesai, sudah type-check + lint + build hijau):**
- 11 Mongoose model di `models/` (PRD §7)
- 56 route handler di `app/api/v1/**/route.ts` (PRD §8)
- `proxy.ts` (optimistic redirect saja — bukan authorization layer)
- Infra pendukung: `lib/auth/`, `lib/permissions/`, `lib/access/`, `lib/validations/`, `lib/risk-engine/`, `lib/cloudinary/`, `lib/notifications/`, `lib/audit/`, `lib/workflow/`, `lib/api/`

---

## 0. Keputusan Arsitektur

| Area | Keputusan | Alasan |
|---|---|---|
| **Data flow** | Hybrid: Server Component **baca** langsung lewat `services/*.service.ts`; Client Component **nulis** (form/aksi) lewat `fetch` ke `/api/v1/*` | Dipilih di sesi ini. Baca cepat tanpa network hop; tulis tetap lewat jalur yang sudah ada validasi Zod + permission guard + audit log, nggak usah dibikin dua kali. |
| **No-logic-drift rule** | Query "baca" yang dipakai API route maupun Server Component ditaruh di satu `services/<resource>.service.ts`, dipanggil dari dua tempat. Route handler yang sekarang masih inline (list batches, list incidents, dashboard, dll) di-extract dulu sebelum dipakai Server Component. | Supaya scope filter per-role (`lib/permissions`, `lib/access`) nggak pernah nyimpang antara apa yang ditampilkan UI vs apa yang API kembalikan. |
| **Cache Components** (`next.config.ts` → `cacheComponents: true`) | Tiap Server Component yang baca `cookies()`/session **atau** query Mongoose wajib dibungkus `<Suspense fallback={<Skeleton/>}>`. Baca `cookies()` di luar Suspense = **build error**, bukan warning. | Constraint Next.js 16 yang udah aktif di repo ini, dikonfirmasi dari `node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md`. Bukan opsional. |
| **Skeleton = Suspense fallback** | Tiap Suspense boundary = 1 Skeleton komponen | PRD §6.3 minta "Skeleton Loader" sebagai komponen UI — constraint di atas justru memaksa pola yang PRD mau. |
| **UI kit** | shadcn/ui + Radix UI + `lucide-react` | Sudah fix di PRD (Informasi Produk, §6.3) |
| **Font** | Manrope (primary) + Geist Mono (data/kode), via `next/font/google` | PRD §5. `app/layout.tsx` saat ini masih default template (Geist Sans, bukan Manrope) → diperbaiki di Phase 0. |
| **Chart** | Recharts, warna & layout ikut panduan skill `dataviz` | PRD nggak nentuin lib spesifik; Recharts pairing paling umum dengan shadcn/ui chart components |
| **Toast** | `sonner` (default shadcn) | Konsisten ekosistem shadcn |
| **Mutation pattern (client)** | 1 helper kecil `lib/api/client.ts` (fetch + parse envelope `{success,data,error}` + throw typed error) → sukses → `router.refresh()` + toast | App Router punya `router.refresh()` buat re-jalanin Server Component; nggak perlu nambah SWR/TanStack Query buat skala app ini |

### 0.1 Gap PRD yang diasumsikan — tolong koreksi kalau salah baca

| Gap | Asumsi yang dipakai |
|---|---|
| PRD §9.1 bilang "Total: 10 halaman utama", tapi nggak ada halaman khusus SPPG/Supplier/School walau API + permission matrix-nya full (§8.5–8.7, §3.2) | Ditaruh sebagai **tab di dalam `/app/users`** ("User & Master Data"), bukan nav item baru. Jumlah nav tetap 10. |
| Audit Log juga nggak masuk 10 halaman, padahal punya endpoint + baris permission sendiri (§8.14, §3.2) | Halaman admin sekunder `/app/audit-log`, diakses dari menu profil, diperlakukan seperti dynamic detail route — PRD sendiri bilang halaman semacam itu "tidak harus dihitung sebagai halaman utama" |
| Chart & client mutation library | Lihat tabel di atas |

### 0.2 Prasyarat — belum ada, blocking Phase 1

- [ ] **Seed script** (`scripts/seed.ts`) — belum ada satu pun user di DB, nggak bisa login sama sekali tanpa ini. Minimal: 1 `admin`, 1 SPPG + `sppg_operator`-nya, 1 School + `school_operator`-nya, 1 `investigator`.
- [x] `.env.local` (MONGODB_URI, SESSION_SECRET, CLOUDINARY_*) — sudah terisi dari sesi sebelumnya.

### 0.3 Struktur Folder (adaptasi PRD §9.3, tanpa `src/` — lihat memory `amangiz-repo-conventions`)

```text
app/
├── (public)/
│   ├── page.tsx                      # Landing
│   └── login/page.tsx
├── (application)/app/
│   ├── layout.tsx                    # Sidebar + Topbar shell
│   ├── dashboard/page.tsx
│   ├── batches/{page,new/page,[id]/page,[id]/edit/page}.tsx
│   ├── traceability/page.tsx
│   ├── distribution/{page,new/page,[id]/page}.tsx
│   ├── incidents/{page,new/page,[id]/page}.tsx
│   ├── risk-analysis/page.tsx
│   ├── investigations/{page,[id]/page}.tsx
│   ├── users/page.tsx                # + tab Master Data (SPPG/Supplier/School)
│   └── audit-log/page.tsx            # sekunder, lihat §0.1
├── api/v1/...                        # SUDAH ADA, tidak disentuh kecuali ada bug
components/
├── ui/                                # output `shadcn add`
├── layout/                            # Sidebar, Topbar, MobileDrawer
├── shared/                            # StatCard, DataTable, StatusBadge, RiskBadge,
│                                       # SearchInput, FilterDropdown, DateRangePicker,
│                                       # EmptyState, Skeletons, ConfirmDialog
└── <domain>/                          # batches/, distribution/, incidents/, risk-analysis/,
                                        # investigations/, users/, dashboard/
lib/
├── api/client.ts                      # BARU — fetch helper sisi client
└── auth/current-user.ts               # BARU — getCurrentUser() non-throwing, dipanggil di Suspense
services/
├── traceability.service.ts            # sudah ada
├── risk-assessment.service.ts         # sudah ada
├── batch.service.ts                   # sudah ada (containment) — ditambah listBatches/getBatchById
├── distribution.service.ts            # BARU
├── incident.service.ts                # BARU
├── investigation.service.ts           # BARU
├── dashboard.service.ts               # BARU (extract dari 4 route handler dashboard)
├── master-data.service.ts             # BARU (SPPG/Supplier/School)
└── notification.service.ts            # BARU
scripts/
└── seed.ts                            # BARU
```

---

## Phase 0 — Foundation: Design System, Shell, Plumbing

**Tujuan:** semua yang dibutuhkan phase-phase berikutnya; belum ada fitur yang terlihat user.

| # | Task | File |
|---|---|---|
| 0.1 | `bunx shadcn@latest init` + tambah komponen dasar (button, input, label, card, table, badge, dialog, sheet, dropdown-menu, select, form, sonner, skeleton, avatar, separator, tabs) | `components/ui/*` |
| 0.2 | Pasang CSS variables brand/status/risk dari PRD §4.4 | `app/globals.css` |
| 0.3 | Ganti font default → Manrope (sans) + pertahankan Geist Mono | `app/layout.tsx` |
| 0.4 | Shell aplikasi: Sidebar (~240px) + Topbar (~64px) + drawer mobile (PRD §6.2) | `app/(application)/app/layout.tsx`, `components/layout/*` |
| 0.5 | `getCurrentUser()` — wrapper non-throwing di atas `requireUser()`, dipanggil di dalam Suspense | `lib/auth/current-user.ts` |
| 0.6 | Komponen bersama: StatCard, DataTable (pagination+sort+search bawaan), StatusBadge, RiskBadge (warna **+ label teks**, PRD §4.3), SearchInput, FilterDropdown, DateRangePicker, EmptyState, Skeleton varian table/card, ConfirmDialog | `components/shared/*` |
| 0.7 | `lib/api/client.ts` — fetch helper client (parse envelope, throw typed error) | `lib/api/client.ts` |
| 0.8 | Extract `services/dashboard.service.ts` dari 4 route handler dashboard yang sekarang inline | `services/dashboard.service.ts` |
| 0.9 | `scripts/seed.ts` + `"seed": "bun run scripts/seed.ts"` di `package.json` | `scripts/seed.ts` |

**Definition of Done:**
- [ ] `bun run seed` jalan, user per role bisa dicek di Atlas — script sudah benar (lihat memory `amangiz-bun-mongoose-scripts` utk fix Bun/bson), **tapi belum bisa diverifikasi di sesi ini** karena sandbox ini tidak bisa menjangkau Atlas (lihat memory `amangiz-sandbox-db-unreachable`). Tolong jalankan `bun run seed` di environment yang Atlas-nya kebuka, konfirmasi 4 user + SPPG/Supplier/School muncul.
- [x] `/app/dashboard` nge-render shell (sidebar/topbar, font, warna benar) tanpa widget — placeholder Suspense/Skeleton — diverifikasi via HTTP request langsung ke dev server yang sudah jalan (bukan browser nyata)
- [x] `bunx tsc --noEmit` & `bunx biome check` bersih
- [ ] `bun run dev` dibuka di browser, shell navigable di desktop & mobile width — dev server kamu sendiri sudah jalan di :3000 dari sebelum sesi ini; structure/HTML sudah dicek lewat curl, tapi interaksi browser asli (buka drawer mobile, dropdown user menu) belum — tolong cek manual sekali di browser

---

## Phase 1 — Public Pages & Autentikasi

| Route | Tipe | Isi | API |
|---|---|---|---|
| `/` | Server (statis) | Navbar, Hero, Problem statement, Product overview, Core Workflow diagram, Feature highlights, CTA, Footer (PRD §9.2.1) | — |
| `/login` | Client form | Email/password, show/hide password, validasi (mirror `lib/validations/auth.ts`), error & loading state | `POST /api/v1/auth/login` |
| Topbar | Server (Suspense) + Client (menu) | Nama/role/org dari sesi, tombol logout | `GET /api/v1/auth/me` (server, langsung lewat `getCurrentUser()`) · `POST /api/v1/auth/logout` (client) |

**Definition of Done:**
- [ ] Login berhasil untuk tiap 4 role (hasil seed Phase 0), redirect ke `/app/dashboard` atau `?next=` — kode sudah benar (`login-form.tsx` sekarang baca `?next=` dengan whitelist `/app` prefix, bukan buka ke sembarang URL), **belum bisa diverifikasi live** di sandbox ini (masih sama kayak Phase 0: `amangiz-sandbox-db-unreachable`)
- [x] Akses `/app/*` tanpa cookie → redirect `/login?next=...` (verifikasi `proxy.ts` jalan) — diverifikasi live via curl: 307 ke `/login?next=%2Fapp%2Fdashboard`
- [ ] Logout menghapus cookie & redirect ke `/login` — kode benar, tapi `route()` wrapper selalu `connectDB()` dulu sebelum masuk ke handler apa pun (termasuk logout), jadi tetap kena wall Atlas yang sama — belum bisa diverifikasi live
- [ ] Password salah / email salah → pesan sama (anti user-enumeration, sesuai `auth/login/route.ts`) — sudah dicek dari kode (satu pesan `unauthenticated` yang sama buat dua kasus), belum re-verify live karena alasan yang sama

---

## Phase 2 — Core Foundation: User & Master Data, Batch, Distribution

*(mirror PRD §11 Phase 1)*

| Route | Isi | Service (read) | API (write) |
|---|---|---|---|
| `/app/users` | Tab: Users \| SPPG \| Suppliers \| Schools. Table + create/edit dialog, activate/deactivate | `services/master-data.service.ts` | `/api/v1/users*`, `/api/v1/sppgs*`, `/api/v1/suppliers*`, `/api/v1/schools*` |
| `/app/batches`, `/new`, `/[id]`, `/[id]/edit` | Table (filter status/tanggal), form create/edit, detail (ingredients, suhu, status), tombol Hold/Release/Recall (role-gated) | `services/batch.service.ts` (extend) | `/api/v1/batches*`, `/[id]/hold`, `/release`, `/recall` |
| `/app/distribution`, `/new`, `/[id]` | Table, form kirim, tombol Dispatch/Receive, upload bukti pengiriman | `services/distribution.service.ts` (baru) | `/api/v1/distributions*`, `/dispatch`, `/receive`, `/evidence` |

**Definition of Done:**
- [ ] Admin bisa CRUD penuh User + SPPG + Supplier + School — kode lengkap (create/edit dialog + activate-deactivate/verification per tab), **belum bisa diverifikasi live** (sandbox ini nggak bisa reach Atlas, sama kayak Phase 0/1 — lihat memory `amangiz-sandbox-db-unreachable`)
- [ ] SPPG Operator bikin batch → dispatch distribusi → School Operator confirm receive, end-to-end ke Atlas asli — kode lengkap, belum bisa diverifikasi end-to-end karena alasan yang sama
- [ ] Hold/Release/Recall cuma muncul/berfungsi sesuai role (lihat `services/batch.service.ts` `ALLOWED_ROLES`, sekarang di-export dan dipakai langsung oleh `/app/batches/[id]` buat nentuin tombol mana yang muncul) — belum diverifikasi live
- [ ] Upload evidence ke Cloudinary via signed URL benar-benar tersimpan & tampil — flow sudah dibangun sesuai PRD §10.3 (GET signature → upload langsung ke Cloudinary → POST publicId buat direkam), belum bisa dites end-to-end di sandbox ini

Semua route baru sudah lolos `tsc --noEmit` + `biome check` bersih, dan sudah dicek nggak ada compile error (ketemu + langsung diperbaiki satu bug nyata: client component yang import schema Zod dari `lib/validations/{user,master-data,batch,distribution}.ts` ikut nge-bundle `mongoose` ke browser — lihat memory `amangiz-client-validation-bundling`).

---

## Phase 3 — Traceability

*(mirror PRD §11 Phase 2)*

| Route | Isi | Service |
|---|---|---|
| `/app/traceability` | Search by batch code → render chain Supplier → Ingredients → FoodBatch → SPPG → Distribution → School → Incident (PRD §9.2.5). Tiap leg distribusi tampilkan status **confirmed/pending** eksplisit, nggak boleh terlihat terverifikasi kalau `receivedAt` belum ada | `services/traceability.service.ts` (sudah ada) |

**Definition of Done:**
- [ ] Search batch yang punya >1 distribusi + minimal 1 incident → chain lengkap & akurat — kode lengkap (`getTraceabilityByBatchCode` di-extend dengan evidence references + scoping permission yang sama dengan `/app/batches/[id]`), **belum bisa diverifikasi live** (sandbox nggak reach Atlas — `amangiz-sandbox-db-unreachable`)
- [x] Leg tanpa `receivedAt` tampil jelas sebagai belum terkonfirmasi, bukan seolah sudah terkirim — badge "Belum Dikonfirmasi" (neutral tone) vs "Diterima — Terkonfirmasi" (success tone), dari `receiptConfirmed` yang sama dipakai API
- [x] Link traceability muncul dari halaman detail Batch & detail Distribution — tombol "Lihat Traceability" di kedua halaman, `?code=<batchCode>`

---

## Phase 4 — Incident Response (Incident + Risk + Investigation)

*(mirror PRD §11 Phase 3 — bagian paling besar)*

| Route | Isi | Service |
|---|---|---|
| `/app/incidents`, `/new`, `/[id]` | Table (severity/status/priority), form lapor (school operator auto-scope ke sekolahnya), upload evidence. **Detail page wajib pisahkan visual**: Laporan Awal / Penilaian Risiko (+ disclaimer) / Temuan Investigasi (PRD §6.4 #4) | `services/incident.service.ts` (baru) |
| `/app/risk-analysis` | Summary by level, top cases, aturan paling sering triggered, missing-data indicator, link ke detail incident, disclaimer wajib tampil | `services/dashboard.service.ts` (risk-overview) |
| `/app/investigations`, `/[id]` | Queue, timeline (+form tambah), findings (+form), sample testing/lab result form, corrective actions (create + update per-action), tombol Complete (block kalau masih ada corrective action terbuka / lab masih "requested") | `services/investigation.service.ts` (baru) |

**Definition of Done:**
- [ ] Walkthrough penuh: lapor → triage → assign investigator → run risk assessment → investigasi (timeline/finding/lab result/corrective action) → complete investigation → resolve incident → close incident
- [ ] Setiap langkah di atas gated sesuai role & tercatat di audit log
- [ ] UI nggak pernah nyampur skor risk engine dengan severity hasil triase manusia — dua section terpisah jelas
- [ ] Disclaimer risk score ("bukan diagnosis medis") tampil di setiap tempat skor ditunjukkan

---

## Phase 5 — Dashboard, Notifikasi & Polish

*(mirror PRD §11 Phase 4)*

| Item | Detail |
|---|---|
| `/app/dashboard` | Stat cards (batch/distribusi/insiden/risk), insiden terbaru, distribusi terlambat, quick action, recent activity (audit log tersaring scope) — full wiring ke `services/dashboard.service.ts` |
| Notification center | Bell icon di Topbar, unread badge, mark read/mark all read, poll `unread-count` tiap fokus tab |
| `/app/audit-log` | Halaman admin sekunder, lihat §0.1 |
| Responsive pass | Sidebar→drawer, table→scroll/list di mobile, form 1 kolom, label risk tetap pakai teks bukan cuma warna |
| Loading/empty/error pass | Audit ulang semua Suspense boundary + Skeleton + EmptyState di seluruh halaman |
| Smoke test | Jalankan skill `run`, walkthrough manual per role sesuai checklist §6 di bawah |

**Definition of Done:** seluruh checklist PRD §12 (Definition of Done) tercentang.

---

## 6. Urutan Eksekusi

1 fase = 1 batch kerja. Tiap fase selesai → aku jalankan `bun run dev`, cek golden path di browser, lapor ke kamu → baru lanjut fase berikutnya. Nggak pindah fase kalau DoD fase sebelumnya belum tercentang.

---

## 7. Definition of Done Global (salinan PRD §12 — gate akhir)

- [ ] Login sesuai role, tidak bisa akses di luar permission
- [ ] Admin kelola user & master data
- [ ] SPPG Operator kelola batch & distribusi sesuai akses
- [ ] Batch ↔ pemasok ↔ distribusi tersambung
- [ ] Distribusi ↔ sekolah penerima tersambung
- [ ] Traceability jalur distribusi bisa ditelusuri
- [ ] Sekolah bisa lapor dugaan insiden
- [ ] Insiden terkait batch/distribusi
- [ ] Bukti pendukung bisa diunggah & ditampilkan
- [ ] Risk engine menghasilkan skor + alasan + aturan terpenuhi
- [ ] Investigator catat kronologi, temuan, tindak lanjut
- [ ] Status kasus berubah lewat workflow tervalidasi
- [ ] Aktivitas penting tercatat di audit log
- [ ] Tampilan jalan di desktop & mobile
