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
            <SelectOptionsSkullet
              id="select-people"
              isLoading={isLoading}
              isError={isError}
              errorText="Failed to fetch people"
              isEmpty={!isLoading && !isError && people.length === 0}
              emptyText="No people found"
            >
              {people.map((person) => {
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
              })}
            </SelectOptionsSkullet>
          </SelectGroup>
        </ScrollArea>
      </SelectContent>
    </Select>
  );
}

export default PeopleBox;
