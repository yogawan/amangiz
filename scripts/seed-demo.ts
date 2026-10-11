import mongoose, { type Types } from "mongoose";
import { hashPassword } from "@/lib/auth/password";
import { connectDB } from "@/lib/db/mongoose";
import { assessRisk, type RiskEngineInput } from "@/lib/risk-engine";
import AuditLog, { type IAuditLog } from "@/models/AuditLog";
import Distribution, { type DistributionStatus } from "@/models/Distribution";
import FoodBatch, {
  type FoodBatchStatus,
  type IFoodBatch,
} from "@/models/FoodBatch";
import Incident, {
  type IncidentSeverity,
  type IncidentStatus,
  type IncidentType,
} from "@/models/Incident";
import Investigation from "@/models/Investigation";
import Notification, { type INotification } from "@/models/Notification";
import RiskAssessment from "@/models/RiskAssessment";
import School, { type ISchool } from "@/models/School";
import SPPG, { type ISPPG } from "@/models/SPPG";
import Supplier, { type ISupplier } from "@/models/Supplier";
import User, {
  type IUser,
  type OrganizationType,
  type UserRole,
} from "@/models/User";

/**
 * Demo dataset for presentations (docs/DEMO_SCENARIO.md). `scripts/seed.ts`
 * only creates the bare minimum needed to log in, which leaves every list page
 * and dashboard widget showing an empty state — fine for development, useless
 * on stage.
 *
 * Run via `bun run seed:demo`, which bundles to plain JS and executes with
 * `node` for the same bson/`node:v8` reason documented in scripts/seed.ts.
 *
 * ---------------------------------------------------------------------------
 * DESTRUCTIVE for transactional data. Master data (SPPG, suppliers, schools,
 * users) is upserted and never dropped, but batches, distributions, incidents,
 * risk assessments, investigations, notifications, and audit logs are DELETED
 * and rebuilt so re-running gives a clean, predictable stage state instead of
 * accumulating duplicates. Do not point this at anything but a demo database.
 * ---------------------------------------------------------------------------
 *
 * Every date is relative to run time, so the dashboard's "today" widgets and
 * "recent activity" stay populated no matter when the script last ran.
 *
 * Risk assessments are produced by the real engine (`lib/risk-engine`), not
 * hardcoded, so the rules and scores on screen are genuinely what the system
 * computes. The engine is imported directly rather than through
 * services/risk-assessment.service.ts because that module transitively pulls
 * in `next/headers`, which cannot load outside a Next request.
 */

const SEED_PASSWORD = "Password123!";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const NOW = new Date();

/** `ago(2, 14, 30)` → 2 days ago at 14:30 local-ish (UTC-based, stable). */
function ago(days: number, hour = 9, minute = 0): Date {
  const base = new Date(NOW.getTime() - days * DAY_MS);
  base.setUTCHours(hour, minute, 0, 0);
  return base;
}

/** Today at a given time — used for the "Distribusi Hari Ini" widget. */
function today(hour: number, minute = 0): Date {
  return ago(0, hour, minute);
}

/**
 * Unwraps a lookup that the seed's own data guarantees exists. Failing loudly
 * with the missing key beats a non-null assertion silently producing
 * `undefined._id` three hundred lines later.
 */
function must<T>(value: T | undefined | null, label: string): T {
  if (value === null || value === undefined) {
    throw new Error(`Seed lookup failed: ${label}`);
  }
  return value;
}

/**
 * Deterministic PRNG (LCG). The bulk records below are generated rather than
 * hand-written, but a fixed seed keeps every run byte-identical — which is why
 * `bun run verify:demo` can quote an exact expected score, and why re-seeding
 * the morning of a demo can't silently change what the slides promise.
 */
function makeRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const rng = makeRng(20261012);

const pick = <T>(items: readonly T[]): T =>
  must(items[Math.floor(rng() * items.length)], "pick from empty list");

/** Inclusive on both ends. */
const randInt = (min: number, max: number): number =>
  min + Math.floor(rng() * (max - min + 1));

const chance = (probability: number): boolean => rng() < probability;

/**
 * Reported-impact figure, deliberately skewed small. Real programmes log a
 * long tail of minor reports and only occasionally a large one; drawing this
 * uniformly made almost every generated case land in the engine's top band,
 * which would make the triage score look like it never discriminates.
 */
function reportedAffected(): number {
  const roll = rng();
  if (roll < 0.6) return randInt(0, 2);
  if (roll < 0.85) return randInt(3, 8);
  if (roll < 0.95) return randInt(9, 19);
  return randInt(20, 45);
}

/** `n` distinct members of `items`, or all of them when `n` is larger. */
function sample<T>(items: readonly T[], n: number): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (out.length < n && pool.length > 0) {
    out.push(
      must(pool.splice(Math.floor(rng() * pool.length), 1)[0], "sample"),
    );
  }
  return out;
}

/** Menus rotated through generated batches (typical MBG meal compositions). */
const MENU_POOL = [
  "Nasi Ayam Teriyaki + Tumis Buncis",
  "Nasi Ikan Tongkol Balado + Capcay",
  "Nasi Telur Balado + Tumis Kangkung",
  "Nasi Semur Daging + Sayur Asem",
  "Nasi Ayam Goreng Lengkuas + Sop Sayur",
  "Nasi Soto Ayam + Perkedel Kentang",
  "Nasi Rendang Daging + Tumis Buncis",
  "Nasi Ikan Kembung Goreng + Lalapan",
  "Nasi Opor Ayam + Sayur Labu",
  "Nasi Telur Dadar + Sup Wortel",
  "Nasi Ayam Kecap + Tumis Bayam",
  "Nasi Bakso Sapi + Tumis Wortel",
  "Nasi Ikan Tuna Asam Manis + Capcay",
  "Nasi Ayam Bakar + Sayur Bening",
  "Nasi Daging Cincang + Tumis Tauge",
  "Nasi Ikan Patin Kuah Kuning + Bayam",
  "Nasi Ayam Suwir Pedas + Sup Jagung",
  "Nasi Telur Pindang + Tumis Sawi",
  "Nasi Gulai Ayam + Sayur Nangka",
  "Nasi Pepes Ikan + Tumis Kacang Panjang",
] as const;

// ---------------------------------------------------------------------------
// Master data (idempotent — upserted, never dropped)
// ---------------------------------------------------------------------------

const SPPG_SEED = [
  {
    code: "SPPG-CMP01",
    name: "SPPG Cempaka",
    address: {
      street: "Jl. Cempaka Putih No. 10",
      city: "Jakarta Pusat",
      province: "DKI Jakarta",
      postalCode: "10510",
    },
    contactName: "Siti Rahma",
    contactPhone: "+6281234567890",
    status: "active" as const,
  },
  {
    code: "SPPG-MLT02",
    name: "SPPG Melati",
    address: {
      street: "Jl. Melati Raya No. 45",
      city: "Bekasi",
      province: "Jawa Barat",
      postalCode: "17530",
    },
    contactName: "Agus Wijaya",
    contactPhone: "+6281355667788",
    status: "active" as const,
  },
  {
    code: "SPPG-ANG03",
    name: "SPPG Anggrek",
    address: {
      street: "Jl. Anggrek No. 22",
      city: "Karawang",
      province: "Jawa Barat",
      postalCode: "41311",
    },
    contactName: "Nurul Fadhilah",
    contactPhone: "+6281366778899",
    status: "active" as const,
  },
  {
    code: "SPPG-DHL04",
    name: "SPPG Dahlia",
    address: {
      street: "Jl. Dahlia Indah No. 7",
      city: "Depok",
      province: "Jawa Barat",
      postalCode: "16431",
    },
    contactName: "Eko Prasetyo",
    contactPhone: "+6281377889900",
    status: "active" as const,
  },
];

const SUPPLIER_SEED = [
  {
    code: "SUP-TANI01",
    name: "Tani Makmur Sejahtera",
    supplierType: "agriculture" as const,
    address: "Jl. Raya Bogor KM 20, Depok, Jawa Barat",
    contactName: "Budi Santoso",
    contactPhone: "+6281298765432",
    verificationStatus: "verified" as const,
    status: "active" as const,
  },
  {
    code: "SUP-TERNAK02",
    name: "Ternak Sehat Nusantara",
    supplierType: "livestock" as const,
    address: "Jl. Peternakan No. 8, Cibinong, Jawa Barat",
    contactName: "Rahmat Hidayat",
    contactPhone: "+6281244556677",
    verificationStatus: "verified" as const,
    status: "active" as const,
  },
  {
    code: "SUP-LAUT03",
    name: "Samudra Segar Perkasa",
    supplierType: "seafood" as const,
    address: "Jl. Pelabuhan Muara Baru No. 12, Jakarta Utara",
    contactName: "Yusuf Maulana",
    contactPhone: "+6281277889900",
    verificationStatus: "verified" as const,
    status: "active" as const,
  },
  {
    code: "SUP-OLAH04",
    name: "Pangan Olahan Mandiri",
    supplierType: "processed_food" as const,
    address: "Kawasan Industri Jababeka Blok C-14, Cikarang",
    contactName: "Lina Marlina",
    contactPhone: "+6281233445566",
    // Deliberately still pending so the verification workflow has something
    // real to show on the Suppliers tab.
    verificationStatus: "pending" as const,
    status: "active" as const,
  },
  {
    code: "SUP-SAYUR05",
    name: "Kebun Hijau Lestari",
    supplierType: "agriculture" as const,
    address: "Jl. Raya Lembang No. 77, Bandung Barat",
    contactName: "Endang Suryani",
    contactPhone: "+6281299001122",
    verificationStatus: "verified" as const,
    status: "active" as const,
  },
  {
    code: "SUP-BERAS06",
    name: "Lumbung Padi Nusantara",
    supplierType: "agriculture" as const,
    address: "Jl. Raya Karawang Barat KM 8, Karawang",
    contactName: "Slamet Riyadi",
    contactPhone: "+6281255667788",
    verificationStatus: "verified" as const,
    status: "active" as const,
  },
  {
    code: "SUP-UNGGAS07",
    name: "Unggas Prima Jaya",
    supplierType: "livestock" as const,
    address: "Jl. Peternakan Unggas No. 45, Bogor",
    contactName: "Dedi Kurniawan",
    contactPhone: "+6281266778899",
    verificationStatus: "verified" as const,
    status: "active" as const,
  },
  {
    code: "SUP-IKAN08",
    name: "Bahari Segar Mandiri",
    supplierType: "seafood" as const,
    address: "Jl. Pelabuhan Perikanan No. 3, Indramayu",
    contactName: "Asep Saepudin",
    contactPhone: "+6281277990011",
    verificationStatus: "verified" as const,
    status: "active" as const,
  },
  {
    code: "SUP-SUSU09",
    name: "Susu Murni Lembang",
    supplierType: "processed_food" as const,
    address: "Jl. Peternakan Sapi Perah No. 19, Lembang",
    contactName: "Maya Kusuma",
    contactPhone: "+6281288001122",
    verificationStatus: "pending" as const,
    status: "active" as const,
  },
  {
    code: "SUP-BUMBU10",
    name: "Rempah Khatulistiwa",
    supplierType: "other" as const,
    address: "Pasar Induk Cibitung Blok D-7, Bekasi",
    contactName: "Hasan Basri",
    contactPhone: "+6281299112233",
    // Rejected supplier so the verification workflow shows all three states.
    verificationStatus: "rejected" as const,
    status: "inactive" as const,
  },
];

