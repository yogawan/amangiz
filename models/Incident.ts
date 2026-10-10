import mongoose, { type Document, Schema, type Types } from "mongoose";

export type IncidentType =
  | "suspected_food_safety"
  | "temperature_violation"
  | "distribution_issue"
  | "packaging_issue"
  | "other";

export type IncidentSeverity =
  | "low"
  | "medium"
  | "high"
  | "critical"
  | "unassessed";

export type IncidentStatus =
  | "reported"
  | "triaged"
  | "containment_in_progress"
  | "under_investigation"
  | "resolved"
  | "closed";

export type IncidentEvidenceFileType = "image" | "document" | "other";

export interface IIncidentEvidence {
  url: string;
  publicId: string;
  fileType: IncidentEvidenceFileType;
  description?: string;
  uploadedAt: Date;
}

export interface IIncident extends Document {
  incidentCode: string;
  title: string;
  description: string;
  incidentType: IncidentType;
  reportedBy: Types.ObjectId;
  batchId?: Types.ObjectId;
  distributionId?: Types.ObjectId;
  sppgId?: Types.ObjectId;
  schoolId?: Types.ObjectId;
  occurredAt?: Date;
  reportedAt: Date;
  // Reported count, not an automatically confirmed case count.
  reportedAffectedCount?: number;
  // Must never be used to generate an automatic diagnosis.
  symptomsReported?: string[];
  evidence: IIncidentEvidence[];
  severity: IncidentSeverity;
  status: IncidentStatus;
  assignedInvestigatorId?: Types.ObjectId;
  resolutionSummary?: string;
  resolvedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const IncidentEvidenceSchema = new Schema<IIncidentEvidence>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    fileType: {
      type: String,
      enum: ["image", "document", "other"],
      required: true,
    },
    description: { type: String },
    uploadedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const IncidentSchema = new Schema<IIncident>(
  {
    incidentCode: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    incidentType: {
      type: String,
      enum: [
        "suspected_food_safety",
        "temperature_violation",
        "distribution_issue",
        "packaging_issue",
        "other",
      ],
      required: true,
    },
    reportedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    batchId: { type: Schema.Types.ObjectId, ref: "FoodBatch", index: true },
    distributionId: { type: Schema.Types.ObjectId, ref: "Distribution" },
    sppgId: { type: Schema.Types.ObjectId, ref: "SPPG" },
    schoolId: { type: Schema.Types.ObjectId, ref: "School", index: true },
    occurredAt: { type: Date },
    reportedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    reportedAffectedCount: { type: Number, min: 0 },
    symptomsReported: { type: [String], default: undefined },
    evidence: { type: [IncidentEvidenceSchema], default: [] },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical", "unassessed"],
      required: true,
      default: "unassessed",
    },
    status: {
      type: String,
      enum: [
        "reported",
        "triaged",
        "containment_in_progress",
        "under_investigation",
        "resolved",
        "closed",
      ],
      required: true,
      default: "reported",
      index: true,
    },
    assignedInvestigatorId: { type: Schema.Types.ObjectId, ref: "User" },
    resolutionSummary: { type: String },
    resolvedAt: { type: Date },
    closedAt: { type: Date },
  },
  { timestamps: true },
);

export default (mongoose.models.Incident as mongoose.Model<IIncident>) ||
  mongoose.model<IIncident>("Incident", IncidentSchema, "incidents");
