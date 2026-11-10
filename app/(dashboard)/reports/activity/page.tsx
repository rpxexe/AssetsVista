"use client";

import React from "react";
import { ActivityLogTable } from "@/components/tables/activityLog";
import { History } from "lucide-react";

const ActivityReportPage = () => {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="border rounded-[2.5em] h-full p-4 w-full flex items-center space-x-2">
        <History strokeWidth={2.2} size={30} />
        <h3 className="text-3xl font-semibold">Activity &amp; Audit Logs</h3>
      </div>
      <div className="min-h-min grid grid-cols-1 md:grid-cols-1 gap-4 auto-rows-min">
        <div className="h-full">
          <ActivityLogTable />
        </div>
      </div>
    </div>
  );
};

export default ActivityReportPage;

