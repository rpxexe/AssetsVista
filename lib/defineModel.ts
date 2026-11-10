import mongoose, { Model, Schema } from "mongoose";

/**
 * Registers or hot-reloads a Mongoose model in Next.js environments.
 * When Next.js HMR reloads a schema file with newly added fields or indexes,
 * this clears any stale cached model definition so updated schema paths take effect immediately.
 */
export function defineModel<T>(name: string, schema: Schema<T>): Model<T> {
  const existing = mongoose.models[name];
  if (existing) {
    const existingPaths = Object.keys(existing.schema.paths);
    const currentPaths = Object.keys(schema.paths);
    const schemaChanged =
      existingPaths.length !== currentPaths.length ||
      currentPaths.some((p) => !existing.schema.paths[p]);

    if (!schemaChanged) {
      return existing as Model<T>;
    }

    try {
      mongoose.deleteModel(name);
    } catch {
      // ignore if not registered on default mongoose instance
    }
    try {
      mongoose.connection?.deleteModel(name);
    } catch {
      // ignore if not registered on active connection
    }
  }

  return mongoose.model<T>(name, schema);
}
