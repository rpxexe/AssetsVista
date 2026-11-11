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

type Company = {
  name: string;
};

interface CompanyBoxProps {
  value: string;
  onChange: (value: string) => void;
}

export function CompanyBox({ value, onChange }: CompanyBoxProps) {
  const { data: companies = [], isLoading, isError } = useCachedOptions<Company>(
    ["companies"],
    "/api/settings/company"
  );

  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger className="w-full h-9">
        <SelectValue placeholder="Select a Company" />
      </SelectTrigger>
      <SelectContent>
        <ScrollArea className="h-48 w-full">
          <SelectGroup>
            <SelectOptionsSkullet
              id="select-companies"
              isLoading={isLoading}
              isError={isError}
              isEmpty={!isLoading && !isError && companies.length === 0}
              emptyText="No companies found"
            >
              {companies.map((company) => (
                <SelectItem key={company.name} value={company.name}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectOptionsSkullet>
          </SelectGroup>
        </ScrollArea>
      </SelectContent>
    </Select>
  );
}

export default CompanyBox;
