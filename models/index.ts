// Barrel import so every schema is registered on the active mongoose
// connection. Without this, `populate()` on a ref whose model file happens not
// to be imported by the current route throws MissingSchemaError.
export { default as AuditLog } from "./AuditLog";
export { default as Distribution } from "./Distribution";
export { default as FoodBatch } from "./FoodBatch";
export { default as Incident } from "./Incident";
export { default as Investigation } from "./Investigation";
export { default as Notification } from "./Notification";
export { default as RiskAssessment } from "./RiskAssessment";
export { default as School } from "./School";
export { default as SPPG } from "./SPPG";
export { default as Supplier } from "./Supplier";
export { default as User } from "./User";
