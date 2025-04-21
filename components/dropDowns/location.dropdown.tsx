import React, { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import axios from "axios";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "../ui/scroll-area";

type Location = {
  name: string;
};

interface LocationBoxProps {
  value: string;
  onChange: (value: string) => void;
}

export function LocationBox({ value, onChange }: LocationBoxProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get("/api/settings/location");
        setLocations(response.data.data);
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
        <SelectValue placeholder="Select a Location" />
      </SelectTrigger>
      <SelectContent>
        <ScrollArea className="h-48 w-full">
          <SelectGroup>
            {loading ? (
              <div className="w-full flex items-center justify-center">
                <Loader2 className="animate-spin" />
              </div>
            ) : error ? (
              <div className="w-full flex items-center justify-center">
                <p className="text-muted-foreground text-red-600">{error}</p>
              </div>
            ) : (
              locations.map((location) => (
                <SelectItem key={location.name} value={location.name}>
                  {location.name}
                </SelectItem>
              ))
            )}
          </SelectGroup>
        </ScrollArea>
      </SelectContent>
    </Select>
  );
}

export default LocationBox;
