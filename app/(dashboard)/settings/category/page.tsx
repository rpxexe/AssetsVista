"use client";
import CategoryForm from "@/components/forms/settings/category/CategoryForm";
import {  CategoryTable } from "@/components/tables/categories";
import { LayoutPanelTop } from "lucide-react";

const Category = () => {
  return (
    <div className="p-3 min-h-screen ">
      <div className="border rounded-[2.5em] h-full p-4 w-full flex items-center space-x-2">
        <LayoutPanelTop strokeWidth={2.2} size={30} />
        <h3 className="text-3xl font-semibold ">All Categories</h3>
      </div>
      <div className="flex justify-end mt-4">
        <CategoryForm />
      </div>
      <div className="min-h-min grid grid-cols-1 md:grid-cols-1 gap-4 auto-rows-min">
        <div className="h-full">
          <CategoryTable />
        </div>
      </div>
    </div>
  );
}
export default Category