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

type Location = {
  name: string;
};

interface LocationBoxProps {
  value: string;
  onChange: (value: string) => void;
}

export function LocationBox({ value, onChange }: LocationBoxProps) {
  const { data: locations = [], isLoading, isError } = useCachedOptions<Location>(
    ["locations"],
    "/api/settings/location"
  );

  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger className="w-full h-9">
        <SelectValue placeholder="Select a Location" />
      </SelectTrigger>
      <SelectContent>
        <ScrollArea className="h-48 w-full">
          <SelectGroup>
            <SelectOptionsSkullet
              id="select-locations"
              isLoading={isLoading}
              isError={isError}
              isEmpty={!isLoading && !isError && locations.length === 0}
              emptyText="No locations found"
            >
              {locations.map((location) => (
                <SelectItem key={location.name} value={location.name}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectOptionsSkullet>
          </SelectGroup>
        </ScrollArea>
      </SelectContent>
    </Select>
  );
}

export default LocationBox;
