import React, { useEffect, useState, useRef } from "react";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import axios from "axios";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AssetModel = {
  name: string;
};

interface AssetModelProps {
  value: string;
  onChange: (value: string) => void;
}

export function AssetModelBox({ value, onChange }: AssetModelProps) {
  const [assetModels, setAssetModels] = useState<AssetModel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get("/api/settings/assetmodel");
        setAssetModels(response.data.data);
      } catch (err) {
        setError("Failed to fetch data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger className="w-full h-9">
        <SelectValue placeholder="Select a Model" />
      </SelectTrigger>
      <SelectContent>
        <ScrollArea className="h-48 w-full">
          <SelectGroup>
            {loading ? (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="animate-spin" />
              </div>
            ) : error ? (
              <div className="w-full flex items-center justify-center">
                <p className="text-muted-foreground text-red-600">{error}</p>
              </div>
            ) : (
              assetModels.map((assetmodel) => (
                <SelectItem key={assetmodel.name} value={assetmodel.name}>
                  {assetmodel.name}
                </SelectItem>
              ))
            )}
          </SelectGroup>
        </ScrollArea>
      </SelectContent>
    </Select>
  );
}

export default AssetModelBox;
