import mongoose, { type Types } from "mongoose";
import { hashPassword } from "@/lib/auth/password";
import { connectDB } from "@/lib/db/mongoose";
import School, { type ISchool } from "@/models/School";
import SPPG, { type ISPPG } from "@/models/SPPG";
import Supplier, { type ISupplier } from "@/models/Supplier";
import User, {
  type IUser,
  type OrganizationType,
  type UserRole,
} from "@/models/User";

/**
 * Minimal baseline dataset so every role can actually log in (UI_PLAN.md
 * §0.2 prerequisite — there is otherwise not a single user in the database).
 * Idempotent: re-running `bun run seed` upserts by the same unique code/email
 * instead of duplicating or overwriting data edited later through the app.
 *
 * Run via `bun run seed`, which bundles this file to plain JS and executes it
 * with `node`, not `bun run scripts/seed.ts` directly — bson's module init
 * calls a `node:v8` function Bun 1.3.5 hasn't implemented yet, which crashes
 * immediately on import under Bun's own runtime (unrelated to this script's
 * logic; Node has no such gap).
 */

const SEED_PASSWORD = "Password123!";

async function upsertSppg(): Promise<ISPPG> {
  const doc = await SPPG.findOneAndUpdate(
    { code: "SPPG-CMP01" },
    {
      $setOnInsert: {
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
        status: "active",
      },
    },
    { upsert: true, new: true },
  ).exec();
  if (!doc) throw new Error("Failed to upsert seed SPPG");
  return doc;
}

async function upsertSupplier(): Promise<ISupplier> {
  const doc = await Supplier.findOneAndUpdate(
    { code: "SUP-TANI01" },
    {
      $setOnInsert: {
        code: "SUP-TANI01",
        name: "Tani Makmur Sejahtera",
        supplierType: "agriculture",
        address: "Jl. Raya Bogor KM 20, Depok, Jawa Barat",
        contactName: "Budi Santoso",
        contactPhone: "+6281298765432",
        // Seed-only convenience so Phase 2 batch creation isn't immediately
        // blocked on verification — not a stand-in for the real workflow
        // (PRD 7.5: verification must reflect a process that actually happened).
        verificationStatus: "verified",
        status: "active",
      },
    },
    { upsert: true, new: true },
  ).exec();
  if (!doc) throw new Error("Failed to upsert seed Supplier");
  return doc;
}

async function upsertSchool(): Promise<ISchool> {
  const doc = await School.findOneAndUpdate(
    { code: "SDN-01CKR" },
    {
      $setOnInsert: {
        code: "SDN-01CKR",
        name: "SDN 01 Cikarang",
        level: "SD",
        address: {
          street: "Jl. Industri Raya No. 5",
          city: "Cikarang",
          province: "Jawa Barat",
        },
        contactName: "Dewi Lestari",
        contactPhone: "+6281311112222",
        recipientCapacity: 320,
        status: "active",
      },
    },
    { upsert: true, new: true },
  ).exec();
  if (!doc) throw new Error("Failed to upsert seed School");
  return doc;
}

interface SeedUserInput {
  name: string;
  email: string;
  role: UserRole;
  organizationType: OrganizationType;
  organizationId?: Types.ObjectId;
}

async function upsertUser(
  input: SeedUserInput,
  passwordHash: string,
): Promise<IUser> {
  const doc = await User.findOneAndUpdate(
    { email: input.email },
    {
      $setOnInsert: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
        organizationType: input.organizationType,
        organizationId: input.organizationId,
        isActive: true,
      },
    },
    { upsert: true, new: true },
  ).exec();
  if (!doc) throw new Error(`Failed to upsert seed user ${input.email}`);
  return doc;
}

async function main() {
  await connectDB();

  const [sppg, supplier, school] = await Promise.all([
    upsertSppg(),
    upsertSupplier(),
    upsertSchool(),
  ]);

  const passwordHash = await hashPassword(SEED_PASSWORD);

  const users = await Promise.all([
    upsertUser(
      {
        name: "Admin AMANGIZ",
        email: "admin@amangiz.test",
        role: "admin",
        organizationType: "system",
      },
      passwordHash,
    ),
    upsertUser(
      {
        name: "Operator SPPG Cempaka",
        email: "sppg.cempaka@amangiz.test",
        role: "sppg_operator",
        organizationType: "sppg",
        organizationId: sppg._id,
      },
      passwordHash,
    ),
    upsertUser(
      {
        name: "Operator SDN 01 Cikarang",
        email: "sekolah.cikarang@amangiz.test",
        role: "school_operator",
        organizationType: "school",
        organizationId: school._id,
      },
      passwordHash,
    ),
    upsertUser(
      {
        name: "Investigator AMANGIZ",
        email: "investigator@amangiz.test",
        role: "investigator",
        organizationType: "health_authority",
      },
      passwordHash,
    ),
  ]);

  console.log("\nSeed selesai.\n");
  console.log("Master data:");
  console.log(`  SPPG      ${sppg.code} — ${sppg.name}`);
  console.log(`  Supplier  ${supplier.code} — ${supplier.name}`);
  console.log(`  School    ${school.code} — ${school.name}`);
  console.log("\nAkun login (password sama untuk semua akun):");
  console.log(`  Password: ${SEED_PASSWORD}\n`);
  for (const user of users) {
    console.log(`  ${user.role.padEnd(16)} ${user.email}`);
  }
  console.log("");

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("Seed gagal:", error);
  process.exit(1);
});
