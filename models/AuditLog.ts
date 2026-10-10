import mongoose, { type Document, Schema, type Types } from "mongoose";

export interface IAuditLogChange {
  field: string;
  before?: unknown;
  after?: unknown;
}

export interface IAuditLog extends Document {
  actorId: Types.ObjectId;
  action: string;
  resourceType: string;
  // Polymorphic depending on resourceType, so no single `ref`.
  resourceId: Types.ObjectId;
  organizationId?: Types.ObjectId;
  changes?: IAuditLogChange[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const AuditLogChangeSchema = new Schema<IAuditLogChange>(
  {
    field: { type: String, required: true },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

// Append-only: no `updatedAt`, and this model must never be exposed through
// ordinary CRUD update/delete endpoints.
const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: { type: String, required: true },
    resourceType: { type: String, required: true, index: true },
    resourceId: { type: Schema.Types.ObjectId, required: true, index: true },
    organizationId: { type: Schema.Types.ObjectId },
    changes: { type: [AuditLogChangeSchema], default: undefined },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

AuditLogSchema.index({ createdAt: -1 });

export default (mongoose.models.AuditLog as mongoose.Model<IAuditLog>) ||
  mongoose.model<IAuditLog>("AuditLog", AuditLogSchema, "auditlogs");
