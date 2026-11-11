import dbconnect from "@/lib/dbconnect";
import { AccessoriesModel } from "@/models/Accessories.model";
import { AssetModel } from "@/models/Assets.model";
import { ComponentModel } from "@/models/Components.model";
import { ConsumableModel } from "@/models/Consumables.model";
import { LicenseModel } from "@/models/Licenses.model";
import { SettingsModel } from "@/models/Settings.model";
import { AssetModel_Model } from "@/models/setting/AssetModels.model";
import { StatusModel } from "@/models/setting/Status.model";

export type LowStockItemType =
  | "consumable"
  | "accessory"
  | "component"
  | "model"
  | "license";

export interface LowStockItem {
  id: string;
  compositeId: string;
  name: string;
  type: LowStockItemType;
  typeLabel: string;
  href: string;
  qty: number;
  min_amt: number;
  remaining: number;
  percent: number;
  canAdjustQuantity: boolean;
}

export interface LowInventoryResult {
  items: LowStockItem[];
  alertThreshold: number;
}

/**
 * Computes low-inventory items across Consumables, Accessories, Components, Asset Models,
 * and Licenses for a single workspace using Snipe-IT's `remaining < (min_amt + alert_threshold)` rule.
 */
export async function getLowInventory(workspaceId: string): Promise<LowInventoryResult> {
  await dbconnect();
  const scope = { userId: workspaceId };

  const [
    settings,
    consumables,
    accessories,
    components,
    assetModels,
    licenses,
    deployableStatuses,
  ] = await Promise.all([
    SettingsModel.findOne(scope).select("alert_threshold").lean<{ alert_threshold?: number } | null>(),
    ConsumableModel.find({ ...scope, min_amt: { $gt: 0 } })
      .select("name qty min_amt")
      .lean<Array<{ _id: any; name: string; qty?: number; min_amt?: number }>>(),
    AccessoriesModel.find({ ...scope, min_amt: { $gt: 0 } })
      .select("name qty min_amt")
      .lean<Array<{ _id: any; name: string; qty?: number; min_amt?: number }>>(),
    ComponentModel.find({ ...scope, min_amt: { $gt: 0 } })
      .select("name qty min_amt")
      .lean<Array<{ _id: any; name: string; qty?: number; min_amt?: number }>>(),
    AssetModel_Model.find({ ...scope, min_amt: { $gt: 0 } })
      .select("name min_amt")
      .lean<Array<{ _id: any; name: string; min_amt?: number }>>(),
    LicenseModel.find({ ...scope, min_amt: { $gt: 0 } })
      .select("name seats seats_available min_amt")
      .lean<Array<{ _id: any; name: string; seats?: number; seats_available?: number; min_amt?: number }>>(),
    StatusModel.find({ ...scope, type: "deployable" })
      .select("_id")
      .lean<Array<{ _id: any }>>(),
  ]);

  const alertThreshold = Math.max(0, Number(settings?.alert_threshold ?? 0));

  // Count available unassigned deployable assets per Asset Model in one aggregate
  const availableAssetsByModel = new Map<string, number>();
  const totalAssetsByModel = new Map<string, number>();

  if (assetModels.length > 0) {
    const deployableIds = new Set(deployableStatuses.map((s) => s._id.toString()));
    const modelIds = assetModels.map((m) => m._id);

    const assetsAgg = await AssetModel.aggregate([
      { $match: { userId: workspaceId, asset_model: { $in: modelIds } } },
      {
        $project: {
          asset_model: 1,
          status: 1,
          assigned_to: 1,
        },
      },
    ]);

    for (const a of assetsAgg) {
      const mKey = a.asset_model?.toString();
      if (!mKey) continue;
      totalAssetsByModel.set(mKey, (totalAssetsByModel.get(mKey) || 0) + 1);
      const isAvailable =
        !a.assigned_to &&
        (deployableIds.size === 0 || (a.status && deployableIds.has(a.status.toString())));
      if (isAvailable) {
        availableAssetsByModel.set(mKey, (availableAssetsByModel.get(mKey) || 0) + 1);
      }
    }
  }

  const items: LowStockItem[] = [];

  const computePercent = (remaining: number, capacity: number) => {
    if (capacity <= 0) return remaining <= 0 ? 0 : 100;
    return Math.max(0, Math.min(100, Math.round((remaining / capacity) * 100)));
  };

  for (const con of consumables) {
    const qty = Number(con.qty ?? 0);
    const minAmt = Number(con.min_amt ?? 0);
    if (qty < minAmt + alertThreshold) {
      const id = con._id.toString();
      items.push({
        id,
        compositeId: `consumable-${id}`,
        name: con.name,
        type: "consumable",
        typeLabel: "Consumable",
        href: `/consumables?search=${encodeURIComponent(con.name)}`,
        qty,
        min_amt: minAmt,
        remaining: qty,
        percent: computePercent(qty, Math.max(qty, minAmt)),
        canAdjustQuantity: true,
      });
    }
  }

  for (const acc of accessories) {
    const qty = Number(acc.qty ?? 0);
    const minAmt = Number(acc.min_amt ?? 0);
    if (qty < minAmt + alertThreshold) {
      const id = acc._id.toString();
      items.push({
        id,
        compositeId: `accessory-${id}`,
        name: acc.name,
        type: "accessory",
        typeLabel: "Accessory",
        href: `/accessories?search=${encodeURIComponent(acc.name)}`,
        qty,
        min_amt: minAmt,
        remaining: qty,
        percent: computePercent(qty, Math.max(qty, minAmt)),
        canAdjustQuantity: true,
      });
    }
  }

  for (const comp of components) {
    const qty = Number(comp.qty ?? 0);
    const minAmt = Number(comp.min_amt ?? 0);
    if (qty < minAmt + alertThreshold) {
      const id = comp._id.toString();
      items.push({
        id,
        compositeId: `component-${id}`,
        name: comp.name,
        type: "component",
        typeLabel: "Component",
        href: `/components?search=${encodeURIComponent(comp.name)}`,
        qty,
        min_amt: minAmt,
        remaining: qty,
        percent: computePercent(qty, Math.max(qty, minAmt)),
        canAdjustQuantity: true,
      });
    }
  }

  for (const am of assetModels) {
    const id = am._id.toString();
    const minAmt = Number(am.min_amt ?? 0);
    const remaining = availableAssetsByModel.get(id) ?? 0;
    const total = totalAssetsByModel.get(id) ?? remaining;
    if (remaining < minAmt + alertThreshold) {
      items.push({
        id,
        compositeId: `model-${id}`,
        name: am.name,
        type: "model",
        typeLabel: "Asset Model",
        href: `/settings/assetmodel?search=${encodeURIComponent(am.name)}`,
        qty: total,
        min_amt: minAmt,
        remaining,
        percent: computePercent(remaining, Math.max(total, minAmt)),
        canAdjustQuantity: false,
      });
    }
  }

  for (const lic of licenses) {
    const id = lic._id.toString();
    const seats = Number(lic.seats ?? 1);
    const remaining = lic.seats_available !== undefined ? Number(lic.seats_available) : seats;
    const minAmt = Number(lic.min_amt ?? 0);
    if (remaining < minAmt + alertThreshold) {
      items.push({
        id,
        compositeId: `license-${id}`,
        name: lic.name,
        type: "license",
        typeLabel: "License",
        href: `/licenses?search=${encodeURIComponent(lic.name)}`,
        qty: seats,
        min_amt: minAmt,
        remaining,
        percent: computePercent(remaining, seats),
        canAdjustQuantity: false,
      });
    }
  }

  items.sort((a, b) => a.remaining - b.remaining);
  return { items, alertThreshold };
}