const SCHOOL_SEED = [
  {
    code: "SDN-01CKR",
    name: "SDN 01 Cikarang",
    level: "SD" as const,
    address: {
      street: "Jl. Industri Raya No. 5",
      city: "Cikarang",
      province: "Jawa Barat",
    },
    contactName: "Dewi Lestari",
    contactPhone: "+6281311112222",
    recipientCapacity: 320,
    status: "active" as const,
  },
  {
    code: "SDN-02CKR",
    name: "SDN 02 Cikarang",
    level: "SD" as const,
    address: {
      street: "Jl. Pahlawan No. 21",
      city: "Cikarang",
      province: "Jawa Barat",
    },
    contactName: "Hendra Gunawan",
    contactPhone: "+6281311113333",
    recipientCapacity: 275,
    status: "active" as const,
  },
  {
    code: "SDN-05CKR",
    name: "SDN 05 Cikarang Utara",
    level: "SD" as const,
    address: {
      street: "Jl. Kenanga No. 3",
      city: "Cikarang",
      province: "Jawa Barat",
    },
    contactName: "Ratna Dewi",
    contactPhone: "+6281311114444",
    recipientCapacity: 410,
    status: "active" as const,
  },
  {
    code: "SMPN-01CKR",
    name: "SMPN 1 Cikarang",
    level: "SMP" as const,
    address: {
      street: "Jl. Pendidikan No. 18",
      city: "Cikarang",
      province: "Jawa Barat",
    },
    contactName: "Bambang Prasetyo",
    contactPhone: "+6281311115555",
    recipientCapacity: 520,
    status: "active" as const,
  },
  {
    code: "MI-ANNUR06",
    name: "MI An-Nur Cikarang",
    level: "SD" as const,
    address: {
      street: "Jl. Masjid An-Nur No. 9",
      city: "Cikarang",
      province: "Jawa Barat",
    },
    contactName: "Fatimah Zahra",
    contactPhone: "+6281311116666",
    recipientCapacity: 180,
    status: "active" as const,
  },
  {
    code: "SDN-03BKS",
    name: "SDN 03 Bekasi Timur",
    level: "SD" as const,
    address: {
      street: "Jl. Raya Bekasi Timur No. 56",
      city: "Bekasi",
      province: "Jawa Barat",
    },
    contactName: "Toni Saputra",
    contactPhone: "+6281311117777",
    recipientCapacity: 295,
    status: "active" as const,
  },
  {
    code: "SDN-07BKS",
    name: "SDN 07 Bekasi Selatan",
    level: "SD" as const,
    address: {
      street: "Jl. Cut Meutia No. 112",
      city: "Bekasi",
      province: "Jawa Barat",
    },
    contactName: "Sri Wahyuni",
    contactPhone: "+6281311118888",
    recipientCapacity: 340,
    status: "active" as const,
  },
  {
    code: "SMPN-02BKS",
    name: "SMPN 2 Bekasi",
    level: "SMP" as const,
    address: {
      street: "Jl. Ahmad Yani No. 88",
      city: "Bekasi",
      province: "Jawa Barat",
    },
    contactName: "Joko Susilo",
    contactPhone: "+6281311119999",
    recipientCapacity: 610,
    status: "active" as const,
  },
  {
    code: "SDN-01KRW",
    name: "SDN 01 Karawang Barat",
    level: "SD" as const,
    address: {
      street: "Jl. Tuparev No. 24",
      city: "Karawang",
      province: "Jawa Barat",
    },
    contactName: "Imas Nuraeni",
    contactPhone: "+6281322221111",
    recipientCapacity: 310,
    status: "active" as const,
  },
  {
    code: "SDN-04KRW",
    name: "SDN 04 Karawang Timur",
    level: "SD" as const,
    address: {
      street: "Jl. Proklamasi No. 61",
      city: "Karawang",
      province: "Jawa Barat",
    },
    contactName: "Rudi Hermawan",
    contactPhone: "+6281322222222",
    recipientCapacity: 265,
    status: "active" as const,
  },
  {
    code: "SMPN-01KRW",
    name: "SMPN 1 Karawang",
    level: "SMP" as const,
    address: {
      street: "Jl. Pangkal Perjuangan No. 5",
      city: "Karawang",
      province: "Jawa Barat",
    },
    contactName: "Lilis Suryani",
    contactPhone: "+6281322223333",
    recipientCapacity: 580,
    status: "active" as const,
  },
  {
    code: "MI-HIDAYAH11",
    name: "MI Al-Hidayah Karawang",
    level: "SD" as const,
    address: {
      street: "Jl. Pesantren No. 14",
      city: "Karawang",
      province: "Jawa Barat",
    },
    contactName: "Ahmad Fauzi",
    contactPhone: "+6281322224444",
    recipientCapacity: 150,
    status: "active" as const,
  },
  {
    code: "SDN-02DPK",
    name: "SDN 02 Depok Baru",
    level: "SD" as const,
    address: {
      street: "Jl. Margonda Raya No. 201",
      city: "Depok",
      province: "Jawa Barat",
    },
    contactName: "Yuni Astuti",
    contactPhone: "+6281333331111",
    recipientCapacity: 385,
    status: "active" as const,
  },
  {
    code: "SDN-06DPK",
    name: "SDN 06 Cimanggis",
    level: "SD" as const,
    address: {
      street: "Jl. Raya Bogor KM 31",
      city: "Depok",
      province: "Jawa Barat",
    },
    contactName: "Bagus Setiawan",
    contactPhone: "+6281333332222",
    recipientCapacity: 290,
    status: "active" as const,
  },
  {
    code: "SMAN-01DPK",
    name: "SMAN 1 Depok",
    level: "SMA" as const,
    address: {
      street: "Jl. Nusantara Raya No. 317",
      city: "Depok",
      province: "Jawa Barat",
    },
    contactName: "Retno Palupi",
    contactPhone: "+6281333333333",
    recipientCapacity: 640,
    status: "active" as const,
  },
  {
    code: "SDN-09CKR",
    name: "SDN 09 Cikarang Selatan",
    level: "SD" as const,
    address: {
      street: "Jl. Serang Cibarusah No. 40",
      city: "Cikarang",
      province: "Jawa Barat",
    },
    contactName: "Dian Pertiwi",
    contactPhone: "+6281311110000",
    recipientCapacity: 225,
    // Inactive so the status filter on the Schools tab has something to find.
    status: "inactive" as const,
  },
];

async function upsertSppgs(): Promise<Map<string, ISPPG>> {
  const docs = await Promise.all(
    SPPG_SEED.map(async (entry) =>
      must(
        await SPPG.findOneAndUpdate(
          { code: entry.code },
          { $setOnInsert: entry },
          { upsert: true, new: true },
        ).exec(),
        `SPPG ${entry.code}`,
      ),
    ),
  );
  return new Map(docs.map((doc) => [doc.code, doc]));
}

async function upsertSuppliers(): Promise<Map<string, ISupplier>> {
  const docs = await Promise.all(
    SUPPLIER_SEED.map(async (entry) =>
      must(
        await Supplier.findOneAndUpdate(
          { code: entry.code },
          { $setOnInsert: entry },
          { upsert: true, new: true },
        ).exec(),
        `Supplier ${entry.code}`,
      ),
    ),
  );
  return new Map(docs.map((doc) => [doc.code, doc]));
}

async function upsertSchools(): Promise<Map<string, ISchool>> {
  const docs = await Promise.all(
    SCHOOL_SEED.map(async (entry) =>
      must(
        await School.findOneAndUpdate(
          { code: entry.code },
          { $setOnInsert: entry },
          { upsert: true, new: true },
        ).exec(),
        `School ${entry.code}`,
      ),
    ),
  );
  return new Map(docs.map((doc) => [doc.code, doc]));
}

interface SeedUserInput {
  name: string;
  email: string;
  role: UserRole;
  organizationType: OrganizationType;
  organizationId?: Types.ObjectId;
}

