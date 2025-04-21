"use client"

import LocationForm from "@/components/forms/settings/Location/LocationForm";
import { LocationTable } from "@/components/tables/locations";
import { MapPin } from "lucide-react";

const Location = () => {
  return (
    <div className="p-3 min-h-screen ">
      <div className="border rounded-[2.5em] h-full p-4 w-full flex items-center space-x-2">
        <MapPin strokeWidth={2.2} size={30} />
        <h3 className="text-3xl font-semibold ">All Locations</h3>
      </div>
      <div className="flex justify-end mt-4"><LocationForm/></div>
      <div className="min-h-min grid grid-cols-1 md:grid-cols-1 gap-4 auto-rows-min">
        <div className="h-full">
          <LocationTable />
        </div>
      </div>
    </div>
  );
}
export default Location