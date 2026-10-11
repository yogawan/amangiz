import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { assessRisk, type RiskEngineInput } from "@/lib/risk-engine";
import Distribution from "@/models/Distribution";
import FoodBatch from "@/models/FoodBatch";
import Incident from "@/models/Incident";
import Investigation from "@/models/Investigation";
import RiskAssessment from "@/models/RiskAssessment";

/**
 * Sanity check for the demo dataset. Prints collection counts and — the point
 * of this script — replays the exact risk-engine input the app would build for
 * the incident the presenter files live, so docs/DEMO_SCENARIO.md can quote a
 * measured score instead of an estimate.
 *
 * Run the same way as the seeds: bundle with `bun build`, execute with `node`.
 */

const DEMO_BATCH = "BTH-DEMO-0001";
const DEMO_DIST = "DST-DEMO-0001";
/** What the presenter is told to type into the incident form. */
const DEMO_AFFECTED_COUNT = 25;

async function main() {
  await connectDB();

  const [batches, distributions, incidents, assessments, investigations] =
    await Promise.all([
      FoodBatch.countDocuments().exec(),
      Distribution.countDocuments().exec(),
      Incident.countDocuments().exec(),
      RiskAssessment.countDocuments().exec(),
      Investigation.countDocuments().exec(),
    ]);

  console.log("\nJumlah dokumen:");
  console.log(`  Batch        ${batches}`);
  console.log(`  Distribusi   ${distributions}`);
  console.log(`  Insiden      ${incidents}`);
  console.log(`  Penilaian    ${assessments}`);
  console.log(`  Investigasi  ${investigations}`);

  const batch = await FoodBatch.findOne({ batchCode: DEMO_BATCH }).exec();
  const dist = await Distribution.findOne({
    distributionCode: DEMO_DIST,
  }).exec();
  if (!batch || !dist) throw new Error("Demo batch/distribution not found");

  const existingOnBatch = await Incident.countDocuments({
    batchId: batch._id,
  }).exec();
  const recentSppgIncidentCount = await Incident.countDocuments({
    sppgId: batch.sppgId,
    reportedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
  }).exec();

  const input: RiskEngineInput = {
    incidentType: "suspected_food_safety",
    reportedAffectedCount: DEMO_AFFECTED_COUNT,
    occurredAt: new Date(),
    symptomsReportedCount: 2,
    evidenceCount: 1,
    batch: {
      status: batch.status,
      storageTemperature: batch.storageTemperature?.map((reading) => ({
        value: reading.value,
        recordedAt: reading.recordedAt,
      })),
    },
    distribution: {
      status: dist.status,
      scheduledAt: dist.scheduledAt ?? null,
      dispatchedAt: dist.dispatchedAt ?? null,
      receivedAt: dist.receivedAt ?? null,
      dispatchTemperature: dist.dispatchTemperature ?? null,
      receivedTemperature: dist.receivedTemperature ?? null,
    },
    relatedBatchIncidentCount: existingOnBatch,
    recentSppgIncidentCount,
  };

  const result = assessRisk(input);

  console.log(`\nSimulasi insiden demo (${DEMO_AFFECTED_COUNT} terdampak):`);
  console.log(`  Insiden lain pada batch ini : ${existingOnBatch}`);
  console.log(`  Insiden SPPG 30 hari        : ${recentSppgIncidentCount}`);
  console.log(`\n  SKOR ${result.score} → ${result.level.toUpperCase()}`);
  console.log("\n  Aturan yang terpicu:");
  let sum = 0;
  for (const rule of result.rulesTriggered) {
    sum += rule.weight;
    console.log(`    +${String(rule.weight).padStart(2)}  ${rule.ruleName}`);
  }
  console.log(
    `    ----  total bobot ${sum}${sum > result.score ? ` (dibatasi di ${result.score})` : ""}`,
  );
  console.log(`\n  Data kurang: ${result.missingData.join(", ") || "—"}`);
  console.log("");

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("Verify gagal:", error);
  process.exit(1);
});
