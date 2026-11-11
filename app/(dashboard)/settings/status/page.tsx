import StatusForm from "@/components/forms/settings/status/StatusForm";
import { StatusTable } from "@/components/tables/status";
import { CircleDotDashed } from "lucide-react";

const Status = () => {
  return (
    <div className="p-4 pt-0 space-y-4">
      <div className="border rounded-[2.5em] p-4 w-full flex items-center space-x-2">
        <CircleDotDashed strokeWidth={2.2} size={30} />
        <h3 className="text-3xl font-semibold">All Status</h3>
      </div>
      <div className="flex justify-end">
        <StatusForm />
      </div>
      <div className="grid grid-cols-1 gap-4">
        <StatusTable />
      </div>
    </div>
  );
}
export default Status