import mongoose, { type Document, Schema, type Types } from "mongoose";

export type DistributionStatus =
  | "planned"
  | "dispatched"
  | "in_transit"
  | "delivered"
  | "delayed"
  | "cancelled";

export interface IDistributionEvidence {
  url: string;
  publicId: string;
  uploadedAt: Date;
}

export interface IDistribution extends Document {
  distributionCode: string;
  batchId: Types.ObjectId;
  sppgId: Types.ObjectId;
  schoolId: Types.ObjectId;
  quantity: number;
  unit: string;
  scheduledAt?: Date;
  dispatchedAt?: Date;
  receivedAt?: Date;
  dispatchTemperature?: number;
  receivedTemperature?: number;
  status: DistributionStatus;
  deliveryEvidence?: IDistributionEvidence[];
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DistributionEvidenceSchema = new Schema<IDistributionEvidence>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    uploadedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const DistributionSchema = new Schema<IDistribution>(
  {
    distributionCode: { type: String, required: true, trim: true },
    batchId: {
      type: Schema.Types.ObjectId,
      ref: "FoodBatch",
      required: true,
      index: true,
    },
    sppgId: {
      type: Schema.Types.ObjectId,
      ref: "SPPG",
      required: true,
      index: true,
    },
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true },
    scheduledAt: { type: Date },
    dispatchedAt: { type: Date, index: true },
    receivedAt: { type: Date },
    dispatchTemperature: { type: Number },
    receivedTemperature: { type: Number },
    status: {
      type: String,
      enum: [
        "planned",
        "dispatched",
        "in_transit",
        "delivered",
        "delayed",
        "cancelled",
      ],
      required: true,
      default: "planned",
      index: true,
    },
    deliveryEvidence: {
      type: [DistributionEvidenceSchema],
      default: undefined,
    },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

export default (mongoose.models
  .Distribution as mongoose.Model<IDistribution>) ||
  mongoose.model<IDistribution>(
    "Distribution",
    DistributionSchema,
    "distributions",
  );
