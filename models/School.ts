import mongoose, { type Document, Schema } from "mongoose";

export type SchoolLevel = "PAUD" | "SD" | "SMP" | "SMA" | "SMK" | "OTHER";

export type SchoolStatus = "active" | "inactive";

export interface ISchoolAddress {
  street: string;
  village?: string;
  district?: string;
  city: string;
  province: string;
}

export interface ISchool extends Document {
  code: string;
  name: string;
  level?: SchoolLevel;
  address: ISchoolAddress;
  contactName?: string;
  contactPhone?: string;
  recipientCapacity?: number;
  status: SchoolStatus;
  createdAt: Date;
  updatedAt: Date;
}

const SchoolAddressSchema = new Schema<ISchoolAddress>(
  {
    street: { type: String, required: true },
    village: { type: String },
    district: { type: String },
    city: { type: String, required: true },
    province: { type: String, required: true },
  },
  { _id: false },
);

const SchoolSchema = new Schema<ISchool>(
  {
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    level: {
      type: String,
      enum: ["PAUD", "SD", "SMP", "SMA", "SMK", "OTHER"],
    },
    address: { type: SchoolAddressSchema, required: true },
    contactName: { type: String },
    contactPhone: { type: String },
    recipientCapacity: { type: Number, min: 0 },
    status: {
      type: String,
      enum: ["active", "inactive"],
      required: true,
      default: "active",
    },
  },
  { timestamps: true },
);

export default (mongoose.models.School as mongoose.Model<ISchool>) ||
  mongoose.model<ISchool>("School", SchoolSchema, "schools");
