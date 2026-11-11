"use client";

import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SelectOptionsSkullet } from "@/components/skeletons/AppSkeletons";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCachedOptions } from "@/hooks/useCachedOptions";

type Status = {
  name: string;
};

interface StatusProps {
  value: string;
  onChange: (value: string) => void;
}

export function StatusBox({ value, onChange }: StatusProps) {
  const { data: statuses = [], isLoading, isError } = useCachedOptions<Status>(
    ["status"],
    "/api/settings/status"
  );

  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger className="w-full h-9">
        <SelectValue placeholder="Select a Status" />
      </SelectTrigger>
      <SelectContent>
        <ScrollArea className="h-48 w-full">
          <SelectGroup>
            <SelectOptionsSkullet
              id="select-statuses"
              isLoading={isLoading}
              isError={isError}
              isEmpty={!isLoading && !isError && statuses.length === 0}
              emptyText="No statuses found"
            >
              {statuses.map((status) => (
                <SelectItem key={status.name} value={status.name}>
                  {status.name}
                </SelectItem>
              ))}
            </SelectOptionsSkullet>
          </SelectGroup>
        </ScrollArea>
      </SelectContent>
    </Select>
  );
}

export default StatusBox;
