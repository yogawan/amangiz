import mongoose, { type Document, Schema, type Types } from "mongoose";

export type UserRole =
  | "admin"
  | "sppg_operator"
  | "school_operator"
  | "investigator";

export type OrganizationType =
  | "system"
  | "sppg"
  | "school"
  | "health_authority";

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  organizationType: OrganizationType;
  organizationId?: Types.ObjectId;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["admin", "sppg_operator", "school_operator", "investigator"],
      required: true,
    },
    organizationType: {
      type: String,
      enum: ["system", "sppg", "school", "health_authority"],
      required: true,
    },
    // Points at SPPG or School depending on organizationType, so no single `ref`.
    organizationId: { type: Schema.Types.ObjectId },
    isActive: { type: Boolean, required: true, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

// `mongoose.models.User` guards against model redefinition during Next.js hot reload.
export default (mongoose.models.User as mongoose.Model<IUser>) ||
  mongoose.model<IUser>("User", UserSchema, "users");
