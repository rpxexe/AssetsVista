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

type Category = {
  name: string;
};

interface CategoryProps {
  value: string;
  onChange: (value: string) => void;
}

export function CategoryBox({ value, onChange }: CategoryProps) {
  const { data: categories = [], isLoading, isError } = useCachedOptions<Category>(
    ["categories"],
    "/api/settings/category"
  );

  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger className="w-full h-9">
        <SelectValue placeholder="Select a Category" />
      </SelectTrigger>
      <SelectContent>
        <ScrollArea className="h-48 w-full">
          <SelectGroup>
            <SelectOptionsSkullet
              id="select-categories"
              isLoading={isLoading}
              isError={isError}
              isEmpty={!isLoading && !isError && categories.length === 0}
              emptyText="No categories found"
            >
              {categories.map((category) => (
                <SelectItem key={category.name} value={category.name}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectOptionsSkullet>
          </SelectGroup>
        </ScrollArea>
      </SelectContent>
    </Select>
  );
}

export default CategoryBox;
