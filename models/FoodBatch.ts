import mongoose, { type Document, Schema, type Types } from "mongoose";

export type FoodBatchStatus =
  | "draft"
  | "prepared"
  | "released"
  | "on_hold"
  | "recalled"
  | "completed";

export interface IFoodBatchIngredient {
  supplierId: Types.ObjectId;
  ingredientName: string;
  quantity: number;
  unit: string;
  supplierBatchCode?: string;
}

export interface IFoodBatchStorageTemperature {
  value: number;
  unit: "C";
  recordedAt: Date;
}

export interface IFoodBatch extends Document {
  batchCode: string;
  sppgId: Types.ObjectId;
  ingredients: IFoodBatchIngredient[];
  menuName: string;
  productionDate: Date;
  expiryAt?: Date;
  storageTemperature?: IFoodBatchStorageTemperature[];
  productionNotes?: string;
  status: FoodBatchStatus;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FoodBatchIngredientSchema = new Schema<IFoodBatchIngredient>(
  {
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    ingredientName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true },
    supplierBatchCode: { type: String, trim: true },
  },
  { _id: false },
);

const FoodBatchStorageTemperatureSchema =
  new Schema<IFoodBatchStorageTemperature>(
    {
      value: { type: Number, required: true },
      unit: { type: String, enum: ["C"], required: true, default: "C" },
      recordedAt: { type: Date, required: true },
    },
    { _id: false },
  );

const FoodBatchSchema = new Schema<IFoodBatch>(
  {
    batchCode: { type: String, required: true, unique: true, trim: true },
    sppgId: {
      type: Schema.Types.ObjectId,
      ref: "SPPG",
      required: true,
      index: true,
    },
    ingredients: { type: [FoodBatchIngredientSchema], default: [] },
    menuName: { type: String, required: true, trim: true },
    productionDate: { type: Date, required: true, index: true },
    expiryAt: { type: Date },
    // Left undefined (not []) by default since Mongoose arrays default to []
    // otherwise, which would misrepresent "no temperature recorded yet".
    storageTemperature: {
      type: [FoodBatchStorageTemperatureSchema],
      default: undefined,
    },
    productionNotes: { type: String },
    // `recalled` and `on_hold` are distinct operational states, not synonyms.
    status: {
      type: String,
      enum: [
        "draft",
        "prepared",
        "released",
        "on_hold",
        "recalled",
        "completed",
      ],
      required: true,
      default: "draft",
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export default (mongoose.models.FoodBatch as mongoose.Model<IFoodBatch>) ||
  mongoose.model<IFoodBatch>("FoodBatch", FoodBatchSchema, "foodbatches");
