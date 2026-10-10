import mongoose, { type Document, Schema, type Types } from "mongoose";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface IRiskRuleTriggered {
  ruleCode: string;
  ruleName: string;
  reason: string;
  weight: number;
}

export interface IRiskAssessment extends Document {
  incidentId: Types.ObjectId;
  score: number;
  level: RiskLevel;
  rulesTriggered: IRiskRuleTriggered[];
  missingData: string[];
  // Suggested checks and operational actions only — never a medical decision
  // or a conclusion about the incident's cause.
  recommendations: string[];
  engineVersion: string;
  assessedBy: Types.ObjectId;
  assessedAt: Date;
  createdAt: Date;
}

const RiskRuleTriggeredSchema = new Schema<IRiskRuleTriggered>(
  {
    ruleCode: { type: String, required: true },
    ruleName: { type: String, required: true },
    reason: { type: String, required: true },
    weight: { type: Number, required: true },
  },
  { _id: false },
);

const RiskAssessmentSchema = new Schema<IRiskAssessment>(
  {
    incidentId: {
      type: Schema.Types.ObjectId,
      ref: "Incident",
      required: true,
      index: true,
    },
    score: { type: Number, required: true, min: 0 },
    level: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      required: true,
    },
    rulesTriggered: { type: [RiskRuleTriggeredSchema], default: [] },
    missingData: { type: [String], default: [] },
    recommendations: { type: [String], default: [] },
    engineVersion: { type: String, required: true },
    assessedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assessedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
  },
  // Each assessment is its own immutable record so assessment history is
  // preserved, so there is deliberately no `updatedAt`.
  { timestamps: { createdAt: true, updatedAt: false } },
);

export default (mongoose.models
  .RiskAssessment as mongoose.Model<IRiskAssessment>) ||
  mongoose.model<IRiskAssessment>(
    "RiskAssessment",
    RiskAssessmentSchema,
    "riskassessments",
  );
