"use client"
import React, { useEffect, useState } from "react";
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

type Category = {
  name: string;
};

interface CategoryProps {
  value: string;
  onChange: (value: string) => void;
}

export function CategoryBox({ value, onChange }: CategoryProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get("/api/settings/category");
        setCategories(response.data.data);
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
        <SelectValue placeholder="Select a Category" />
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
              categories.map((category) => (
                <SelectItem key={category.name} value={category.name}>
                  {category.name}
                </SelectItem>
              ))
            )}
          </SelectGroup>
        </ScrollArea>
      </SelectContent>
    </Select>
  );
}

export default CategoryBox;
