"use client";

import React from "react";
import { SelectOptionsSkullet } from "@/components/skeletons/AppSkeletons";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "../ui/scroll-area";
import { useCachedOptions } from "@/hooks/useCachedOptions";

type Department = {
  name: string;
};

interface DepartmentBoxProps {
  value: string;
  onChange: (value: string) => void;
}

export function DepartmentBox({ value, onChange }: DepartmentBoxProps) {
  const { data: departments = [], isLoading, isError } = useCachedOptions<Department>(
    ["departments"],
    "/api/settings/department"
  );

  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger className="w-full h-9">
        <SelectValue placeholder="Select a Department" />
      </SelectTrigger>
      <SelectContent>
        <ScrollArea className="h-48 w-full">
          <SelectGroup>
            <SelectOptionsSkullet
              id="select-departments"
              isLoading={isLoading}
              isError={isError}
              isEmpty={!isLoading && !isError && departments.length === 0}
              emptyText="No departments found"
            >
              {departments.map((department) => (
                <SelectItem key={department.name} value={department.name}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectOptionsSkullet>
          </SelectGroup>
        </ScrollArea>
      </SelectContent>
    </Select>
  );
}

export default DepartmentBox;
