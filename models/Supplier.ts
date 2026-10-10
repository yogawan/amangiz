import mongoose, { type Document, Schema } from "mongoose";

export type SupplierType =
  | "agriculture"
  | "livestock"
  | "seafood"
  | "processed_food"
  | "other";

export type SupplierVerificationStatus = "pending" | "verified" | "rejected";

export type SupplierStatus = "active" | "inactive";

export interface ISupplier extends Document {
  code: string;
  name: string;
  supplierType: SupplierType;
  address: string;
  contactName?: string;
  contactPhone?: string;
  verificationStatus: SupplierVerificationStatus;
  status: SupplierStatus;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    supplierType: {
      type: String,
      enum: ["agriculture", "livestock", "seafood", "processed_food", "other"],
      required: true,
    },
    address: { type: String, required: true },
    contactName: { type: String },
    contactPhone: { type: String },
    // Must reflect a verification process that actually happened, not a system assumption.
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      required: true,
      default: "pending",
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      required: true,
      default: "active",
    },
  },
  { timestamps: true },
);

export default (mongoose.models.Supplier as mongoose.Model<ISupplier>) ||
  mongoose.model<ISupplier>("Supplier", SupplierSchema, "suppliers");
