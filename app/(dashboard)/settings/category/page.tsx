"use client";
import CategoryForm from "@/components/forms/settings/category/CategoryForm";
import {  CategoryTable } from "@/components/tables/categories";
import { LayoutPanelTop } from "lucide-react";

const Category = () => {
  return (
    <div className="p-4 pt-0 space-y-4">
      <div className="border rounded-[2.5em] p-4 w-full flex items-center space-x-2">
        <LayoutPanelTop strokeWidth={2.2} size={30} />
        <h3 className="text-3xl font-semibold">All Categories</h3>
      </div>
      <div className="flex justify-end">
        <CategoryForm />
      </div>
      <div className="grid grid-cols-1 gap-4">
        <CategoryTable />
      </div>
    </div>
  );
}
export default Category