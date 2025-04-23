import AssetModelBox from "@/components/dropDowns/assetModel.dropdown";
import CompanyBox from "@/components/dropDowns/company.dropdown";
import DepartmentBox from "@/components/dropDowns/department.dropdown";
import LocationBox from "@/components/dropDowns/location.dropdown";
import ManufacturerBox from "@/components/dropDowns/manufacturer.dropdown";
import StatusBox from "@/components/dropDowns/status.dropdown";
import SupplierBox from "@/components/dropDowns/supplier.dropdown";
import {
  DialogClose,
  DialogFooter,
  Dialog,
  DialogContent,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ApiResponse } from "@/types/ApiResponse";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { AxiosError } from "axios";
import { format } from "date-fns";
import { CalendarIcon, Loader2, PlusIcon } from "lucide-react";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../../ui/button";
import { Calendar } from "../../ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CategoryBox } from "@/components/dropDowns/category.dropdown";
const formSchema = z.object({
  name: z
    .string()
    .min(2, {
      message: "License name must be at least 2 characters.",
    })
    .nonempty({
      message: "License name can't be Empty",
    }),
  category: z.string().nonempty({
    message: "Category can't be empty",
  }),
  product_key: z.string().nonempty({
    message: "Product Key can't be Empty",
  }),
  company: z.string().nonempty({
    message: "Company should not be Empty",
  }),
  supplier: z.string().nonempty({
    message: "Supplier shoud not be empty",
  }),
  manufacturer: z.string().nonempty({
    message: "Manufacturer shoud not be empty",
  }),
  license_to_name: z.string().nonempty({
    message: "License to Name shoud not be empty",
  }),
  license_to_email: z.string().nonempty({
    message: "License to Email shoud not be empty",
  }),
  seats: z.number({
    required_error: "Seats is required",
  }),

  order_number: z.string(),
  purchase_date: z.date({
    required_error: "Purchase Date should not be empty",
  }),
  expiry_date: z.date({
    required_error: "Purchase Date should not be empty",
  }),
  termination_date: z.date({
    required_error: "Termination Date should not be empty",
  }),
  purchase_cost: z.number({
    required_error: "Purchase Cost is required",
  }),
});

const LicenseForm = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: "",
      product_key: "",
      company: "",
      supplier: "",
      manufacturer: "",
      license_to_name: "",
      license_to_email: "",
      seats: 0,
      expiry_date: new Date(),
      order_number: "",
      purchase_date: new Date(),
      termination_date: new Date(),
      purchase_cost: 0,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      console.log("Form values before submission:", values);

      const response = await axios.post<ApiResponse>("/api/core/license", {
        name:values.name,
        categoryName: values.category,
        product_key:values.product_key,
        companyName: values.company,
        supplierName:values.supplier,
        manufacturerName:values.manufacturer,
        license_to_name:values.license_to_name,
        license_to_email:values.license_to_email,
        seats:values.seats,
        expiry_date:values.expiry_date,
        order_number:values.order_number,
        purchase_date:values.purchase_date,
        termination_date:values.termination_date,
        purchase_cost:values.purchase_cost,
      });

      console.log(response.data);

      toast({
        title: response.data.message,
        description: "License Added Successfully",
        variant: "default",
      });

      form.reset();
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      console.error("Submission error:", error);
      toast({
        title: "Error",
        description: axiosError.response?.data.message ?? "Failed to Add License",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="default">
          <PlusIcon className="size-4" aria-hidden="true" />
          Add License
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-full max-w-[550px] p-0">
        <ScrollArea className="h-[90%] w-full p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl">Create License</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-3 max-w-3xl mx-auto py-5"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>License Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="License Name"
                        type="text"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="product_key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Key</FormLabel>
                    <FormControl>
                      <Input placeholder="Product Key" type="text" {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-6">
                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company</FormLabel>
                        <CompanyBox
                          value={field.value}
                          onChange={field.onChange}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-6">
                  {" "}
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <CategoryBox
                          value={field.value}
                          onChange={field.onChange}
                        />

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-6">
                  <FormField
                    control={form.control}
                    name="manufacturer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Manufacturer</FormLabel>
                        <ManufacturerBox
                          value={field.value}
                          onChange={field.onChange}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-6">
                  {" "}
                  <FormField
                    control={form.control}
                    name="supplier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier</FormLabel>
                        <SupplierBox
                          value={field.value}
                          onChange={field.onChange}
                        />

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-6">
                  <FormField
                    control={form.control}
                    name="seats"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Seats</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Seats"
                            type="number"
                            {...field}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-6">
                  <FormField
                    control={form.control}
                    name="license_to_name"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Licensed To Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Licensed To Name"
                            type="text"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-6">
                  <FormField
                    control={form.control}
                    name="license_to_email"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Licensed to Email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Licensed To Email"
                            type="text"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-6">
                  <FormField
                    control={form.control}
                    name="purchase_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Purchase Date</FormLabel>
                        <Popover modal>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-[240px] pl-3 text-left font-normal",
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

                          <PopoverContent
                            className="w-auto p-0"
                            align="start"
                            forceMount
                            side="top"
                            avoidCollisions={false}
                          >
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
              </div>
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-6">
                  <FormField
                    control={form.control}
                    name="expiry_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Expiry Date</FormLabel>
                        <Popover modal>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-[240px] pl-3 text-left font-normal",
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

                          <PopoverContent
                            className="w-auto p-0"
                            align="start"
                            forceMount
                            side="top"
                            avoidCollisions={false}
                          >
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
                <div className="col-span-6">
                  <FormField
                    control={form.control}
                    name="termination_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Termination Date</FormLabel>
                        <Popover modal>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-[240px] pl-3 text-left font-normal",
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

                          <PopoverContent
                            className="w-auto p-0"
                            align="start"
                            forceMount
                            side="top"
                            avoidCollisions={false}
                          >
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
              </div>
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-6">
                  <FormField
                    control={form.control}
                    name="order_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Order Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter Order Number"
                            type="text"
                            {...field}
                          />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-6">
                  <FormField
                    control={form.control}
                    name="purchase_cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purchase Cost</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter Cost"
                            type="number"
                            {...field}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                          />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 pt-2 sm:space-x-0">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                {isLoading ? (
                  <Button disabled>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Please wait
                  </Button>
                ) : (
                  <Button type="submit" disabled={isLoading}>
                    Add
                  </Button>
                )}
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
export default LicenseForm;
