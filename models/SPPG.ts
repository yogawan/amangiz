import mongoose, { type Document, Schema } from "mongoose";

export type SppgStatus = "active" | "suspended" | "inactive";

export interface ISppgAddress {
  street: string;
  village?: string;
  district?: string;
  city: string;
  province: string;
  postalCode?: string;
}

export interface ISppgLocation {
  latitude: number;
  longitude: number;
}

export interface ISPPG extends Document {
  code: string;
  name: string;
  address: ISppgAddress;
  location?: ISppgLocation;
  contactName?: string;
  contactPhone?: string;
  status: SppgStatus;
  createdAt: Date;
  updatedAt: Date;
}

const SppgAddressSchema = new Schema<ISppgAddress>(
  {
    street: { type: String, required: true },
    village: { type: String },
    district: { type: String },
    city: { type: String, required: true },
    province: { type: String, required: true },
    postalCode: { type: String },
  },
  { _id: false },
);

const SppgLocationSchema = new Schema<ISppgLocation>(
  {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  { _id: false },
);

const SPPGSchema = new Schema<ISPPG>(
  {
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    address: { type: SppgAddressSchema, required: true },
    location: { type: SppgLocationSchema },
    contactName: { type: String },
    contactPhone: { type: String },
    status: {
      type: String,
      enum: ["active", "suspended", "inactive"],
      required: true,
      default: "active",
    },
  },
  { timestamps: true },
);

export default (mongoose.models.SPPG as mongoose.Model<ISPPG>) ||
  mongoose.model<ISPPG>("SPPG", SPPGSchema, "sppgs");