async function upsertUsers(
  inputs: SeedUserInput[],
  passwordHash: string,
): Promise<Map<string, IUser>> {
  const docs = await Promise.all(
    inputs.map(async (input) =>
      must(
        await User.findOneAndUpdate(
          { email: input.email },
          { $setOnInsert: { ...input, passwordHash, isActive: true } },
          { upsert: true, new: true },
        ).exec(),
        `User ${input.email}`,
      ),
    ),
  );
  return new Map(docs.map((doc) => [doc.email, doc]));
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function main() {
  await connectDB();

  // --- Master data -------------------------------------------------------
  const [sppgs, suppliers, schools] = await Promise.all([
    upsertSppgs(),
    upsertSuppliers(),
    upsertSchools(),
  ]);

  const cempaka = must(sppgs.get("SPPG-CMP01"), "SPPG-CMP01");
  const melati = must(sppgs.get("SPPG-MLT02"), "SPPG-MLT02");
  const anggrek = must(sppgs.get("SPPG-ANG03"), "SPPG-ANG03");
  const dahlia = must(sppgs.get("SPPG-DHL04"), "SPPG-DHL04");

  const tani = must(suppliers.get("SUP-TANI01"), "SUP-TANI01");
  const ternak = must(suppliers.get("SUP-TERNAK02"), "SUP-TERNAK02");
  const laut = must(suppliers.get("SUP-LAUT03"), "SUP-LAUT03");
  const sayur = must(suppliers.get("SUP-SAYUR05"), "SUP-SAYUR05");

  const sdn01 = must(schools.get("SDN-01CKR"), "SDN-01CKR");
  const sdn02 = must(schools.get("SDN-02CKR"), "SDN-02CKR");
  const sdn05 = must(schools.get("SDN-05CKR"), "SDN-05CKR");
  const smpn01 = must(schools.get("SMPN-01CKR"), "SMPN-01CKR");
  const miAnnur = must(schools.get("MI-ANNUR06"), "MI-ANNUR06");
  const sdn03bks = must(schools.get("SDN-03BKS"), "SDN-03BKS");

  const passwordHash = await hashPassword(SEED_PASSWORD);
  const users = await upsertUsers(
    [
      {
        name: "Admin AMANGIZ",
        email: "admin@amangiz.test",
        role: "admin",
        organizationType: "system",
      },
      {
        name: "Operator SPPG Cempaka",
        email: "sppg.cempaka@amangiz.test",
        role: "sppg_operator",
        organizationType: "sppg",
        organizationId: cempaka._id,
      },
      {
        name: "Operator SDN 01 Cikarang",
        email: "sekolah.cikarang@amangiz.test",
        role: "school_operator",
        organizationType: "school",
        organizationId: sdn01._id,
      },
      {
        name: "Investigator AMANGIZ",
        email: "investigator@amangiz.test",
        role: "investigator",
        organizationType: "health_authority",
      },
      {
        name: "Operator SPPG Melati",
        email: "sppg.melati@amangiz.test",
        role: "sppg_operator",
        organizationType: "sppg",
        organizationId: melati._id,
      },
      {
        name: "Operator SMPN 1 Cikarang",
        email: "sekolah.smpn1@amangiz.test",
        role: "school_operator",
        organizationType: "school",
        organizationId: smpn01._id,
      },
      {
        name: "Operator SPPG Anggrek",
        email: "sppg.anggrek@amangiz.test",
        role: "sppg_operator",
        organizationType: "sppg",
        organizationId: anggrek._id,
      },
      {
        name: "Operator SPPG Dahlia",
        email: "sppg.dahlia@amangiz.test",
        role: "sppg_operator",
        organizationType: "sppg",
        organizationId: dahlia._id,
      },
      {
        name: "Operator SDN 01 Karawang",
        email: "sekolah.karawang@amangiz.test",
        role: "school_operator",
        organizationType: "school",
        organizationId: must(schools.get("SDN-01KRW"), "SDN-01KRW")._id,
      },
      {
        name: "Operator SDN 02 Depok",
        email: "sekolah.depok@amangiz.test",
        role: "school_operator",
        organizationType: "school",
        organizationId: must(schools.get("SDN-02DPK"), "SDN-02DPK")._id,
      },
      {
        name: "Investigator Wilayah Bekasi",
        email: "investigator.bekasi@amangiz.test",
        role: "investigator",
        organizationType: "health_authority",
      },
    ],
    passwordHash,
  );

  const admin = must(users.get("admin@amangiz.test"), "admin@amangiz.test");
  const opCempaka = must(
    users.get("sppg.cempaka@amangiz.test"),
    "sppg.cempaka@amangiz.test",
  );
  const opSdn01 = must(
    users.get("sekolah.cikarang@amangiz.test"),
    "sekolah.cikarang@amangiz.test",
  );
  const investigator = must(
    users.get("investigator@amangiz.test"),
    "investigator@amangiz.test",
  );
  const opMelati = must(
    users.get("sppg.melati@amangiz.test"),
    "sppg.melati@amangiz.test",
  );
  const opSmpn01 = must(
    users.get("sekolah.smpn1@amangiz.test"),
    "sekolah.smpn1@amangiz.test",
  );
  const opAnggrek = must(
    users.get("sppg.anggrek@amangiz.test"),
    "sppg.anggrek@amangiz.test",
  );
  const opDahlia = must(
    users.get("sppg.dahlia@amangiz.test"),
    "sppg.dahlia@amangiz.test",
  );
  const investigatorBekasi = must(
    users.get("investigator.bekasi@amangiz.test"),
    "investigator.bekasi@amangiz.test",
  );

  // --- Reset transactional data -----------------------------------------
  await Promise.all([
    FoodBatch.deleteMany({}).exec(),
    Distribution.deleteMany({}).exec(),
    Incident.deleteMany({}).exec(),
    RiskAssessment.deleteMany({}).exec(),
    Investigation.deleteMany({}).exec(),
    Notification.deleteMany({}).exec(),
    AuditLog.deleteMany({}).exec(),
  ]);

  const audits: Partial<IAuditLog>[] = [];
  const audit = (entry: {
    actorId: Types.ObjectId;
    action: string;
    resourceType: string;
    resourceId: Types.ObjectId;
    organizationId?: Types.ObjectId;
    createdAt: Date;
    metadata?: Record<string, unknown>;
  }) => audits.push(entry);

  // --- Batches -----------------------------------------------------------
  const ING = {
    rice: {
      supplierId: tani._id,
      ingredientName: "Beras Pandan Wangi",
      quantity: 40,
      unit: "kg",
      supplierBatchCode: "TANI-BR-0912",
    },
    chicken: {
      supplierId: ternak._id,
      ingredientName: "Ayam Potong Segar",
      quantity: 28,
      unit: "kg",
      supplierBatchCode: "TRN-AY-4471",
    },
    beef: {
      supplierId: ternak._id,
      ingredientName: "Daging Sapi Giling",
      quantity: 22,
      unit: "kg",
      supplierBatchCode: "TRN-SP-2210",
    },
    egg: {
      supplierId: ternak._id,
      ingredientName: "Telur Ayam Negeri",
      quantity: 300,
      unit: "butir",
      supplierBatchCode: "TRN-TL-8803",
    },
    fish: {
      supplierId: laut._id,
      ingredientName: "Ikan Tongkol",
      quantity: 25,
      unit: "kg",
      supplierBatchCode: "SMD-TK-1190",
    },
    spinach: {
      supplierId: sayur._id,
      ingredientName: "Bayam Hijau",
      quantity: 15,
      unit: "kg",
      supplierBatchCode: "KHL-BY-3321",
    },
    carrot: {
      supplierId: sayur._id,
      ingredientName: "Wortel",
      quantity: 12,
      unit: "kg",
      supplierBatchCode: "KHL-WR-3322",
    },
  };

  const safeTemps = (day: number) => [
    { value: 3.5, unit: "C" as const, recordedAt: ago(day, 5, 30) },
    { value: 4.2, unit: "C" as const, recordedAt: ago(day, 8, 0) },
  ];

  interface BatchSpec {
    batchCode: string;
    sppgId: Types.ObjectId;
    createdBy: Types.ObjectId;
    menuName: string;
    ingredients: (typeof ING)[keyof typeof ING][];
    productionDay: number;
    status: FoodBatchStatus;
    storageTemperature?: IFoodBatch["storageTemperature"];
    productionNotes?: string;
  }

  const batchSpecs: BatchSpec[] = [
    // The batch reserved for the live demo: danger-zone storage reading, clean
    // of any pre-existing incident so the score math in DEMO_SCENARIO.md holds.
    {
      batchCode: "BTH-DEMO-0001",
      sppgId: cempaka._id,
      createdBy: opCempaka._id,
      menuName: "Nasi Ayam Teriyaki + Tumis Buncis",
      ingredients: [ING.rice, ING.chicken, ING.carrot],
      productionDay: 1,
      status: "released",
      storageTemperature: [
        { value: 4.0, unit: "C", recordedAt: ago(1, 5, 0) },
        // 32°C sits inside the 5–60°C danger zone → triggers R-TEMP-STORAGE.
        { value: 32.0, unit: "C", recordedAt: ago(1, 10, 30) },
      ],
      productionNotes:
        "Pendingin ruang penyimpanan sempat mati saat pemadaman listrik pagi hari.",
    },
    {
      batchCode: "BTH-20261006-K7M2P",
      sppgId: cempaka._id,
      createdBy: opCempaka._id,
      menuName: "Nasi Ikan Tongkol Balado + Capcay",
      ingredients: [ING.rice, ING.fish, ING.carrot],
      productionDay: 2,
      status: "released",
      storageTemperature: safeTemps(2),
    },
    {
      batchCode: "BTH-20261005-Q4N8T",
      sppgId: cempaka._id,
      createdBy: opCempaka._id,
      menuName: "Nasi Telur Balado + Tumis Kangkung",
      ingredients: [ING.rice, ING.egg, ING.spinach],
      productionDay: 3,
      status: "released",
      storageTemperature: safeTemps(3),
    },
    {
      batchCode: "BTH-20261004-H9R3W",
      sppgId: cempaka._id,
      createdBy: opCempaka._id,
      menuName: "Nasi Semur Daging + Sayur Asem",
      ingredients: [ING.rice, ING.beef, ING.spinach],
      productionDay: 4,
      status: "on_hold",
      storageTemperature: [
        { value: 4.1, unit: "C", recordedAt: ago(4, 5, 0) },
        { value: 18.5, unit: "C", recordedAt: ago(4, 11, 0) },
      ],
      productionNotes: "Ditahan menunggu verifikasi catatan suhu penyimpanan.",
    },
    {
      batchCode: "BTH-20261003-X2L6V",
      sppgId: cempaka._id,
      createdBy: opCempaka._id,
      menuName: "Nasi Ayam Goreng Lengkuas + Sop Sayur",
      ingredients: [ING.rice, ING.chicken, ING.carrot],
      productionDay: 5,
      status: "recalled",
      storageTemperature: [
        { value: 24.0, unit: "C", recordedAt: ago(5, 9, 0) },
        { value: 27.5, unit: "C", recordedAt: ago(5, 12, 0) },
      ],
      productionNotes:
        "Recall setelah ditemukan penyimpangan suhu pada dua titik pemeriksaan.",
    },
    {
      batchCode: "BTH-20261002-B5J7C",
      sppgId: cempaka._id,
      createdBy: opCempaka._id,
      menuName: "Nasi Soto Ayam + Perkedel Kentang",
      ingredients: [ING.rice, ING.chicken],
      productionDay: 6,
      status: "completed",
      storageTemperature: safeTemps(6),
    },
    {
      batchCode: "BTH-20261001-M3D9F",
      sppgId: cempaka._id,
      createdBy: opCempaka._id,
      menuName: "Nasi Rendang Daging + Tumis Buncis",
      ingredients: [ING.rice, ING.beef, ING.carrot],
      productionDay: 7,
      status: "completed",
      storageTemperature: safeTemps(7),
    },
    {
      batchCode: "BTH-20260930-T8Y4K",
      sppgId: cempaka._id,
      createdBy: opCempaka._id,
      menuName: "Nasi Ikan Kembung Goreng + Lalapan",
      ingredients: [ING.rice, ING.fish, ING.spinach],
      productionDay: 9,
      status: "completed",
      storageTemperature: safeTemps(9),
    },
    {
      batchCode: "BTH-20260928-W6Z2N",
      sppgId: cempaka._id,
      createdBy: opCempaka._id,
      menuName: "Nasi Opor Ayam + Sayur Labu",
      ingredients: [ING.rice, ING.chicken, ING.carrot],
      productionDay: 12,
      status: "completed",
      storageTemperature: safeTemps(12),
    },
    // Fresh batches still moving through the pipeline.
    {
      batchCode: "BTH-20261011-P4C8H",
      sppgId: cempaka._id,
      createdBy: opCempaka._id,
      menuName: "Nasi Ayam Kecap + Tumis Bayam",
      ingredients: [ING.rice, ING.chicken, ING.spinach],
      productionDay: 0,
      status: "released",
      storageTemperature: [{ value: 3.8, unit: "C", recordedAt: today(5, 30) }],
    },
    {
      batchCode: "BTH-20261011-R9V3Q",
      sppgId: cempaka._id,
      createdBy: opCempaka._id,
      menuName: "Nasi Telur Dadar + Sup Wortel",
      ingredients: [ING.rice, ING.egg, ING.carrot],
      productionDay: 0,
      status: "prepared",
      storageTemperature: [{ value: 4.4, unit: "C", recordedAt: today(6, 0) }],
    },
    {
      batchCode: "BTH-20261011-G7S5L",
      sppgId: cempaka._id,
      createdBy: opCempaka._id,
      menuName: "Nasi Ikan Tuna Asam Manis + Capcay",
      ingredients: [ING.rice, ING.fish, ING.carrot],
      productionDay: 0,
      status: "draft",
    },
    // SPPG Melati — proves role scoping: the Cempaka operator must not see these.
    {
      batchCode: "BTH-20261010-N2F6D",
      sppgId: melati._id,
      createdBy: opMelati._id,
      menuName: "Nasi Ayam Bakar + Sayur Bening",
      ingredients: [ING.rice, ING.chicken, ING.spinach],
      productionDay: 1,
      status: "released",
      storageTemperature: safeTemps(1),
    },
    {
      batchCode: "BTH-20261008-A5K9X",
      sppgId: melati._id,
      createdBy: opMelati._id,
      menuName: "Nasi Bakso Sapi + Tumis Wortel",
      ingredients: [ING.rice, ING.beef, ING.carrot],
      productionDay: 3,
      status: "completed",
      storageTemperature: safeTemps(3),
    },
  ];

  // --- Bulk batches ------------------------------------------------------
  // The hand-written batches above carry the demo narrative. These fill the
  // tables out so pagination, status filters, and the dashboard counters are
  // exercised against realistic volume instead of a dozen rows.
  const kitchens = [
    { sppg: cempaka, operator: opCempaka, suffix: "CMP" },
    { sppg: melati, operator: opMelati, suffix: "MLT" },
    { sppg: anggrek, operator: opAnggrek, suffix: "ANG" },
    { sppg: dahlia, operator: opDahlia, suffix: "DHL" },
  ];

  const ingredientPool = Object.values(ING);

  /** Older batches have finished their lifecycle; today's are still moving. */
  function statusForAge(day: number): FoodBatchStatus {
    if (day === 0) return chance(0.5) ? "prepared" : "draft";
    if (day <= 2) return "released";
    if (day <= 6) return chance(0.45) ? "completed" : "released";
    return "completed";
  }

  let bulkSeq = 0;
  for (let day = 1; day <= 30; day++) {
    for (const kitchen of kitchens) {
      // Not every kitchen cooks every day — gaps look more like real records.
      if (chance(0.35)) continue;
      bulkSeq += 1;

      // A minority of batches get a reading inside the 5–60°C danger zone,
      // which is what gives the risk engine something to actually find later.
      const unsafe = chance(0.08);
      const temps = unsafe
        ? [
            { value: 4.1, unit: "C" as const, recordedAt: ago(day, 5, 0) },
            {
              value: randInt(14, 34),
              unit: "C" as const,
              recordedAt: ago(day, 11, 0),
            },
          ]
        : [
            {
              value: 3 + rng() * 2,
              unit: "C" as const,
              recordedAt: ago(day, 5, 30),
            },
            {
              value: 3.5 + rng() * 1.5,
              unit: "C" as const,
              recordedAt: ago(day, 8, 0),
            },
          ];

      let status = statusForAge(day);
      if (unsafe && chance(0.4)) status = chance(0.5) ? "on_hold" : "recalled";

      batchSpecs.push({
        batchCode: `BTH-${kitchen.suffix}-${String(1000 + bulkSeq)}`,
        sppgId: kitchen.sppg._id,
        createdBy: kitchen.operator._id,
        menuName: pick(MENU_POOL),
        ingredients: sample(ingredientPool, randInt(2, 4)),
        productionDay: day,
        status,
        storageTemperature: temps,
        productionNotes: unsafe
          ? "Catatan suhu penyimpanan menunjukkan lonjakan di luar batas aman."
          : undefined,
      });
    }
  }

  const batchDocs = await FoodBatch.insertMany(
    batchSpecs.map((spec) => ({
      batchCode: spec.batchCode,
      sppgId: spec.sppgId,
      ingredients: spec.ingredients,
      menuName: spec.menuName,
      productionDate: ago(spec.productionDay, 4, 0),
      expiryAt: ago(spec.productionDay - 1, 20, 0),
      storageTemperature: spec.storageTemperature,
      productionNotes: spec.productionNotes,
      status: spec.status,
      createdBy: spec.createdBy,
      createdAt: ago(spec.productionDay, 4, 0),
      updatedAt: ago(spec.productionDay, 12, 0),
    })),
    { timestamps: false },
  );

  const batchByCode = new Map(batchDocs.map((doc) => [doc.batchCode, doc]));
  const batchSpecByCode = new Map(
    batchSpecs.map((spec) => [spec.batchCode, spec]),
  );

  for (const doc of batchDocs) {
    const spec = must(batchSpecByCode.get(doc.batchCode), doc.batchCode);
    audit({
      actorId: spec.createdBy,
      action: "batch.create",
      resourceType: "FoodBatch",
      resourceId: doc._id,
      organizationId: doc.sppgId,
      createdAt: ago(spec.productionDay, 4, 5),
      metadata: { batchCode: doc.batchCode, menuName: doc.menuName },
    });
    if (spec.status === "on_hold" || spec.status === "recalled") {
      audit({
        actorId: admin._id,
        action: `batch.${spec.status === "on_hold" ? "hold" : "recall"}`,
        resourceType: "FoodBatch",
        resourceId: doc._id,
        organizationId: doc.sppgId,
        createdAt: ago(spec.productionDay, 13, 0),
        metadata: {
          batchCode: doc.batchCode,
          reason:
            spec.status === "on_hold"
              ? "Menunggu verifikasi catatan suhu penyimpanan"
              : "Penyimpangan suhu terkonfirmasi pada dua titik pemeriksaan",
        },
      });
    } else if (spec.status === "released") {
      audit({
        actorId: spec.createdBy,
        action: "batch.release",
        resourceType: "FoodBatch",
        resourceId: doc._id,
        organizationId: doc.sppgId,
        createdAt: ago(spec.productionDay, 6, 0),
        metadata: { batchCode: doc.batchCode },
      });
    }
  }

  // --- Distributions -----------------------------------------------------
  interface DistSpec {
    code: string;
    batchCode: string;
    schoolId: Types.ObjectId;
    sppgId: Types.ObjectId;
    createdBy: Types.ObjectId;
    quantity: number;
    day: number;
    status: DistributionStatus;
    scheduledHour?: number;
    dispatchedHour?: number;
    receivedHour?: number;
    dispatchTemperature?: number;
    receivedTemperature?: number;
    notes?: string;
  }

  const distSpecs: DistSpec[] = [
    // Reserved for the live demo. Dispatch temp is safe and both timing gaps
    // sit under the delay thresholds, so exactly one temperature rule fires.
    {
      code: "DST-DEMO-0001",
      batchCode: "BTH-DEMO-0001",
      schoolId: sdn01._id,
      sppgId: cempaka._id,
      createdBy: opCempaka._id,
      quantity: 320,
      day: 1,
      status: "delivered",
      scheduledHour: 7,
      dispatchedHour: 7.5,
      receivedHour: 9,
      dispatchTemperature: 4,
      receivedTemperature: 28,
      notes: "Pengiriman rutin makan siang.",
    },
    {
      code: "DST-DEMO-0002",
      batchCode: "BTH-DEMO-0001",
      schoolId: sdn02._id,
      sppgId: cempaka._id,
      createdBy: opCempaka._id,
      quantity: 275,
      day: 1,
      status: "delivered",
      scheduledHour: 7,
      dispatchedHour: 7.5,
      receivedHour: 9.5,
      dispatchTemperature: 4.2,
      receivedTemperature: 4.5,
    },
    {
      code: "DST-DEMO-0003",
      batchCode: "BTH-DEMO-0001",
      schoolId: miAnnur._id,
      sppgId: cempaka._id,
      createdBy: opCempaka._id,
      quantity: 180,
      day: 1,
      status: "delivered",
      scheduledHour: 7,
      dispatchedHour: 8,
      receivedHour: 10,
      dispatchTemperature: 4.1,
      receivedTemperature: 4.7,
    },
    // Today — drives the "Distribusi Hari Ini" dashboard card.
    {
      code: "DST-20261011-A1B2C",
      batchCode: "BTH-20261011-P4C8H",
      schoolId: sdn01._id,
      sppgId: cempaka._id,
      createdBy: opCempaka._id,
      quantity: 320,
      day: 0,
      status: "delivered",
      scheduledHour: 7,
      dispatchedHour: 7.25,
      receivedHour: 8.75,
      dispatchTemperature: 3.9,
      receivedTemperature: 4.0,
    },
    {
      code: "DST-20261011-D3E4F",
      batchCode: "BTH-20261011-P4C8H",
      schoolId: smpn01._id,
      sppgId: cempaka._id,
      createdBy: opCempaka._id,
      quantity: 520,
      day: 0,
      status: "in_transit",
      scheduledHour: 7,
      dispatchedHour: 7.5,
      dispatchTemperature: 4.0,
    },
    {
      code: "DST-20261011-G5H6J",
      batchCode: "BTH-20261011-P4C8H",
      schoolId: sdn05._id,
      sppgId: cempaka._id,
      createdBy: opCempaka._id,
      quantity: 410,
      day: 0,
      status: "dispatched",
      scheduledHour: 8,
      dispatchedHour: 8.5,
      dispatchTemperature: 4.3,
    },
    {
      code: "DST-20261011-K7L8M",
      batchCode: "BTH-20261011-R9V3Q",
      schoolId: miAnnur._id,
      sppgId: cempaka._id,
      createdBy: opCempaka._id,
      quantity: 180,
      day: 0,
      status: "planned",
      scheduledHour: 11,
    },
    {
      code: "DST-20261011-N9P1Q",
      batchCode: "BTH-20261011-R9V3Q",
      schoolId: sdn02._id,
      sppgId: cempaka._id,
      createdBy: opCempaka._id,
      quantity: 275,
      day: 0,
      status: "planned",
      scheduledHour: 11,
    },
    // Recent history.
    {
      code: "DST-20261009-R2S3T",
      batchCode: "BTH-20261006-K7M2P",
      schoolId: sdn01._id,
      sppgId: cempaka._id,
      createdBy: opCempaka._id,
      quantity: 320,
      day: 2,
      status: "delivered",
      scheduledHour: 7,
      dispatchedHour: 7.5,
      receivedHour: 9,
      dispatchTemperature: 4.0,
      receivedTemperature: 4.5,
    },
    {
      code: "DST-20261009-U4V5W",
      batchCode: "BTH-20261006-K7M2P",
      schoolId: smpn01._id,
      sppgId: cempaka._id,
      createdBy: opCempaka._id,
      quantity: 520,
      day: 2,
      status: "delayed",
      scheduledHour: 7,
      dispatchedHour: 11,
      receivedHour: 14,
      dispatchTemperature: 4.2,
      receivedTemperature: 21.0,
      notes: "Kendaraan pengantar mengalami kerusakan di perjalanan.",
    },
    {
      code: "DST-20261009-X6Y7Z",
      batchCode: "BTH-20261006-K7M2P",
      schoolId: sdn05._id,
      sppgId: cempaka._id,
      createdBy: opCempaka._id,
      quantity: 410,
      day: 2,
      status: "delivered",
      scheduledHour: 7,
      dispatchedHour: 7.75,
      receivedHour: 9.5,
      dispatchTemperature: 4.4,
      receivedTemperature: 4.0,
    },
    {
      code: "DST-20261008-B8C9D",
      batchCode: "BTH-20261005-Q4N8T",
      schoolId: sdn01._id,
      sppgId: cempaka._id,
      createdBy: opCempaka._id,
      quantity: 320,
      day: 3,
      status: "delivered",
      scheduledHour: 7,
      dispatchedHour: 7.5,
      receivedHour: 9,
      dispatchTemperature: 3.9,
      receivedTemperature: 4.2,
    },
    {
      code: "DST-20261008-E1F2G",
      batchCode: "BTH-20261005-Q4N8T",
      schoolId: sdn02._id,
      sppgId: cempaka._id,
      createdBy: opCempaka._id,
      quantity: 275,
      day: 3,
      status: "delivered",
      scheduledHour: 7,
      dispatchedHour: 7.5,
      receivedHour: 9.25,
      dispatchTemperature: 4.0,
      receivedTemperature: 4.8,
    },
    {
      code: "DST-20261008-H3J4K",
      batchCode: "BTH-20261005-Q4N8T",
      schoolId: miAnnur._id,
      sppgId: cempaka._id,
      createdBy: opCempaka._id,
      quantity: 180,
      day: 3,
      status: "delayed",
      scheduledHour: 7,
      dispatchedHour: 10.5,
      dispatchTemperature: 4.1,
      notes: "Akses jalan tertutup kegiatan sekolah.",
    },
    {
      code: "DST-20261007-L5M6N",
      batchCode: "BTH-20261004-H9R3W",
      schoolId: sdn01._id,
      sppgId: cempaka._id,
      createdBy: opCempaka._id,
      quantity: 320,
      day: 4,
      status: "delivered",
      scheduledHour: 7,
      dispatchedHour: 7.5,
      receivedHour: 9,
      dispatchTemperature: 4.0,
      receivedTemperature: 16.5,
    },
    {
      code: "DST-20261007-P7Q8R",
      batchCode: "BTH-20261004-H9R3W",
      schoolId: sdn05._id,
      sppgId: cempaka._id,
      createdBy: opCempaka._id,
      quantity: 410,
      day: 4,
      status: "cancelled",
      scheduledHour: 7,
      notes: "Dibatalkan karena batch ditahan sebelum keberangkatan.",
    },
    {
      code: "DST-20261006-S9T1U",
      batchCode: "BTH-20261003-X2L6V",
      schoolId: smpn01._id,
      sppgId: cempaka._id,
      createdBy: opCempaka._id,
      quantity: 520,
      day: 5,
      status: "delivered",
      scheduledHour: 7,
      dispatchedHour: 8,
      receivedHour: 13,
      dispatchTemperature: 19.0,
      receivedTemperature: 26.0,
      notes: "Perjalanan tertahan kemacetan panjang.",
    },
    {
      code: "DST-20261006-V2W3X",
      batchCode: "BTH-20261003-X2L6V",
      schoolId: sdn02._id,
      sppgId: cempaka._id,
      createdBy: opCempaka._id,
      quantity: 275,
      day: 5,
      status: "delivered",
      scheduledHour: 7,
      dispatchedHour: 7.5,
      receivedHour: 9.5,
      dispatchTemperature: 17.5,
      receivedTemperature: 23.0,
    },
    {
      code: "DST-20261005-Y4Z5A",
      batchCode: "BTH-20261002-B5J7C",
      schoolId: sdn01._id,
      sppgId: cempaka._id,
      createdBy: opCempaka._id,
      quantity: 320,
      day: 6,
      status: "delivered",
      scheduledHour: 7,
      dispatchedHour: 7.5,
      receivedHour: 9,
      dispatchTemperature: 4.0,
      receivedTemperature: 4.5,
    },
    {
      code: "DST-20261005-B6C7D",
      batchCode: "BTH-20261002-B5J7C",
      schoolId: miAnnur._id,
      sppgId: cempaka._id,
      createdBy: opCempaka._id,
      quantity: 180,
      day: 6,
      status: "delivered",
      scheduledHour: 7,
      dispatchedHour: 7.5,
      receivedHour: 9.25,
      dispatchTemperature: 4.2,
      receivedTemperature: 4.1,
    },
    {
      code: "DST-20261004-E8F9G",
      batchCode: "BTH-20261001-M3D9F",
      schoolId: sdn01._id,
      sppgId: cempaka._id,
      createdBy: opCempaka._id,
      quantity: 320,
      day: 7,
      status: "delivered",
      scheduledHour: 7,
      dispatchedHour: 7.5,
      receivedHour: 9,
      dispatchTemperature: 3.8,
      receivedTemperature: 4.0,
    },
    {
      code: "DST-20261004-H1J2K",
      batchCode: "BTH-20261001-M3D9F",
      schoolId: smpn01._id,
      sppgId: cempaka._id,
      createdBy: opCempaka._id,
      quantity: 520,
      day: 7,
      status: "delivered",
      scheduledHour: 7,
      dispatchedHour: 7.75,
      receivedHour: 9.5,
      dispatchTemperature: 4.1,
      receivedTemperature: 4.9,
    },
    {
      code: "DST-20261002-L3M4N",
      batchCode: "BTH-20260930-T8Y4K",
      schoolId: sdn01._id,
      sppgId: cempaka._id,
      createdBy: opCempaka._id,
      quantity: 320,
      day: 9,
      status: "delivered",
      scheduledHour: 7,
      dispatchedHour: 7.5,
      receivedHour: 9,
      dispatchTemperature: 4.0,
      receivedTemperature: 4.4,
    },
    {
      code: "DST-20261002-P5Q6R",
      batchCode: "BTH-20260930-T8Y4K",
      schoolId: sdn05._id,
      sppgId: cempaka._id,
      createdBy: opCempaka._id,
      quantity: 410,
      day: 9,
      status: "delayed",
      scheduledHour: 7,
      dispatchedHour: 10,
      receivedHour: 12.5,
      dispatchTemperature: 4.3,
      receivedTemperature: 19.5,
    },
    {
      code: "DST-20260929-S7T8U",
      batchCode: "BTH-20260928-W6Z2N",
      schoolId: sdn01._id,
      sppgId: cempaka._id,
      createdBy: opCempaka._id,
      quantity: 320,
      day: 12,
      status: "delivered",
      scheduledHour: 7,
      dispatchedHour: 7.5,
      receivedHour: 9,
      dispatchTemperature: 3.9,
      receivedTemperature: 4.1,
    },
    {
      code: "DST-20260929-V9W1X",
      batchCode: "BTH-20260928-W6Z2N",
      schoolId: sdn02._id,
      sppgId: cempaka._id,
      createdBy: opCempaka._id,
      quantity: 275,
      day: 12,
      status: "delivered",
      scheduledHour: 7,
      dispatchedHour: 7.5,
      receivedHour: 9.25,
      dispatchTemperature: 4.0,
      receivedTemperature: 4.6,
    },
    // SPPG Melati deliveries.
    {
      code: "DST-20261010-Y2Z3A",
      batchCode: "BTH-20261010-N2F6D",
      schoolId: sdn03bks._id,
      sppgId: melati._id,
      createdBy: opMelati._id,
      quantity: 295,
      day: 1,
      status: "delivered",
      scheduledHour: 7,
      dispatchedHour: 7.5,
      receivedHour: 9,
      dispatchTemperature: 4.0,
      receivedTemperature: 4.3,
    },
    {
      code: "DST-20261008-B4C5D",
      batchCode: "BTH-20261008-A5K9X",
      schoolId: sdn03bks._id,
      sppgId: melati._id,
      createdBy: opMelati._id,
      quantity: 295,
      day: 3,
      status: "delivered",
      scheduledHour: 7,
      dispatchedHour: 7.5,
      receivedHour: 9,
      dispatchTemperature: 4.1,
      receivedTemperature: 4.7,
    },
  ];

  // --- Bulk distributions ------------------------------------------------
  // Each kitchen serves the schools in its own city, so the traceability chain
  // and the per-organization scoping both stay geographically plausible.
  const schoolsBySppg = new Map<string, ISchool[]>([
    [
      String(cempaka._id),
      ["SDN-01CKR", "SDN-02CKR", "SDN-05CKR", "SMPN-01CKR", "MI-ANNUR06"].map(
        (code) => must(schools.get(code), code),
      ),
    ],
    [
      String(melati._id),
      ["SDN-03BKS", "SDN-07BKS", "SMPN-02BKS"].map((code) =>
        must(schools.get(code), code),
      ),
    ],
    [
      String(anggrek._id),
      ["SDN-01KRW", "SDN-04KRW", "SMPN-01KRW", "MI-HIDAYAH11"].map((code) =>
        must(schools.get(code), code),
      ),
    ],
    [
      String(dahlia._id),
      ["SDN-02DPK", "SDN-06DPK", "SMAN-01DPK"].map((code) =>
        must(schools.get(code), code),
      ),
    ],
  ]);

  const bulkBatchSpecs = batchSpecs.filter(
    (spec) =>
      spec.batchCode.startsWith("BTH-CMP-") ||
      spec.batchCode.startsWith("BTH-MLT-") ||
      spec.batchCode.startsWith("BTH-ANG-") ||
      spec.batchCode.startsWith("BTH-DHL-"),
  );

  let distSeq = 0;
  for (const batch of bulkBatchSpecs) {
    // A drafted batch has not been handed to distribution yet.
    if (batch.status === "draft") continue;

    const candidates = must(
      schoolsBySppg.get(String(batch.sppgId)),
      `schools for SPPG ${String(batch.sppgId)}`,
    );
    const targets = sample(candidates, randInt(2, candidates.length));
    const day = batch.productionDay;

    for (const school of targets) {
      distSeq += 1;
      const scheduledHour = pick([7, 7.5, 8]);
      const late = chance(0.1);
      const cancelled = batch.status === "recalled" && chance(0.35);

      // Warm food on arrival usually traces back to a slow trip, so the two
      // are correlated rather than drawn independently.
      const dispatchedHour = scheduledHour + (late ? 3 + rng() * 2 : rng());
      const transitHours = late ? 3 + rng() * 2.5 : 1 + rng();
      const receivedHour = dispatchedHour + transitHours;
      const warmOnArrival = late ? chance(0.45) : chance(0.03);

      let status: DistributionStatus;
      if (cancelled) status = "cancelled";
      else if (late) status = "delayed";
      else status = "delivered";

      const delivered = status === "delivered" || status === "delayed";

      distSpecs.push({
        code: `DST-${String(batch.batchCode).slice(4, 7)}-${String(2000 + distSeq)}`,
        batchCode: batch.batchCode,
        schoolId: school._id,
        sppgId: batch.sppgId,
        createdBy: batch.createdBy,
        quantity: school.recipientCapacity ?? 250,
        day,
        status,
        scheduledHour,
        dispatchedHour: cancelled ? undefined : dispatchedHour,
        receivedHour: delivered ? receivedHour : undefined,
        dispatchTemperature: cancelled
          ? undefined
          : Number((3.5 + rng() * 1.5).toFixed(1)),
        receivedTemperature: delivered
          ? warmOnArrival
            ? randInt(16, 29)
            : // Must stay at or below 5°C: the engine's danger zone is
              // everything above 5, so a "safe" reading drawn any higher
              // would silently trigger the temperature rule.
              Number((2.5 + rng() * 2.3).toFixed(1))
          : undefined,
        notes: cancelled
          ? "Dibatalkan menyusul penarikan batch terkait."
          : late
            ? pick([
                "Keberangkatan tertunda karena armada terlambat kembali dari rute sebelumnya.",
                "Perjalanan tertahan kemacetan panjang di jalur utama.",
                "Akses jalan menuju sekolah tertutup kegiatan setempat.",
              ])
            : undefined,
      });
    }
  }

  const hourToDate = (day: number, hour: number): Date => {
    const whole = Math.floor(hour);
    return ago(day, whole, Math.round((hour - whole) * 60));
  };

  const distDocs = await Distribution.insertMany(
    distSpecs.map((spec) => ({
      distributionCode: spec.code,
      batchId: must(batchByCode.get(spec.batchCode), spec.batchCode)._id,
      sppgId: spec.sppgId,
      schoolId: spec.schoolId,
      quantity: spec.quantity,
      unit: "porsi",
      scheduledAt:
        spec.scheduledHour === undefined
          ? undefined
          : hourToDate(spec.day, spec.scheduledHour),
      dispatchedAt:
        spec.dispatchedHour === undefined
          ? undefined
          : hourToDate(spec.day, spec.dispatchedHour),
      receivedAt:
        spec.receivedHour === undefined
          ? undefined
          : hourToDate(spec.day, spec.receivedHour),
      dispatchTemperature: spec.dispatchTemperature,
      receivedTemperature: spec.receivedTemperature,
      status: spec.status,
      notes: spec.notes,
      createdBy: spec.createdBy,
      createdAt: hourToDate(spec.day, spec.scheduledHour ?? 6),
      updatedAt: hourToDate(
        spec.day,
        spec.receivedHour ?? spec.dispatchedHour ?? spec.scheduledHour ?? 6,
      ),
    })),
    { timestamps: false },
  );

  const distByCode = new Map(
    distDocs.map((doc) => [doc.distributionCode, doc]),
  );

  for (const doc of distDocs) {
    const spec = must(
      distSpecs.find((s) => s.code === doc.distributionCode),
      doc.distributionCode,
    );
    audit({
      actorId: spec.createdBy,
      action: "distribution.create",
      resourceType: "Distribution",
      resourceId: doc._id,
      organizationId: spec.sppgId,
      createdAt: hourToDate(spec.day, (spec.scheduledHour ?? 6) - 0.5),
      metadata: { distributionCode: doc.distributionCode },
    });
    if (spec.dispatchedHour !== undefined) {
      audit({
        actorId: spec.createdBy,
        action: "distribution.dispatch",
        resourceType: "Distribution",
        resourceId: doc._id,
        organizationId: spec.sppgId,
        createdAt: hourToDate(spec.day, spec.dispatchedHour),
        metadata: {
          distributionCode: doc.distributionCode,
          dispatchTemperature: spec.dispatchTemperature,
        },
      });
    }
    if (spec.receivedHour !== undefined) {
      audit({
        actorId: spec.schoolId.equals(sdn01._id)
          ? opSdn01._id
          : spec.schoolId.equals(smpn01._id)
            ? opSmpn01._id
            : spec.createdBy,
        action: "distribution.receive",
        resourceType: "Distribution",
        resourceId: doc._id,
        organizationId: spec.sppgId,
        createdAt: hourToDate(spec.day, spec.receivedHour),
        metadata: {
          distributionCode: doc.distributionCode,
          receivedTemperature: spec.receivedTemperature,
        },
      });
    }
  }

  // --- Incidents ---------------------------------------------------------
  interface IncidentSpec {
    code: string;
    title: string;
    description: string;
    type: IncidentType;
    batchCode?: string;
    distCode?: string;
    schoolId?: Types.ObjectId;
    sppgId?: Types.ObjectId;
    reportedBy: Types.ObjectId;
    day: number;
    affected?: number;
    symptoms?: string[];
    evidenceCount: number;
    severity: IncidentSeverity;
    status: IncidentStatus;
    assignedTo?: Types.ObjectId;
    resolutionSummary?: string;
  }

  const incidentSpecs: IncidentSpec[] = [
    {
      code: "INC-20261009-T4R8M",
      title: "Beberapa siswa mengeluh mual setelah makan siang",
      description:
        "Wali kelas melaporkan sejumlah siswa mengeluh mual dan pusing sekitar dua jam setelah makan siang. Siswa yang terdampak sudah ditangani UKS sekolah.",
      type: "suspected_food_safety",
      batchCode: "BTH-20261006-K7M2P",
      distCode: "DST-20261009-U4V5W",
      schoolId: smpn01._id,
      sppgId: cempaka._id,
      reportedBy: opSmpn01._id,
      day: 2,
      affected: 23,
      symptoms: ["mual", "pusing", "nyeri perut"],
      evidenceCount: 2,
      severity: "high",
      status: "under_investigation",
      assignedTo: investigator._id,
    },
    {
      code: "INC-20261006-W9K2P",
      title: "Suhu makanan saat diterima di luar batas aman",
      description:
        "Petugas sekolah mencatat suhu makanan 26°C saat serah terima, jauh di atas batas yang ditetapkan. Pengiriman tertahan kemacetan panjang.",
      type: "temperature_violation",
      batchCode: "BTH-20261003-X2L6V",
      distCode: "DST-20261006-S9T1U",
      schoolId: smpn01._id,
      sppgId: cempaka._id,
      reportedBy: opSmpn01._id,
      day: 5,
      affected: 6,
      symptoms: ["nyeri perut"],
      evidenceCount: 3,
      severity: "high",
      status: "under_investigation",
      assignedTo: investigator._id,
    },
    {
      code: "INC-20261007-L3N6V",
      title: "Catatan suhu penyimpanan batch tidak lengkap",
      description:
        "Saat audit internal ditemukan catatan suhu penyimpanan hanya terisi sebagian pada hari produksi. Batch ditahan untuk verifikasi.",
      type: "temperature_violation",
      batchCode: "BTH-20261004-H9R3W",
      distCode: "DST-20261007-L5M6N",
      schoolId: sdn01._id,
      sppgId: cempaka._id,
      reportedBy: opCempaka._id,
      day: 4,
      affected: 0,
      evidenceCount: 1,
      severity: "medium",
      status: "containment_in_progress",
    },
    {
      code: "INC-20261010-C7D1F",
      title: "Kemasan makanan rusak saat diterima",
      description:
        "Sebagian kemasan ditemukan penyok dan tidak tertutup rapat saat serah terima. Porsi yang terdampak tidak dibagikan ke siswa.",
      type: "packaging_issue",
      // Deliberately the same batch as INC-20261009-T4R8M so the
      // "other incidents on the same batch" rule actually fires somewhere in
      // the seeded data. BTH-DEMO-0001 is kept free of incidents so the live
      // demo's score stays additive and predictable (docs/DEMO_SCENARIO.md §5).
      batchCode: "BTH-20261006-K7M2P",
      distCode: "DST-20261009-X6Y7Z",
      schoolId: sdn05._id,
      sppgId: cempaka._id,
      reportedBy: opCempaka._id,
      day: 2,
      affected: 0,
      evidenceCount: 2,
      severity: "low",
      status: "triaged",
    },
    {
      code: "INC-20261011-H2J5K",
      title: "Pengiriman terlambat lebih dari tiga jam",
      description:
        "Pengiriman ke sekolah tertunda karena akses jalan tertutup kegiatan sekolah. Makanan belum dikonfirmasi diterima sampai laporan dibuat.",
      type: "distribution_issue",
      batchCode: "BTH-20261005-Q4N8T",
      distCode: "DST-20261008-H3J4K",
      schoolId: miAnnur._id,
      sppgId: cempaka._id,
      reportedBy: opCempaka._id,
      day: 3,
      affected: 0,
      evidenceCount: 0,
      severity: "medium",
      status: "reported",
    },
    {
      code: "INC-20261003-M8P3Q",
      title: "Dua siswa mengeluh gatal setelah makan siang",
      description:
        "Dua siswa melaporkan gatal pada kulit setelah makan siang. Riwayat alergi sedang dikonfirmasi ke orang tua siswa.",
      type: "suspected_food_safety",
      batchCode: "BTH-20261002-B5J7C",
      distCode: "DST-20261005-Y4Z5A",
      schoolId: sdn01._id,
      sppgId: cempaka._id,
      reportedBy: opSdn01._id,
      day: 6,
      affected: 2,
      symptoms: ["gatal"],
      evidenceCount: 1,
      severity: "low",
      status: "resolved",
      assignedTo: investigator._id,
      resolutionSummary:
        "Tidak ditemukan penyimpangan penanganan pada batch terkait. Sekolah diminta melengkapi data riwayat alergi siswa penerima.",
    },
    {
      code: "INC-20261002-R5S9T",
      title: "Laporan rasa makanan tidak seperti biasanya",
      description:
        "Beberapa siswa menyampaikan rasa lauk berbeda dari biasanya. Tidak ada keluhan kesehatan yang menyertai.",
      type: "other",
      batchCode: "BTH-20261001-M3D9F",
      distCode: "DST-20261004-E8F9G",
      schoolId: sdn01._id,
      sppgId: cempaka._id,
      reportedBy: opSdn01._id,
      day: 7,
      affected: 0,
      evidenceCount: 0,
      severity: "low",
      status: "closed",
      assignedTo: investigator._id,
      resolutionSummary:
        "Perbedaan rasa berasal dari penyesuaian resep yang sudah disetujui. Tidak ada tindakan lanjutan yang diperlukan.",
    },
    {
      code: "INC-20260930-U1V4W",
      title: "Suhu saat diterima di atas batas pada satu pengiriman",
      description:
        "Catatan serah terima menunjukkan suhu 19,5°C. Pengiriman sempat tertunda tiga jam dari jadwal.",
      type: "temperature_violation",
      batchCode: "BTH-20260930-T8Y4K",
      distCode: "DST-20261002-P5Q6R",
      schoolId: sdn05._id,
      sppgId: cempaka._id,
      reportedBy: opCempaka._id,
      day: 9,
      affected: 0,
      evidenceCount: 2,
      severity: "medium",
      status: "closed",
      assignedTo: investigator._id,
      resolutionSummary:
        "Penyebab keterlambatan terdokumentasi. Prosedur penjadwalan armada diperbarui dan disosialisasikan ke petugas.",
    },
    {
      code: "INC-20260928-X3Y7Z",
      title: "Jumlah porsi diterima kurang dari surat jalan",
      description:
        "Sekolah menerima 265 porsi dari 275 porsi yang tercatat di surat jalan. Selisih sudah dikonfirmasi ke petugas distribusi.",
      type: "distribution_issue",
      batchCode: "BTH-20260928-W6Z2N",
      distCode: "DST-20260929-V9W1X",
      schoolId: sdn02._id,
      sppgId: cempaka._id,
      reportedBy: opCempaka._id,
      day: 12,
      affected: 0,
      evidenceCount: 1,
      severity: "low",
      status: "closed",
      assignedTo: investigator._id,
      resolutionSummary:
        "Selisih berasal dari kesalahan pencatatan saat pemuatan. Prosedur penghitungan ganda diterapkan sebelum keberangkatan.",
    },
    {
      code: "INC-20261010-A6B2C",
      title: "Keluhan perut tidak nyaman di SPPG Melati",
      description:
        "Operator sekolah melaporkan beberapa siswa mengeluh perut tidak nyaman. Sedang dikonfirmasi apakah terkait makan siang.",
      type: "suspected_food_safety",
      batchCode: "BTH-20261010-N2F6D",
      distCode: "DST-20261010-Y2Z3A",
      schoolId: sdn03bks._id,
      sppgId: melati._id,
      reportedBy: opMelati._id,
      day: 1,
      affected: 7,
      symptoms: ["nyeri perut"],
      evidenceCount: 1,
      severity: "medium",
      status: "triaged",
    },
  ];

  // --- Bulk incidents ----------------------------------------------------
  // Grown out of distributions that actually went wrong, so every generated
  // report has a traceable cause sitting in the data behind it rather than
  // being a free-floating row.
  const schoolOperatorBySchool = new Map<string, Types.ObjectId>([
    [String(sdn01._id), opSdn01._id],
    [String(smpn01._id), opSmpn01._id],
    [
      String(must(schools.get("SDN-01KRW"), "SDN-01KRW")._id),
      must(
        users.get("sekolah.karawang@amangiz.test"),
        "sekolah.karawang@amangiz.test",
      )._id,
    ],
    [
      String(must(schools.get("SDN-02DPK"), "SDN-02DPK")._id),
      must(
        users.get("sekolah.depok@amangiz.test"),
        "sekolah.depok@amangiz.test",
      )._id,
    ],
  ]);

  const operatorBySppg = new Map<string, Types.ObjectId>([
    [String(cempaka._id), opCempaka._id],
    [String(melati._id), opMelati._id],
    [String(anggrek._id), opAnggrek._id],
    [String(dahlia._id), opDahlia._id],
  ]);

  const SYMPTOM_POOL = [
    "mual",
    "pusing",
    "nyeri perut",
    "muntah",
    "lemas",
    "demam ringan",
  ] as const;

  interface IncidentTemplate {
    type: IncidentType;
    title: string;
    description: string;
    withSymptoms: boolean;
  }

  const WARM_TEMPLATES: IncidentTemplate[] = [
    {
      type: "temperature_violation",
      title: "Suhu makanan saat diterima melewati batas aman",
      description:
        "Petugas sekolah mencatat suhu makanan di atas batas yang ditetapkan saat serah terima. Pengiriman sempat tertahan di perjalanan.",
      withSymptoms: false,
    },
    {
      type: "suspected_food_safety",
      title: "Sejumlah siswa mengeluh tidak enak badan setelah makan siang",
      description:
        "Wali kelas melaporkan beberapa siswa mengeluh tidak enak badan beberapa jam setelah makan siang. Penanganan awal dilakukan oleh UKS sekolah.",
      withSymptoms: true,
    },
  ];

  const DELAY_TEMPLATES: IncidentTemplate[] = [
    {
      type: "distribution_issue",
      title: "Pengiriman tiba jauh melewati jadwal",
      description:
        "Makanan tiba di sekolah jauh melewati jadwal yang ditetapkan sehingga pembagian harus diundur.",
      withSymptoms: false,
    },
    {
      type: "distribution_issue",
      title: "Jadwal distribusi tidak sesuai surat jalan",
      description:
        "Waktu keberangkatan dan penerimaan yang tercatat tidak sesuai dengan jadwal pada surat jalan.",
      withSymptoms: false,
    },
  ];

  const MISC_TEMPLATES: IncidentTemplate[] = [
    {
      type: "packaging_issue",
      title: "Kemasan makanan rusak saat diterima",
      description:
        "Sebagian kemasan ditemukan penyok dan tidak tertutup rapat. Porsi yang terdampak tidak dibagikan ke siswa.",
      withSymptoms: false,
    },
    {
      type: "distribution_issue",
      title: "Jumlah porsi diterima kurang dari surat jalan",
      description:
        "Jumlah porsi yang diterima sekolah lebih sedikit dari yang tercatat pada surat jalan. Selisih sudah dikonfirmasi ke petugas distribusi.",
      withSymptoms: false,
    },
    {
      type: "other",
      title: "Laporan rasa makanan berbeda dari biasanya",
      description:
        "Beberapa siswa menyampaikan rasa lauk berbeda dari biasanya. Tidak ada keluhan kesehatan yang menyertai.",
      withSymptoms: false,
    },
  ];

  /** Older cases have had time to close; recent ones are still moving. */
  function incidentStatusForAge(day: number): IncidentStatus {
    if (day <= 1) return pick(["reported", "triaged"]);
    if (day <= 4)
      return pick([
        "triaged",
        "under_investigation",
        "containment_in_progress",
      ]);
    if (day <= 10) return pick(["under_investigation", "resolved"]);
    return pick(["resolved", "closed", "closed"]);
  }

  const bulkDistSpecs = distSpecs.filter((spec) =>
    /^DST-(CMP|MLT|ANG|DHL)-/.test(spec.code),
  );

  let incidentSeq = 0;
  for (const dist of bulkDistSpecs) {
    const warm =
      dist.receivedTemperature !== undefined &&
      dist.receivedTemperature > 5 &&
      dist.receivedTemperature < 60;
    const delayed = dist.status === "delayed";

    // Most problem deliveries get reported; a small share of clean ones do
    // too. Rates kept low on purpose — the vast majority of deliveries in a
    // working programme pass without an incident, and a seed where most of
    // them generate one would misrepresent what the dashboard normally shows.
    const reported = warm ? chance(0.7) : delayed ? chance(0.5) : chance(0.07);
    if (!reported) continue;

    incidentSeq += 1;
    const template = warm
      ? pick(WARM_TEMPLATES)
      : delayed
        ? pick(DELAY_TEMPLATES)
        : pick(MISC_TEMPLATES);

    const status = incidentStatusForAge(dist.day);
    const assigned =
      status === "under_investigation" ||
      status === "resolved" ||
      status === "closed";
    const affected = template.withSymptoms ? reportedAffected() : randInt(0, 2);
    const reporter =
      schoolOperatorBySchool.get(String(dist.schoolId)) ??
      must(
        operatorBySppg.get(String(dist.sppgId)),
        `operator for SPPG ${String(dist.sppgId)}`,
      );

    incidentSpecs.push({
      code: `INC-BULK-${String(3000 + incidentSeq)}`,
      title: template.title,
      description: template.description,
      type: template.type,
      batchCode: dist.batchCode,
      distCode: dist.code,
      schoolId: dist.schoolId,
      sppgId: dist.sppgId,
      reportedBy: reporter,
      day: dist.day,
      affected,
      symptoms: template.withSymptoms
        ? sample(SYMPTOM_POOL, randInt(1, 3))
        : undefined,
      evidenceCount: randInt(0, 3),
      // The officer's own triage call, which is intentionally a separate field
      // from the engine's level (PRD 6.4 #4) — so it tracks reported impact
      // loosely rather than mirroring the score.
      severity:
        status === "reported"
          ? "unassessed"
          : affected >= 20
            ? "critical"
            : affected >= 9
              ? "high"
              : affected >= 3
                ? "medium"
                : "low",
      status,
      assignedTo: assigned
        ? pick([investigator._id, investigatorBekasi._id])
        : undefined,
      resolutionSummary:
        status === "resolved" || status === "closed"
          ? pick([
              "Penanganan batch dan distribusi ditinjau ulang. Prosedur terkait diperbarui dan disosialisasikan ke petugas.",
              "Tidak ditemukan penyimpangan prosedur pada batch terkait. Pencatatan dilengkapi untuk peninjauan berikutnya.",
              "Penyebab operasional teridentifikasi dan tindakan korektif telah diselesaikan oleh unit terkait.",
            ])
          : undefined,
    });
  }

  const evidenceStub = (count: number, day: number) =>
    Array.from({ length: count }, (_, index) => ({
      // Placeholder host: these are seed rows, not real uploads. Kept obviously
      // fake so nobody mistakes them for genuine evidence (PRD 7.11).
      url: `https://placehold.co/800x600/0f766e/ffffff?text=Bukti+${index + 1}`,
      publicId: `amangiz-demo/evidence-${day}-${index + 1}`,
      fileType: "image" as const,
      description: `Dokumentasi pendukung ${index + 1}`,
      uploadedAt: ago(day, 13, index * 5),
    }));

  const incidentDocs = await Incident.insertMany(
    incidentSpecs.map((spec) => ({
      incidentCode: spec.code,
      title: spec.title,
      description: spec.description,
      incidentType: spec.type,
      reportedBy: spec.reportedBy,
      batchId: spec.batchCode
        ? must(batchByCode.get(spec.batchCode), spec.batchCode)._id
        : undefined,
      distributionId: spec.distCode
        ? must(distByCode.get(spec.distCode), spec.distCode)._id
        : undefined,
      sppgId: spec.sppgId,
      schoolId: spec.schoolId,
      occurredAt: ago(spec.day, 12, 0),
      reportedAt: ago(spec.day, 13, 30),
      reportedAffectedCount: spec.affected,
      symptomsReported: spec.symptoms,
      evidence: evidenceStub(spec.evidenceCount, spec.day),
      severity: spec.severity,
      status: spec.status,
      assignedInvestigatorId: spec.assignedTo,
      resolutionSummary: spec.resolutionSummary,
      resolvedAt:
        spec.status === "resolved" || spec.status === "closed"
          ? ago(Math.max(spec.day - 2, 0), 15, 0)
          : undefined,
      closedAt:
        spec.status === "closed"
          ? ago(Math.max(spec.day - 3, 0), 16, 0)
          : undefined,
      createdAt: ago(spec.day, 13, 30),
      updatedAt: ago(Math.max(spec.day - 1, 0), 15, 0),
    })),
    { timestamps: false },
  );

  const incidentByCode = new Map(
    incidentDocs.map((doc) => [doc.incidentCode, doc]),
  );

  for (const doc of incidentDocs) {
    const spec = must(
      incidentSpecs.find((s) => s.code === doc.incidentCode),
      doc.incidentCode,
    );
    audit({
      actorId: spec.reportedBy,
      action: "incident.report",
      resourceType: "Incident",
      resourceId: doc._id,
      organizationId: spec.sppgId,
      createdAt: ago(spec.day, 13, 30),
      metadata: { incidentCode: doc.incidentCode, title: doc.title },
    });
    if (spec.status !== "reported") {
      audit({
        actorId: investigator._id,
        action: "incident.triage",
        resourceType: "Incident",
        resourceId: doc._id,
        organizationId: spec.sppgId,
        createdAt: ago(spec.day, 14, 15),
        metadata: { incidentCode: doc.incidentCode, severity: spec.severity },
      });
    }
    if (spec.assignedTo) {
      audit({
        actorId: admin._id,
        action: "incident.assign",
        resourceType: "Incident",
        resourceId: doc._id,
        organizationId: spec.sppgId,
        createdAt: ago(spec.day, 14, 30),
        metadata: { incidentCode: doc.incidentCode },
      });
    }
    if (spec.status === "resolved" || spec.status === "closed") {
      audit({
        actorId: investigator._id,
        action: "incident.resolve",
        resourceType: "Incident",
        resourceId: doc._id,
        organizationId: spec.sppgId,
        createdAt: ago(Math.max(spec.day - 2, 0), 15, 0),
        metadata: { incidentCode: doc.incidentCode },
      });
    }
    if (spec.status === "closed") {
      audit({
        actorId: admin._id,
        action: "incident.close",
        resourceType: "Incident",
        resourceId: doc._id,
        organizationId: spec.sppgId,
        createdAt: ago(Math.max(spec.day - 3, 0), 16, 0),
        metadata: { incidentCode: doc.incidentCode },
      });
    }
  }

  // --- Risk assessments (real engine output) -----------------------------
  const assessmentRows = incidentSpecs.map((spec) => {
    const incident = must(incidentByCode.get(spec.code), spec.code);
    const batch = spec.batchCode
      ? must(batchByCode.get(spec.batchCode), spec.batchCode)
      : null;
    const dist = spec.distCode
      ? must(distByCode.get(spec.distCode), spec.distCode)
      : null;

    // Same counts the service derives from the database, computed from the
    // in-memory seed set so this stays a single pass.
    const relatedBatchIncidentCount = spec.batchCode
      ? incidentSpecs.filter(
          (other) =>
            other.batchCode === spec.batchCode && other.code !== spec.code,
        ).length
      : 0;
    const specSppgId = spec.sppgId;
    const recentSppgIncidentCount = specSppgId
      ? incidentSpecs.filter(
          (other) =>
            other.sppgId?.equals(specSppgId) &&
            other.code !== spec.code &&
            other.day <= 30,
        ).length
      : 0;

    const input: RiskEngineInput = {
      incidentType: spec.type,
      reportedAffectedCount: spec.affected,
      occurredAt: incident.occurredAt ?? null,
      symptomsReportedCount: spec.symptoms?.length ?? 0,
      evidenceCount: spec.evidenceCount,
      batch: batch
        ? {
            status: batch.status,
            storageTemperature: batch.storageTemperature?.map((reading) => ({
              value: reading.value,
              recordedAt: reading.recordedAt,
            })),
          }
        : null,
      distribution: dist
        ? {
            status: dist.status,
            scheduledAt: dist.scheduledAt ?? null,
            dispatchedAt: dist.dispatchedAt ?? null,
            receivedAt: dist.receivedAt ?? null,
            dispatchTemperature: dist.dispatchTemperature ?? null,
            receivedTemperature: dist.receivedTemperature ?? null,
          }
        : null,
      relatedBatchIncidentCount,
      recentSppgIncidentCount,
    };

    const result = assessRisk(input);
    const assessedAt = ago(spec.day, 14, 45);

    audit({
      actorId: investigator._id,
      action: "incident.risk_assessment",
      resourceType: "RiskAssessment",
      resourceId: incident._id,
      organizationId: spec.sppgId,
      createdAt: assessedAt,
      metadata: {
        incidentCode: spec.code,
        score: result.score,
        level: result.level,
      },
    });

    return {
      incidentId: incident._id,
      score: result.score,
      level: result.level,
      rulesTriggered: result.rulesTriggered,
      missingData: result.missingData,
      recommendations: result.recommendations,
      engineVersion: result.engineVersion,
      assessedBy: investigator._id,
      assessedAt,
      createdAt: assessedAt,
    };
  });

  // A re-run on some cases, so "Riwayat Penilaian" shows an incident assessed
  // more than once — PRD 7.10 keeps every assessment rather than overwriting.
  const reassessmentRows = assessmentRows
    .filter(() => chance(0.25))
    .map((row) => ({
      ...row,
      // Earlier, weaker read of the same case: the first pass ran before the
      // supporting records were complete.
      score: Math.max(row.score - randInt(10, 25), 5),
      level:
        row.score - 20 >= 70
          ? ("critical" as const)
          : row.score - 20 >= 40
            ? ("high" as const)
            : row.score - 20 >= 20
              ? ("medium" as const)
              : ("low" as const),
      rulesTriggered: row.rulesTriggered.slice(0, -1),
      assessedAt: new Date(row.assessedAt.getTime() - 26 * HOUR_MS),
      createdAt: new Date(row.assessedAt.getTime() - 26 * HOUR_MS),
    }));

  await RiskAssessment.insertMany([...assessmentRows, ...reassessmentRows], {
    timestamps: false,
  });

  // --- Investigations ----------------------------------------------------
  const investigationSpecs = [
    {
      incidentCode: "INC-20261009-T4R8M",
      status: "in_progress" as const,
      day: 2,
      rootCauseStatus: "under_review" as const,
      rootCauseSummary:
        "Dugaan sementara mengarah pada keterlambatan pengiriman yang memperpanjang waktu makanan berada di luar suhu aman. Masih menunggu hasil uji laboratorium.",
      sampleTesting: {
        status: "in_progress" as const,
        laboratoryName: "Laboratorium Kesehatan Daerah Kab. Bekasi",
        referenceNumber: "LAB/2026/10/0431",
      },
      timeline: [
        {
          hour: 15,
          action: "Penugasan investigator",
          description:
            "Investigator ditugaskan dan mulai meninjau laporan beserta bukti pendukung.",
        },
        {
          hour: 17,
          action: "Peninjauan dokumen distribusi",
          description:
            "Catatan keberangkatan dan penerimaan diperiksa. Ditemukan selisih waktu transit sekitar tiga jam dari jadwal.",
        },
        {
          hour: 19,
          action: "Pengambilan sampel",
          description:
            "Sampel makanan dari batch terkait dikirim ke laboratorium daerah untuk pengujian.",
        },
      ],
      findings: [
        {
          title: "Waktu transit melebihi ambang yang ditetapkan",
          description:
            "Pengiriman berangkat empat jam setelah jadwal dan diterima tiga jam kemudian, sehingga total waktu di luar pendingin melampaui batas prosedur.",
        },
        {
          title: "Catatan suhu kendaraan tidak terisi lengkap",
          description:
            "Form pemantauan suhu kendaraan hanya terisi pada titik keberangkatan, tidak ada pencatatan selama perjalanan.",
        },
      ],
      correctiveActions: [
        {
          action:
            "Lengkapi pencatatan suhu kendaraan pada setiap titik perjalanan.",
          ownerId: opCempaka._id,
          dueDay: -3,
          status: "in_progress" as const,
        },
        {
          action:
            "Siapkan armada cadangan untuk rute dengan riwayat keterlambatan.",
          ownerId: opCempaka._id,
          dueDay: -7,
          status: "pending" as const,
        },
      ],
    },
    {
      incidentCode: "INC-20261006-W9K2P",
      status: "awaiting_external_result" as const,
      day: 5,
      rootCauseStatus: "under_review" as const,
      rootCauseSummary:
        "Indikasi rantai dingin tidak terjaga selama perjalanan. Menunggu konfirmasi hasil uji laboratorium sebelum penetapan.",
      sampleTesting: {
        status: "requested" as const,
        laboratoryName: "Laboratorium Kesehatan Daerah Kab. Bekasi",
        referenceNumber: "LAB/2026/10/0402",
      },
      timeline: [
        {
          hour: 15,
          action: "Penugasan investigator",
          description: "Investigator ditugaskan untuk menindaklanjuti laporan.",
        },
        {
          hour: 18,
          action: "Wawancara petugas distribusi",
          description:
            "Petugas menyampaikan perjalanan tertahan kemacetan panjang tanpa pendingin tambahan.",
        },
      ],
      findings: [
        {
          title: "Suhu keberangkatan sudah di luar batas aman",
          description:
            "Suhu tercatat 19°C saat keberangkatan, menunjukkan masalah sudah terjadi sebelum perjalanan dimulai.",
        },
      ],
      correctiveActions: [
        {
          action:
            "Audit ulang prosedur pendinginan sebelum pemuatan di dapur SPPG.",
          ownerId: opCempaka._id,
          dueDay: -2,
          status: "in_progress" as const,
        },
      ],
    },
    {
      incidentCode: "INC-20261003-M8P3Q",
      status: "completed" as const,
      day: 6,
      rootCauseStatus: "determined" as const,
      rootCauseSummary:
        "Keluhan berkaitan dengan riwayat alergi individual siswa, bukan penyimpangan penanganan pada batch.",
      conclusion:
        "Tidak ditemukan penyimpangan pada penanganan batch maupun distribusi. Sekolah diminta melengkapi data riwayat alergi siswa penerima agar menu dapat disesuaikan.",
      sampleTesting: {
        status: "completed" as const,
        laboratoryName: "Laboratorium Kesehatan Daerah Kab. Bekasi",
        referenceNumber: "LAB/2026/10/0377",
        resultSummary:
          "Tidak ditemukan cemaran mikrobiologis yang melampaui ambang pada sampel yang diuji.",
        resultDay: 4,
      },
      timeline: [
        {
          hour: 15,
          action: "Penugasan investigator",
          description: "Investigator ditugaskan dan meninjau laporan awal.",
        },
        {
          hour: 17,
          action: "Verifikasi catatan penanganan",
          description:
            "Catatan suhu produksi dan distribusi diperiksa, seluruhnya berada dalam batas aman.",
        },
      ],
      findings: [
        {
          title: "Penanganan batch sesuai prosedur",
          description:
            "Seluruh catatan suhu produksi dan distribusi berada dalam batas yang ditetapkan.",
        },
      ],
      correctiveActions: [
        {
          action:
            "Kumpulkan data riwayat alergi siswa penerima melalui pihak sekolah.",
          ownerId: opSdn01._id,
          dueDay: 2,
          status: "completed" as const,
        },
      ],
    },
    {
      incidentCode: "INC-20260930-U1V4W",
      status: "completed" as const,
      day: 9,
      rootCauseStatus: "determined" as const,
      rootCauseSummary:
        "Keterlambatan keberangkatan armada menyebabkan makanan berada di luar suhu aman lebih lama dari prosedur.",
      conclusion:
        "Penyebab keterlambatan terdokumentasi dan prosedur penjadwalan armada telah diperbarui. Tidak ada laporan keluhan kesehatan yang menyertai.",
      sampleTesting: { status: "not_requested" as const },
      timeline: [
        {
          hour: 15,
          action: "Penugasan investigator",
          description: "Investigator ditugaskan untuk meninjau catatan suhu.",
        },
        {
          hour: 18,
          action: "Peninjauan jadwal armada",
          description:
            "Ditemukan tumpang tindih penjadwalan kendaraan pada hari kejadian.",
        },
      ],
      findings: [
        {
          title: "Tumpang tindih penjadwalan armada",
          description:
            "Satu kendaraan dijadwalkan untuk dua rute pada jam yang sama, menyebabkan keberangkatan rute kedua tertunda tiga jam.",
        },
      ],
      correctiveActions: [
        {
          action: "Perbarui prosedur penjadwalan armada dan sosialisasikan.",
          ownerId: opCempaka._id,
          dueDay: 5,
          status: "completed" as const,
        },
      ],
    },
    {
      incidentCode: "INC-20261002-R5S9T",
      status: "completed" as const,
      day: 7,
      rootCauseStatus: "determined" as const,
      rootCauseSummary:
        "Perbedaan rasa berasal dari penyesuaian resep yang sudah disetujui sebelumnya.",
      conclusion:
        "Tidak ada indikasi masalah keamanan pangan. Perubahan resep akan diinformasikan lebih awal ke sekolah penerima.",
      sampleTesting: { status: "not_requested" as const },
      timeline: [
        {
          hour: 15,
          action: "Penugasan investigator",
          description: "Investigator meninjau laporan dan menu yang digunakan.",
        },
      ],
      findings: [
        {
          title: "Penyesuaian resep terdokumentasi",
          description:
            "Perubahan komposisi bumbu tercatat dan telah melalui persetujuan ahli gizi SPPG.",
        },
      ],
      correctiveActions: [
        {
          action:
            "Informasikan perubahan menu ke sekolah penerima sebelum pelaksanaan.",
          ownerId: opCempaka._id,
          dueDay: 3,
          status: "completed" as const,
        },
      ],
    },
  ];

  const investigationDocs = await Investigation.insertMany(
    investigationSpecs.map((spec) => {
      const incident = must(
        incidentByCode.get(spec.incidentCode),
        spec.incidentCode,
      );
      return {
        incidentId: incident._id,
        assignedTo: investigator._id,
        status: spec.status,
        timeline: spec.timeline.map((entry) => ({
          occurredAt: ago(spec.day, entry.hour, 0),
          action: entry.action,
          description: entry.description,
          actorId: investigator._id,
        })),
        findings: spec.findings.map((finding) => ({
          title: finding.title,
          description: finding.description,
          evidenceUrls: [],
        })),
        sampleTesting: {
          ...spec.sampleTesting,
          resultReceivedAt:
            "resultDay" in spec.sampleTesting &&
            typeof spec.sampleTesting.resultDay === "number"
              ? ago(spec.sampleTesting.resultDay, 11, 0)
              : undefined,
        },
        rootCauseStatus: spec.rootCauseStatus,
        rootCauseSummary: spec.rootCauseSummary,
        correctiveActions: spec.correctiveActions.map((action) => ({
          action: action.action,
          ownerId: action.ownerId,
          dueAt: ago(action.dueDay, 17, 0),
          status: action.status,
          completedAt:
            action.status === "completed"
              ? ago(Math.max(action.dueDay, 0), 16, 0)
              : undefined,
        })),
        conclusion: "conclusion" in spec ? spec.conclusion : undefined,
        completedAt:
          spec.status === "completed"
            ? ago(Math.max(spec.day - 2, 0), 16, 30)
            : undefined,
        createdAt: ago(spec.day, 14, 45),
        updatedAt: ago(Math.max(spec.day - 2, 0), 16, 30),
      };
    }),
    { timestamps: false },
  );

  for (const [index, doc] of investigationDocs.entries()) {
    const spec = investigationSpecs[index];
    const incident = must(
      incidentByCode.get(spec.incidentCode),
      spec.incidentCode,
    );
    audit({
      actorId: investigator._id,
      action: "investigation.create",
      resourceType: "Investigation",
      resourceId: doc._id,
      organizationId: incident.sppgId,
      createdAt: ago(spec.day, 14, 45),
      metadata: { incidentCode: spec.incidentCode },
    });
    for (const entry of spec.timeline) {
      audit({
        actorId: investigator._id,
        action: "investigation.timeline_add",
        resourceType: "Investigation",
        resourceId: doc._id,
        organizationId: incident.sppgId,
        createdAt: ago(spec.day, entry.hour, 5),
        metadata: { incidentCode: spec.incidentCode, action: entry.action },
      });
    }
    for (const finding of spec.findings) {
      audit({
        actorId: investigator._id,
        action: "investigation.finding_add",
        resourceType: "Investigation",
        resourceId: doc._id,
        organizationId: incident.sppgId,
        createdAt: ago(Math.max(spec.day - 1, 0), 10, 0),
        metadata: { incidentCode: spec.incidentCode, title: finding.title },
      });
    }
    if (spec.status === "completed") {
      audit({
        actorId: investigator._id,
        action: "investigation.complete",
        resourceType: "Investigation",
        resourceId: doc._id,
        organizationId: incident.sppgId,
        createdAt: ago(Math.max(spec.day - 2, 0), 16, 30),
        metadata: { incidentCode: spec.incidentCode },
      });
    }
  }

  // --- Bulk investigations -----------------------------------------------
  // Every bulk incident that reached an investigator gets a case file, so the
  // Investigasi list and its status filter aren't carried by five rows.
  const FINDING_POOL = [
    {
      title: "Waktu transit melebihi ambang yang ditetapkan",
      description:
        "Selisih antara keberangkatan dan penerimaan melampaui batas yang diatur prosedur, sehingga makanan berada di luar suhu aman lebih lama.",
    },
    {
      title: "Catatan suhu kendaraan tidak terisi lengkap",
      description:
        "Form pemantauan suhu hanya terisi pada titik keberangkatan, tanpa pencatatan selama perjalanan.",
    },
    {
      title: "Penanganan batch sesuai prosedur",
      description:
        "Seluruh catatan suhu produksi dan penyimpanan berada dalam batas yang ditetapkan.",
    },
    {
      title: "Tumpang tindih penjadwalan armada",
      description:
        "Satu kendaraan dijadwalkan untuk dua rute pada jam yang berdekatan sehingga rute kedua tertunda.",
    },
    {
      title: "Pencatatan jumlah porsi belum terverifikasi ganda",
      description:
        "Penghitungan porsi saat pemuatan hanya dilakukan sekali tanpa verifikasi kedua.",
    },
  ] as const;

  const ACTION_POOL = [
    "Lengkapi pencatatan suhu kendaraan pada setiap titik perjalanan.",
    "Audit ulang prosedur pendinginan sebelum pemuatan di dapur SPPG.",
    "Perbarui prosedur penjadwalan armada dan sosialisasikan ke petugas.",
    "Terapkan penghitungan ganda porsi sebelum keberangkatan.",
    "Kalibrasi ulang termometer yang digunakan saat serah terima.",
  ] as const;

  const bulkInvestigationSources = incidentSpecs.filter(
    (spec) =>
      spec.code.startsWith("INC-BULK-") &&
      spec.assignedTo !== undefined &&
      (spec.status === "under_investigation" ||
        spec.status === "resolved" ||
        spec.status === "closed"),
  );

  const bulkInvestigationRows = bulkInvestigationSources.map((spec) => {
    const incident = must(incidentByCode.get(spec.code), spec.code);
    const assignedTo = must(spec.assignedTo, `assignee for ${spec.code}`);
    const done = spec.status === "resolved" || spec.status === "closed";
    const owner = must(
      operatorBySppg.get(String(spec.sppgId)),
      `operator for SPPG ${String(spec.sppgId)}`,
    );
    const labRequested = spec.symptoms !== undefined && chance(0.7);

    return {
      incidentId: incident._id,
      assignedTo,
      status: done
        ? ("completed" as const)
        : labRequested
          ? ("awaiting_external_result" as const)
          : ("in_progress" as const),
      timeline: [
        {
          occurredAt: ago(spec.day, 15, 0),
          action: "Penugasan investigator",
          description:
            "Investigator ditugaskan dan mulai meninjau laporan beserta bukti pendukung.",
          actorId: assignedTo,
        },
        {
          occurredAt: ago(spec.day, 17, 30),
          action: "Peninjauan dokumen distribusi",
          description:
            "Catatan keberangkatan, penerimaan, dan suhu pada pengiriman terkait diperiksa.",
          actorId: assignedTo,
        },
      ],
      findings: sample(FINDING_POOL, randInt(1, 2)).map((finding) => ({
        title: finding.title,
        description: finding.description,
        evidenceUrls: [],
      })),
      sampleTesting: labRequested
        ? {
            status: done ? ("completed" as const) : ("in_progress" as const),
            laboratoryName: pick([
              "Laboratorium Kesehatan Daerah Kab. Bekasi",
              "Laboratorium Kesehatan Daerah Kab. Karawang",
              "Balai Besar Laboratorium Kesehatan Jakarta",
            ]),
            referenceNumber: `LAB/2026/10/${String(randInt(100, 899))}`,
            resultSummary: done
              ? "Tidak ditemukan cemaran mikrobiologis yang melampaui ambang pada sampel yang diuji."
              : undefined,
            resultReceivedAt: done
              ? ago(Math.max(spec.day - 2, 0), 11, 0)
              : undefined,
          }
        : { status: "not_requested" as const },
      rootCauseStatus: done
        ? ("determined" as const)
        : ("under_review" as const),
      rootCauseSummary: done
        ? "Penyebab operasional teridentifikasi dari catatan distribusi dan penanganan batch terkait."
        : "Masih menunggu kelengkapan data dan konfirmasi dari pihak terkait sebelum penetapan.",
      correctiveActions: sample(ACTION_POOL, randInt(1, 2)).map((action) => ({
        action,
        ownerId: owner,
        dueAt: ago(Math.max(spec.day - 5, -5), 17, 0),
        status: done
          ? ("completed" as const)
          : pick(["pending", "in_progress"]),
        completedAt: done ? ago(Math.max(spec.day - 4, 0), 16, 0) : undefined,
      })),
      conclusion: done
        ? "Hasil peninjauan terdokumentasi dan tindakan korektif telah diselesaikan oleh unit terkait."
        : undefined,
      completedAt: done ? ago(Math.max(spec.day - 2, 0), 16, 30) : undefined,
      createdAt: ago(spec.day, 14, 45),
      updatedAt: ago(Math.max(spec.day - 2, 0), 16, 30),
    };
  });

  const bulkInvestigationDocs = await Investigation.insertMany(
    bulkInvestigationRows,
    { timestamps: false },
  );

  for (const [index, doc] of bulkInvestigationDocs.entries()) {
    const spec = must(bulkInvestigationSources[index], `bulk inv ${index}`);
    audit({
      actorId: doc.assignedTo,
      action: "investigation.create",
      resourceType: "Investigation",
      resourceId: doc._id,
      organizationId: spec.sppgId,
      createdAt: ago(spec.day, 14, 45),
      metadata: { incidentCode: spec.code },
    });
    audit({
      actorId: doc.assignedTo,
      action: "investigation.timeline_add",
      resourceType: "Investigation",
      resourceId: doc._id,
      organizationId: spec.sppgId,
      createdAt: ago(spec.day, 15, 5),
      metadata: { incidentCode: spec.code },
    });
    if (doc.status === "completed") {
      audit({
        actorId: doc.assignedTo,
        action: "investigation.complete",
        resourceType: "Investigation",
        resourceId: doc._id,
        organizationId: spec.sppgId,
        createdAt: ago(Math.max(spec.day - 2, 0), 16, 30),
        metadata: { incidentCode: spec.code },
      });
    }
  }

  // --- Notifications -----------------------------------------------------
  const notificationRows: Partial<INotification>[] = [
    {
      recipientId: investigator._id,
      type: "incident_reported",
      title: "Laporan insiden baru",
      message:
        "INC-20261011-H2J5K — Pengiriman terlambat lebih dari tiga jam di MI An-Nur Cikarang.",
      resourceType: "incident",
      resourceId: must(
        incidentByCode.get("INC-20261011-H2J5K"),
        "INC-20261011-H2J5K",
      )._id,
      createdAt: ago(3, 13, 35),
    },
    {
      recipientId: investigator._id,
      type: "risk_escalated",
      title: "Prioritas pemeriksaan naik",
      message:
        "INC-20261009-T4R8M dinilai prioritas tinggi oleh rule-based risk assessment.",
      resourceType: "incident",
      resourceId: must(
        incidentByCode.get("INC-20261009-T4R8M"),
        "INC-20261009-T4R8M",
      )._id,
      createdAt: ago(2, 14, 50),
    },
    {
      recipientId: investigator._id,
      type: "action_required",
      title: "Tindakan korektif mendekati tenggat",
      message:
        "Dua tindakan korektif pada INC-20261009-T4R8M masih berjalan dan perlu ditinjau.",
      resourceType: "incident",
      resourceId: must(
        incidentByCode.get("INC-20261009-T4R8M"),
        "INC-20261009-T4R8M",
      )._id,
      createdAt: ago(1, 9, 0),
    },
    {
      recipientId: admin._id,
      type: "batch_on_hold",
      title: "Batch ditahan",
      message:
        "BTH-20261004-H9R3W ditahan menunggu verifikasi catatan suhu penyimpanan.",
      resourceType: "batch",
      resourceId: must(
        batchByCode.get("BTH-20261004-H9R3W"),
        "BTH-20261004-H9R3W",
      )._id,
      createdAt: ago(4, 13, 5),
    },
    {
      recipientId: admin._id,
      type: "risk_escalated",
      title: "Kasus prioritas tinggi baru",
      message:
        "INC-20261006-W9K2P masuk kategori prioritas tinggi dan sudah ditugaskan ke investigator.",
      resourceType: "incident",
      resourceId: must(
        incidentByCode.get("INC-20261006-W9K2P"),
        "INC-20261006-W9K2P",
      )._id,
      createdAt: ago(5, 14, 50),
    },
    {
      recipientId: admin._id,
      type: "investigation_updated",
      title: "Investigasi diperbarui",
      message:
        "Hasil uji laboratorium untuk INC-20261003-M8P3Q telah diterima dan investigasi ditutup.",
      resourceType: "incident",
      resourceId: must(
        incidentByCode.get("INC-20261003-M8P3Q"),
        "INC-20261003-M8P3Q",
      )._id,
      createdAt: ago(4, 11, 30),
      readAt: ago(4, 12, 0),
    },
    {
      recipientId: opCempaka._id,
      type: "action_required",
      title: "Tindakan korektif ditugaskan",
      message:
        "Lengkapi pencatatan suhu kendaraan pada setiap titik perjalanan (INC-20261009-T4R8M).",
      resourceType: "incident",
      resourceId: must(
        incidentByCode.get("INC-20261009-T4R8M"),
        "INC-20261009-T4R8M",
      )._id,
      createdAt: ago(2, 15, 10),
    },
    {
      recipientId: opCempaka._id,
      type: "batch_on_hold",
      title: "Batch Anda ditahan",
      message:
        "BTH-20261004-H9R3W ditahan oleh administrator. Lengkapi catatan suhu penyimpanan.",
      resourceType: "batch",
      resourceId: must(
        batchByCode.get("BTH-20261004-H9R3W"),
        "BTH-20261004-H9R3W",
      )._id,
      createdAt: ago(4, 13, 5),
      readAt: ago(4, 14, 0),
    },
    {
      recipientId: opSdn01._id,
      type: "incident_reported",
      title: "Laporan Anda diterima",
      message:
        "INC-20261003-M8P3Q sudah ditinjau investigator dan dinyatakan selesai.",
      resourceType: "incident",
      resourceId: must(
        incidentByCode.get("INC-20261003-M8P3Q"),
        "INC-20261003-M8P3Q",
      )._id,
      createdAt: ago(4, 15, 30),
    },
    {
      recipientId: opSmpn01._id,
      type: "investigation_updated",
      title: "Investigasi berjalan",
      message:
        "INC-20261009-T4R8M sedang dalam investigasi. Sampel sudah dikirim ke laboratorium.",
      resourceType: "incident",
      resourceId: must(
        incidentByCode.get("INC-20261009-T4R8M"),
        "INC-20261009-T4R8M",
      )._id,
      createdAt: ago(2, 19, 15),
    },
  ];

  // Fan the newest bulk incidents out to the investigators so every account
  // that can act on something has an unread badge waiting for it.
  const notifiableIncidents = incidentSpecs
    .filter((spec) => spec.code.startsWith("INC-BULK-") && spec.day <= 6)
    .slice(0, 14);

  for (const spec of notifiableIncidents) {
    const incident = must(incidentByCode.get(spec.code), spec.code);
    notificationRows.push({
      recipientId: spec.assignedTo ?? pick([investigator._id, admin._id]),
      type:
        spec.affected && spec.affected > 10
          ? "risk_escalated"
          : "incident_reported",
      title:
        spec.affected && spec.affected > 10
          ? "Prioritas pemeriksaan naik"
          : "Laporan insiden baru",
      message: `${spec.code} — ${spec.title}.`,
      resourceType: "incident",
      resourceId: incident._id,
      createdAt: ago(spec.day, 13, 40),
      readAt: chance(0.35) ? ago(spec.day, 18, 0) : undefined,
    });
  }

  await Notification.insertMany(notificationRows, { timestamps: false });

  // --- Audit log ---------------------------------------------------------
  // A few login events so "Aktivitas Terbaru" is not purely data mutations.
  for (const [index, user] of [
    admin,
    opCempaka,
    opSdn01,
    investigator,
  ].entries()) {
    audit({
      actorId: user._id,
      action: "auth.login",
      resourceType: "User",
      resourceId: user._id,
      organizationId: user.organizationId,
      createdAt: ago(0, 7, index * 7),
      metadata: { email: user.email },
    });
  }

  audits.sort(
    (a, b) => (a.createdAt as Date).getTime() - (b.createdAt as Date).getTime(),
  );
  await AuditLog.insertMany(audits, { timestamps: false });

  // --- Summary -----------------------------------------------------------
  const levelTally = assessmentRows.reduce<Record<string, number>>(
    (acc, row) => {
      acc[row.level] = (acc[row.level] ?? 0) + 1;
      return acc;
    },
    {},
  );

  console.log("\nSeed demo selesai.\n");
  console.log("Master data:");
  console.log(`  SPPG          ${sppgs.size}`);
  console.log(`  Supplier      ${suppliers.size}`);
  console.log(`  Sekolah       ${schools.size}`);
  console.log(`  Pengguna      ${users.size}`);
  console.log("\nData transaksional:");
  console.log(`  Batch         ${batchDocs.length}`);
  console.log(`  Distribusi    ${distDocs.length}`);
  console.log(`  Insiden       ${incidentDocs.length}`);
  console.log(
    `  Penilaian     ${assessmentRows.length + reassessmentRows.length} (termasuk ${reassessmentRows.length} penilaian ulang)`,
  );
  console.log(
    `  Investigasi   ${investigationDocs.length + bulkInvestigationDocs.length}`,
  );
  console.log(`  Notifikasi    ${notificationRows.length}`);
  console.log(`  Audit log     ${audits.length}`);
  console.log("\nSebaran tingkat risiko (penilaian terbaru, rule engine):");
  for (const level of ["low", "medium", "high", "critical"]) {
    console.log(`  ${level.padEnd(10)} ${levelTally[level] ?? 0}`);
  }
  console.log("\nDisiapkan untuk demo langsung:");
  console.log("  Batch        BTH-DEMO-0001  (suhu simpan 32°C)");
  console.log(
    "  Distribusi   DST-DEMO-0001  (suhu terima 28°C, SDN 01 Cikarang)",
  );
  console.log("  Belum ada insiden pada batch ini — buat saat demo.");
  console.log(`\nPassword semua akun: ${SEED_PASSWORD}\n`);
  for (const user of users.values()) {
    console.log(`  ${user.role.padEnd(16)} ${user.email}`);
  }
  console.log("");

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("Seed demo gagal:", error);
  process.exit(1);
});
