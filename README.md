# AMANGIZ - Amankan Gizi

Food safety & nutrition incident-response platform for Indonesia's *Program Makan Bergizi Gratis* (MBG) — traces a food batch from supplier to receiving school, and gives staff one workflow to report, prioritize, investigate, and resolve suspected food-safety incidents.

**[Live Demo](https://amangiz.vercel.app)**

## Thumbnail

<img src="./public/Thumb-1.png" alt="AMANGIZ Thumbnail" width="100%" />

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

<table width="100%">
  <thead>
    <tr><th>Variable</th><th>Description</th></tr>
  </thead>
  <tbody>
    <tr><td><code>MONGODB_URI</code></td><td>MongoDB Atlas (or compatible) connection string</td></tr>
    <tr><td><code>SESSION_SECRET</code></td><td>HS256 signing key for the session JWT (≥ 32 characters)</td></tr>
    <tr><td><code>CLOUDINARY_CLOUD_NAME</code> / <code>CLOUDINARY_API_KEY</code> / <code>CLOUDINARY_API_SECRET</code></td><td>Cloudinary credentials for evidence/document storage</td></tr>
    <tr><td><code>IS_SANDBOX</code></td><td>When <code>true</code>, <code>/login</code> shows a demo-accounts modal for trying every role</td></tr>
  </tbody>
</table>

### 4. Run Development Server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

On a fresh database, seed baseline accounts so you can log in:

```bash
bun run seed
```

<table width="100%">
  <thead>
    <tr><th>Role</th><th>Email</th><th>Password</th></tr>
  </thead>
  <tbody>
    <tr><td>Administrator</td><td><code>admin@amangiz.test</code></td><td><code>Password123!</code></td></tr>
    <tr><td>SPPG Operator</td><td><code>sppg.cempaka@amangiz.test</code></td><td><code>Password123!</code></td></tr>
    <tr><td>School Operator</td><td><code>sekolah.cikarang@amangiz.test</code></td><td><code>Password123!</code></td></tr>
    <tr><td>Investigator</td><td><code>investigator@amangiz.test</code></td><td><code>Password123!</code></td></tr>
  </tbody>
</table>

## Team

<table width="100%">
  <thead>
    <tr><th>Photo</th><th>Name</th><th>Role</th></tr>
  </thead>
  <tbody>
    <tr><td><img src="./public/Yogawan.png" width="80" style="border-radius: 50%;" /></td><td>Yogawan</td><td>Frontend Developer</td></tr>
    <tr><td><img src="./public/Adnan.png" width="80" style="border-radius: 50%;" /></td><td>Adnan</td><td>UI/UX & Video Editor</td></tr>
    <tr><td><img src="./public/Lathif.png" width="80" style="border-radius: 50%;" /></td><td>Lathif</td><td>Backend & AI Developer</td></tr>
  </tbody>
</table>

## License

This project does not currently have a license — all rights reserved until one is added.
