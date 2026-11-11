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

type AssetModel = {
  name: string;
};

interface AssetModelProps {
  value: string;
  onChange: (value: string) => void;
}

export function AssetModelBox({ value, onChange }: AssetModelProps) {
  const { data: assetModels = [], isLoading, isError } = useCachedOptions<AssetModel>(
    ["assetsModels"],
    "/api/settings/assetmodel"
  );

  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger className="w-full h-9">
        <SelectValue placeholder="Select a Model" />
      </SelectTrigger>
      <SelectContent>
        <ScrollArea className="h-48 w-full">
          <SelectGroup>
            <SelectOptionsSkullet
              id="select-asset-models"
              isLoading={isLoading}
              isError={isError}
              isEmpty={!isLoading && !isError && assetModels.length === 0}
              emptyText="No asset models found"
            >
              {assetModels.map((assetmodel) => (
                <SelectItem key={assetmodel.name} value={assetmodel.name}>
                  {assetmodel.name}
                </SelectItem>
              ))}
            </SelectOptionsSkullet>
          </SelectGroup>
        </ScrollArea>
      </SelectContent>
    </Select>
  );
}

export default AssetModelBox;
