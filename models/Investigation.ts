import mongoose, { type Document, Schema, type Types } from "mongoose";

export type InvestigationStatus =
  | "pending"
  | "in_progress"
  | "awaiting_external_result"
  | "completed";

export type SampleTestingStatus =
  | "not_requested"
  | "requested"
  | "in_progress"
  | "completed";

export type RootCauseStatus = "undetermined" | "under_review" | "determined";

export type CorrectiveActionStatus = "pending" | "in_progress" | "completed";

export interface IInvestigationTimelineEntry {
  occurredAt: Date;
  action: string;
  description: string;
  actorId: Types.ObjectId;
}

export interface IInvestigationFinding {
  title: string;
  description: string;
  evidenceUrls: string[];
}

export interface IInvestigationSampleTesting {
  status: SampleTestingStatus;
  laboratoryName?: string;
  referenceNumber?: string;
  resultSummary?: string;
  resultDocumentUrl?: string;
  resultReceivedAt?: Date;
}

export interface IInvestigationCorrectiveAction {
  _id: Types.ObjectId;
  action: string;
  ownerId: Types.ObjectId;
  dueAt?: Date;
  status: CorrectiveActionStatus;
  completedAt?: Date;
}

export interface IInvestigation extends Document {
  incidentId: Types.ObjectId;
  assignedTo: Types.ObjectId;
  status: InvestigationStatus;
  timeline: IInvestigationTimelineEntry[];
  findings: IInvestigationFinding[];
  // Lab results may only be recorded from a verifiable document or source.
  sampleTesting?: IInvestigationSampleTesting;
  rootCauseStatus: RootCauseStatus;
  rootCauseSummary?: string;
  correctiveActions: IInvestigationCorrectiveAction[];
  conclusion?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvestigationTimelineSchema = new Schema<IInvestigationTimelineEntry>(
  {
    occurredAt: { type: Date, required: true },
    action: { type: String, required: true },
    description: { type: String, required: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: false },
);

const InvestigationFindingSchema = new Schema<IInvestigationFinding>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    evidenceUrls: { type: [String], default: [] },
  },
  { _id: false },
);

const InvestigationSampleTestingSchema =
  new Schema<IInvestigationSampleTesting>(
    {
      status: {
        type: String,
        enum: ["not_requested", "requested", "in_progress", "completed"],
        required: true,
        default: "not_requested",
      },
      laboratoryName: { type: String },
      referenceNumber: { type: String },
      resultSummary: { type: String },
      resultDocumentUrl: { type: String },
      resultReceivedAt: { type: Date },
    },
    { _id: false },
  );

// Keeps its default `_id` (unlike the other subdocuments here) because
// corrective actions are addressed individually via
// PATCH /investigations/:id/corrective-actions/:actionId.
const InvestigationCorrectiveActionSchema =
  new Schema<IInvestigationCorrectiveAction>({
    action: { type: String, required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    dueAt: { type: Date },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed"],
      required: true,
      default: "pending",
    },
    completedAt: { type: Date },
  });

const InvestigationSchema = new Schema<IInvestigation>(
  {
    incidentId: {
      type: Schema.Types.ObjectId,
      ref: "Incident",
      required: true,
      // One active investigation per incident (ERD: INCIDENT ||--o| INVESTIGATION).
      unique: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "in_progress", "awaiting_external_result", "completed"],
      required: true,
      default: "pending",
      index: true,
    },
    timeline: { type: [InvestigationTimelineSchema], default: [] },
    findings: { type: [InvestigationFindingSchema], default: [] },
    sampleTesting: { type: InvestigationSampleTestingSchema },
    rootCauseStatus: {
      type: String,
      enum: ["undetermined", "under_review", "determined"],
      required: true,
      default: "undetermined",
    },
    rootCauseSummary: { type: String },
    correctiveActions: {
      type: [InvestigationCorrectiveActionSchema],
      default: [],
    },
    conclusion: { type: String },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

export default (mongoose.models
  .Investigation as mongoose.Model<IInvestigation>) ||
  mongoose.model<IInvestigation>(
    "Investigation",
    InvestigationSchema,
    "investigations",
  );
