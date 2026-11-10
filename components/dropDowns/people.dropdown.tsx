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

export type PersonOption = {
  _id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  employee_num?: string;
};

interface PeopleBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function PeopleBox({
  value,
  onChange,
  placeholder = "Select a Person",
}: PeopleBoxProps) {
  const { data: people = [], isLoading, isError } = useCachedOptions<PersonOption>(
    ["people"],
    "/api/core/people"
  );

  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger className="w-full h-9">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <ScrollArea className="h-48 w-full">
          <SelectGroup>
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center p-4">
                <Loader2 className="animate-spin h-5 w-5" />
              </div>
            ) : isError ? (
              <div className="w-full flex items-center justify-center p-2">
                <p className="text-muted-foreground text-red-600 text-sm">
                  Failed to fetch people
                </p>
              </div>
            ) : people.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground text-center">
                No people found
              </div>
            ) : (
              people.map((person) => {
                const label =
                  person.first_name || person.last_name
                    ? `${person.first_name || ""} ${person.last_name || ""}`.trim()
                    : person.name || "User";
                return (
                  <SelectItem key={person._id} value={person._id}>
                    {label}
                    {person.email ? ` (${person.email})` : ""}
                  </SelectItem>
                );
              })
            )}
          </SelectGroup>
        </ScrollArea>
      </SelectContent>
    </Select>
  );
}

export default PeopleBox;
