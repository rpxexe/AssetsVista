import axios from "axios";

export interface BulkRequestParams {
  entity: string;
  action: string;
  ids: string[];
  payload?: Record<string, unknown>;
}

export async function executeBulkAction(params: BulkRequestParams): Promise<{
  success: boolean;
  message: string;
  count: number;
}> {
  const res = await axios.post("/api/bulk", params);
  return {
    success: Boolean(res.data?.success),
    message: res.data?.message || "Bulk action completed.",
    count: Number(res.data?.count || 0),
  };
}

