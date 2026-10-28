# AMANGIZ - Amankan Gizi

Food safety & nutrition incident-response platform for Indonesia's *Program Makan Bergizi Gratis* (MBG) — traces a food batch from supplier to receiving school, and gives staff one workflow to report, prioritize, investigate, and resolve suspected food-safety incidents.

**[Live Demo](https://amangiz.vercel.app)**

## Thumbnail

![AMANGIZ Thumbnail](./public/Thumb-1.png)

## Tech Stack

- Next.js 16 (App Router, Turbopack)
- React 19
- TypeScript
- Tailwind CSS
- Radix UI
- GSAP
- MongoDB Atlas
- Mongoose
- Zod
- jose (JWT) & bcryptjs
- Cloudinary
- Biome
- Bun

## How to Start

### 1. Clone Repository

```bash
git clone https://github.com/yogawan/amangiz.git
cd amangiz
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Configure Environment Variables

Copy the example file and fill in real values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB Atlas (or compatible) connection string |
| `SESSION_SECRET` | HS256 signing key for the session JWT (≥ 32 characters) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary credentials for evidence/document storage |
| `IS_SANDBOX` | When `true`, `/login` shows a demo-accounts modal for trying every role |

### 4. Run Development Server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

On a fresh database, seed baseline accounts so you can log in:

```bash
bun run seed
```

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@amangiz.test` | `Password123!` |
| SPPG Operator | `sppg.cempaka@amangiz.test` | `Password123!` |
| School Operator | `sekolah.cikarang@amangiz.test` | `Password123!` |
| Investigator | `investigator@amangiz.test` | `Password123!` |

## Team

| Photo | Name | Role |
|---|---|---|
| <img src="./public/Yogawan.png" width="80" style="border-radius: 50%;" /> | Yogawan | Frontend Developer |
| <img src="./public/Adnan.png" width="80" style="border-radius: 50%;" /> | Adnan | UI/UX & Video Editor |
| <img src="./public/Lathif.png" width="80" style="border-radius: 50%;" /> | Lathif | Backend & AI Developer |

## License

This project does not currently have a license — all rights reserved until one is added.
