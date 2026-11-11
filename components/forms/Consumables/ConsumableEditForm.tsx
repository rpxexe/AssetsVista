"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, Loader2, SquarePen } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import CategoryBox from "@/components/dropDowns/category.dropdown";
import CompanyBox from "@/components/dropDowns/company.dropdown";
import ManufacturerBox from "@/components/dropDowns/manufacturer.dropdown";
import SupplierBox from "@/components/dropDowns/supplier.dropdown";
import LocationBox from "@/components/dropDowns/location.dropdown";
import { ImageUploadField } from "@/components/ImageUploadField";

const consumableSchema = z.object({
  name: z.string().min(1, "Consumable name is required"),
  category: z.string().min(1, "Category is required"),
  company: z.string().optional(),
  manufacturer: z.string().optional(),
  supplier: z.string().optional(),
  location: z.string().optional(),
  item_no: z.string().optional(),
  order_number: z.string().optional(),
  qty: z.coerce.number().min(0, "Quantity must be at least 0"),
  min_amt: z.coerce.number().min(0).optional(),
  purchase_cost: z.coerce.number().min(0).optional(),
  purchase_date: z.date().optional(),
  image: z.string().optional(),
});

type ConsumableFormValues = z.infer<typeof consumableSchema>;

interface ConsumableEditFormProps {
  id: string;
}

export function ConsumableEditForm({ id }: ConsumableEditFormProps) {
  const [open, setOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ConsumableFormValues>({
    resolver: zodResolver(consumableSchema) as any,
    defaultValues: {
      name: "",
      category: "",
      company: "",
      manufacturer: "",
      supplier: "",
      location: "",
      item_no: "",
      order_number: "",
      qty: 1,
      min_amt: 0,
      purchase_cost: 0,
      purchase_date: new Date(),
      image: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    const fetchConsumable = async () => {
      setIsFetching(true);
      try {
        const response = await axios.get(`/api/core/consumables/${id}`);
        const c = response.data.data;
        if (c) {
          form.reset({
            name: c.name || "",
            category: c.category?._id || c.category?.name || "",
            company: c.company?._id || c.company?.name || "",
            manufacturer: c.manufacturer?._id || c.manufacturer?.name || "",
            supplier: c.supplier?._id || c.supplier?.name || "",
            location: c.location?._id || c.location?.name || "",
            item_no: c.item_no || "",
            order_number: c.order_number || "",
            qty: c.qty ?? 1,
            min_amt: c.min_amt ?? 0,
            purchase_cost: c.purchase_cost ?? 0,
            purchase_date: c.purchase_date ? new Date(c.purchase_date) : new Date(),
            image: c.image || "",
          });
        }
      } catch (err: any) {
        console.error("Failed to fetch consumable:", err);
        toast({
          title: "Error",
          description: "Could not load consumable details.",
          variant: "destructive",
        });
      } finally {
        setIsFetching(false);
      }
    };

    fetchConsumable();
  }, [open, id, form, toast]);

  const onSubmit = async (values: ConsumableFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await axios.put(`/api/core/consumables/${id}`, values);
      toast({
        title: "Consumable Updated",
        description: response.data.message || "Consumable updated successfully.",
      });

      queryClient.invalidateQueries({ queryKey: ["consumables"] });
      setOpen(false);
    } catch (err: any) {
      console.error("Failed to update consumable:", err);
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to update consumable.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="outline" className="border">
          <SquarePen size={18} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SquarePen className="h-5 w-5" />
            Edit Consumable
          </DialogTitle>
          <DialogDescription>Update details for this consumable.</DialogDescription>
        </DialogHeader>

        {isFetching ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="max-h-[60vh] overflow-y-auto pr-2">
                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Consumable Name *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category *</FormLabel>
                          <FormControl>
                            <CategoryBox value={field.value || ""} onChange={field.onChange} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company</FormLabel>
                          <FormControl>
                            <CompanyBox value={field.value || ""} onChange={field.onChange} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="manufacturer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Manufacturer</FormLabel>
                          <FormControl>
                            <ManufacturerBox value={field.value || ""} onChange={field.onChange} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="supplier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Supplier</FormLabel>
                          <FormControl>
                            <SupplierBox value={field.value || ""} onChange={field.onChange} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <LocationBox value={field.value || ""} onChange={field.onChange} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="item_no"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item # / SKU</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <FormField
                      control={form.control}
                      name="qty"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Quantity *</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="min_amt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Min Alert Qty</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="purchase_cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit Cost ($)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" min="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="order_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Order Number</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="purchase_date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Purchase Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="image"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Consumable Image</FormLabel>
                        <FormControl>
                          <ImageUploadField
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="https://example.com/consumable.png"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ConsumableEditForm;

