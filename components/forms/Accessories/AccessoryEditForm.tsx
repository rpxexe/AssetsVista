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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import CategoryBox from "@/components/dropDowns/category.dropdown";
import CompanyBox from "@/components/dropDowns/company.dropdown";
import ManufacturerBox from "@/components/dropDowns/manufacturer.dropdown";
import SupplierBox from "@/components/dropDowns/supplier.dropdown";
import LocationBox from "@/components/dropDowns/location.dropdown";
import { ImageUploadField } from "@/components/ImageUploadField";

const accessorySchema = z.object({
  name: z.string().min(1, "Accessory name is required"),
  category: z.string().min(1, "Category is required"),
  company: z.string().optional(),
  manufacturer: z.string().optional(),
  supplier: z.string().optional(),
  location: z.string().optional(),
  qty: z.coerce.number().min(0, "Quantity must be at least 0"),
  min_amt: z.coerce.number().min(0).optional(),
  purchase_cost: z.coerce.number().min(0).optional(),
  order_number: z.string().optional(),
  purchase_date: z.date().optional(),
  image: z.string().optional(),
});

type AccessoryFormValues = z.infer<typeof accessorySchema>;

interface AccessoryEditFormProps {
  id: string;
}

export function AccessoryEditForm({ id }: AccessoryEditFormProps) {
  const [open, setOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AccessoryFormValues>({
    resolver: zodResolver(accessorySchema) as any,
    defaultValues: {
      name: "",
      category: "",
      company: "",
      manufacturer: "",
      supplier: "",
      location: "",
      qty: 1,
      min_amt: 0,
      purchase_cost: 0,
      order_number: "",
      purchase_date: new Date(),
      image: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    const fetchAccessory = async () => {
      setIsFetching(true);
      try {
        const response = await axios.get(`/api/core/accessories/${id}`);
        const acc = response.data.data;
        if (acc) {
          form.reset({
            name: acc.name || "",
            category: acc.category?._id || acc.category?.name || "",
            company: acc.company?._id || acc.company?.name || "",
            manufacturer: acc.manufacturer?._id || acc.manufacturer?.name || "",
            supplier: acc.supplier?._id || acc.supplier?.name || "",
            location: acc.location?._id || acc.location?.name || "",
            qty: acc.qty ?? 1,
            min_amt: acc.min_amt ?? 0,
            purchase_cost: acc.purchase_cost ?? 0,
            order_number: acc.order_number || "",
            purchase_date: acc.purchase_date ? new Date(acc.purchase_date) : new Date(),
            image: acc.image || "",
          });
        }
      } catch (err: any) {
        console.error("Failed to fetch accessory:", err);
        toast({
          title: "Error",
          description: "Could not load accessory details.",
          variant: "destructive",
        });
      } finally {
        setIsFetching(false);
      }
    };

    fetchAccessory();
  }, [open, id, form, toast]);

  const onSubmit = async (values: AccessoryFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await axios.put(`/api/core/accessories/${id}`, values);
      toast({
        title: "Accessory Updated",
        description: response.data.message || "Accessory updated successfully.",
      });

      queryClient.invalidateQueries({ queryKey: ["accessories"] });
      setOpen(false);
    } catch (err: any) {
      console.error("Failed to update accessory:", err);
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to update accessory.",
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
            Edit Accessory
          </DialogTitle>
          <DialogDescription>Update details for this accessory.</DialogDescription>
        </DialogHeader>

        {isFetching ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <ScrollArea className="max-h-[60vh] pr-3">
                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Accessory Name *</FormLabel>
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

                  <FormField
                    control={form.control}
                    name="image"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Accessory Image</FormLabel>
                        <FormControl>
                          <ImageUploadField
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="https://example.com/accessory.png"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </ScrollArea>

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

export default AccessoryEditForm;

