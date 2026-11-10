"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
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
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="animate-spin" />
              </div>
            ) : isError ? (
              <div className="w-full flex items-center justify-center">
                <p className="text-muted-foreground text-red-600">Failed to fetch data</p>
              </div>
            ) : (
              companies.map((company) => (
                <SelectItem key={company.name} value={company.name}>
                  {company.name}
                </SelectItem>
              ))
            )}
          </SelectGroup>
        </ScrollArea>
      </SelectContent>
    </Select>
  );
}

export default CompanyBox;
