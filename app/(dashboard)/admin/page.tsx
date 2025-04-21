"use client";

import RadialGraph from "@/components/graphs/RadialGraph";
import { CategoryTable } from "@/components/tables/categories";
import { LocationTable } from "@/components/tables/locations";
import { SupplierTable } from "@/components/tables/supplier";
import axios from "axios";
import {
  Droplets,
  FilePieChart,
  Keyboard,
  LibraryBig,
  Microchip,
  CircleArrowRight,
  LayoutDashboard,
  Loader2,
  CloudAlert,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
export type CountTotal = {
  Assets: number;
  Licenses: number;
  Accessories: number;
  Consumables: number;
  Components: number;
};

export default function Page() {
  const [total, setTotal] = useState<CountTotal | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get("/api/counttotals");
        setTotal(response.data.data);
        console.log(response.data.data);
      } catch (err) {
        setError("Failed to fetch data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const data = [
    {
      title: "Assets",
      count: total?.Assets ?? 0,
      icon: LibraryBig,
      url: "/assets/listall",
    },
    {
      title: "Licenses",
      count: total?.Licenses ?? 0,
      icon: FilePieChart,
      url: "/licenses",
    },
    {
      title: "Accessories",
      count: total?.Accessories ?? 0,
      icon: Keyboard,
      url: "/accessories",
    },
    {
      title: "Consumables",
      count: total?.Consumables ?? 0,
      icon: Droplets,
      url: "/consumables",
    },
    {
      title: "Components",
      count: total?.Components ?? 0,
      icon: Microchip,
      url: "/components",
    },
    // {
    //   title: "People",

    //   icon: Users,
    //   url: "/people",
    // },
  ];
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0 ">
      <div className="border rounded-[2.5em] h-full p-4 w-full flex items-center space-x-2">
        <LayoutDashboard strokeWidth={2.2} size={28} />
        <h3 className="text-3xl font-semibold ">Dashboard</h3>
      </div>
      <div className="grid auto-rows-min gap-2 md:grid-cols-5">
        {data.map((item) => (
          <div
            key={item.title}
            className="w-full relative rounded-[2.5em] p-6 border text-sidebar-foreground hover:bg-primary-foreground transition-transform duration-400 ease-in-out hover:scale-[0.97] active:scale-[0.9]"
          >
            <div className="flex flex-col justify-between h-full gap-20 transition-transform duration-400 ease-in-out group-hover:scale-[0.96]">
              <div className="flex justify-between items-center">
                <span className="font-bold">
                  <item.icon />
                </span>
                <p className="m-0 font-semibold ">{item.title}</p>
              </div>

              <Link href={item.url}>
                <div className="flex justify-between items-end">
                  <p className="m-0 font-semibold">View All</p>
                  <CircleArrowRight />
                </div>
              </Link>
            </div>

            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <span className="text-[2.5em] font-semibold transition-transform duration-400 ease-in-out group-hover:scale-105">
                {loading ? (
                  <Loader2 className="animate-spin text-muted-foreground" />
                ) : error ? (
                  <CloudAlert className="stroke-red-500 w-10 h-10" />
                ) : (
                  item.count
                )}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="min-h-min grid grid-cols-1 md:grid-cols-[1.433fr,1fr] gap-4 auto-rows-min">
        <div className=" border rounded-[2.5em] h-full p-5">
          <h3 className="text-2xl font-medium">Assets Categories</h3>
          <CategoryTable />
        </div>
        <div className="border rounded-[2.5em] h-full p-5">
          <h3 className="text-2xl font-medium">Assets by Status</h3>
          <div className="flex items-center justify-center w-full">
            <RadialGraph />
          </div>
        </div>
      </div>
      <div className="min-h-min grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-min">
        <div className=" border rounded-[2.5em] h-full p-5">
          <h3 className="text-2xl font-medium">Locations</h3>
          <LocationTable />
        </div>
        <div className="border rounded-[2.5em] h-full p-5">
          <h3 className="text-2xl font-medium">Suppliers</h3>
          <SupplierTable />
        </div>
      </div>
    </div>
  );
}
