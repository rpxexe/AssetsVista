"use client";

import React from "react";
import { Loader2 } from "lucide-react";
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
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="animate-spin" />
              </div>
            ) : isError ? (
              <div className="w-full flex items-center justify-center">
                <p className="text-muted-foreground text-red-600">Failed to fetch data</p>
              </div>
            ) : (
              departments.map((department) => (
                <SelectItem key={department.name} value={department.name}>
                  {department.name}
                </SelectItem>
              ))
            )}
          </SelectGroup>
        </ScrollArea>
      </SelectContent>
    </Select>
  );
}

export default DepartmentBox;
