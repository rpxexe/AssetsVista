import mongoose from "mongoose";
import UserModel from "@/models/Users.model";
import { AssetModel } from "@/models/Assets.model";
import { PeopleModel } from "@/models/Peoples.model";
import { AssetModel_Model } from "@/models/setting/AssetModels.model";
import { CategoryModel } from "@/models/setting/Categories.model";
import { CompanyModel } from "@/models/setting/Companies.model";
import { DepartmentModel } from "@/models/setting/Departments.model";
import { ManufacturerModel } from "@/models/setting/Manufacturers.model";
import { StatusModel } from "@/models/setting/Status.model";

const globalForUserIndexes = globalThis as unknown as {
  _userIndexesCleanedPromise?: Promise<void> | null;
  _tenantIndexesCleanedPromise?: Promise<void> | null;
};

/**
 * Drops legacy non-sparse unique indexes (such as `auth0Id_1` left over from earlier auth setups)
 * and ensures `clerkId_1` is properly sparse so multiple pre-provisioned or admin users do not collide on `null`.
 */
export async function ensureCleanUserIndexes(force = false): Promise<void> {
  if (!force && globalForUserIndexes._userIndexesCleanedPromise) {
    return globalForUserIndexes._userIndexesCleanedPromise;
  }

  const runCleanup = async () => {
    try {
      const indexes = await UserModel.collection.indexes();

      for (const idx of indexes) {
        if (!idx.name || idx.name === "_id_") continue;

        const keyFields = Object.keys(idx.key || {});

        if (keyFields.includes("auth0Id")) {
          await UserModel.collection.dropIndex(idx.name).catch(() => null);
          continue;
        }

        if (keyFields.length === 1 && keyFields[0] === "clerkId" && idx.unique && !idx.sparse) {
          await UserModel.collection.dropIndex(idx.name).catch(() => null);
          await UserModel.collection
            .createIndex({ clerkId: 1 }, { unique: true, sparse: true })
            .catch(() => null);
        }

        if (keyFields.length === 1 && keyFields[0] === "username" && idx.unique && !idx.sparse) {
          await UserModel.collection.dropIndex(idx.name).catch(() => null);
        }
      }
    } catch (err: any) {
      if (err?.code === 26 || err?.codeName === "NamespaceNotFound") {
        return;
      }
      globalForUserIndexes._userIndexesCleanedPromise = null;
      throw err;
    }
  };

  globalForUserIndexes._userIndexesCleanedPromise = runCleanup();
  return globalForUserIndexes._userIndexesCleanedPromise;
}

async function migrateSingleFieldUniqueToTenantCompound(
  model: mongoose.Model<any>,
  fieldsToScope: string[]
): Promise<void> {
  try {
    const indexes = await model.collection.indexes();
    for (const idx of indexes) {
      if (!idx.name || idx.name === "_id_") continue;
      const keys = Object.keys(idx.key || {});
      if (keys.length === 1 && fieldsToScope.includes(keys[0]) && idx.unique) {
        await model.collection.dropIndex(idx.name).catch(() => null);
        await model.collection
          .createIndex({ userId: 1, [keys[0]]: 1 }, { unique: true })
          .catch(() => null);
      }
    }
  } catch (err: any) {
    if (err?.code === 26 || err?.codeName === "NamespaceNotFound") return;
  }
}

/**
 * Ensures old single-field global unique indexes (e.g. Status `name_1`, Asset `asset_tag_1`)
 * are converted to per-workspace compound unique indexes (`{ userId: 1, <field>: 1 }`).
 */
export async function ensureMultiTenantIndexes(force = false): Promise<void> {
  if (!force && globalForUserIndexes._tenantIndexesCleanedPromise) {
    return globalForUserIndexes._tenantIndexesCleanedPromise;
  }

  const runMigration = async () => {
    await Promise.all([
      ensureCleanUserIndexes(force),
      migrateSingleFieldUniqueToTenantCompound(AssetModel, ["asset_tag", "serial_number"]),
      migrateSingleFieldUniqueToTenantCompound(PeopleModel, ["username"]),
      migrateSingleFieldUniqueToTenantCompound(CompanyModel, ["name"]),
      migrateSingleFieldUniqueToTenantCompound(DepartmentModel, ["name"]),
      migrateSingleFieldUniqueToTenantCompound(CategoryModel, ["name"]),
      migrateSingleFieldUniqueToTenantCompound(AssetModel_Model, ["name"]),
      migrateSingleFieldUniqueToTenantCompound(ManufacturerModel, ["name"]),
      migrateSingleFieldUniqueToTenantCompound(StatusModel, ["name"]),
    ]);
  };

  globalForUserIndexes._tenantIndexesCleanedPromise = runMigration().catch((err) => {
    globalForUserIndexes._tenantIndexesCleanedPromise = null;
    throw err;
  });

  return globalForUserIndexes._tenantIndexesCleanedPromise;
}

/**
 * Checks whether an error was caused by a legacy duplicate-key index (like `auth0Id_1`).
 */
export function isLegacyUserIndexError(error: unknown): boolean {
  const errObj =
    typeof error === "object" && error !== null ? (error as Record<string, any>) : undefined;
  const msg =
    error instanceof Error
      ? error.message
      : typeof errObj?.message === "string"
      ? errObj.message
      : "";
  return (
    (errObj?.code === 11000 || errObj?.cause?.code === 11000 || /E11000/i.test(msg)) &&
    /auth0Id|clerkId|username/i.test(msg)
  );
}
