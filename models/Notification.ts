import mongoose, { type Document, Schema, type Types } from "mongoose";

export type NotificationType =
  | "incident_reported"
  | "risk_escalated"
  | "batch_on_hold"
  | "investigation_updated"
  | "action_required";

export type NotificationResourceType = "incident" | "batch" | "distribution";

export interface INotification extends Document {
  recipientId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  resourceType?: NotificationResourceType;
  // Polymorphic depending on resourceType, so no single `ref`.
  resourceId?: Types.ObjectId;
  readAt?: Date;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "incident_reported",
        "risk_escalated",
        "batch_on_hold",
        "investigation_updated",
        "action_required",
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    resourceType: { type: String, enum: ["incident", "batch", "distribution"] },
    resourceId: { type: Schema.Types.ObjectId },
    readAt: { type: Date, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

NotificationSchema.index({ createdAt: -1 });

export default (mongoose.models
  .Notification as mongoose.Model<INotification>) ||
  mongoose.model<INotification>(
    "Notification",
    NotificationSchema,
    "notifications",
  );
