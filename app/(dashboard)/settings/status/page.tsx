import StatusForm from "@/components/forms/settings/status/StatusForm";
import { StatusTable } from "@/components/tables/status";
import { CircleDotDashed } from "lucide-react";

const Status = () => {
  return (
    <div className="p-3 min-h-screen ">
      <div className="border rounded-[2.5em] h-full p-4 w-full flex items-center space-x-2">
        <CircleDotDashed strokeWidth={2.2} size={30} />
        <h3 className="text-3xl font-semibold ">All Status</h3>
      </div>
      <div className="flex justify-end mt-4">
        <StatusForm />
      </div>
      <div className="min-h-min grid grid-cols-1 md:grid-cols-1 gap-4 auto-rows-min">
        <div className="h-full">
          <StatusTable />
        </div>
      </div>
    </div>
  );
}
export default Status