import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { format } from "date-fns";
import { CalendarIcon, Edit, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ApiResponse } from "@/types/ApiResponse";
import {
  Dialog,
  DialogClose,
  DialogContent,
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
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import CompanyBox from "@/components/dropDowns/company.dropdown";
import ManufacturerBox from "@/components/dropDowns/manufacturer.dropdown";
import SupplierBox from "@/components/dropDowns/supplier.dropdown";
import CategoryBox from "@/components/dropDowns/category.dropdown";

// Form Schema
const formSchema = z.object({
  name: z
    .string()
    .min(2, { message: "License name must be at least 2 characters." }),
  category: z.string().nonempty({ message: "Category can't be empty" }),
  product_key: z.string().nonempty({ message: "Product Key can't be Empty" }),
  company: z.string().nonempty({ message: "Company should not be Empty" }),
  supplier: z.string().nonempty({ message: "Supplier should not be empty" }),
  manufacturer: z
    .string()
    .nonempty({ message: "Manufacturer should not be empty" }),
  license_to_name: z
    .string()
    .nonempty({ message: "License to Name should not be empty" }),
  license_to_email: z
    .string()
    .nonempty({ message: "License to Email should not be empty" }),
  seats: z.number({ required_error: "Seats is required" }),
  order_number: z.string(),
  purchase_date: z.date({
    required_error: "Purchase Date should not be empty",
  }),
  expiry_date: z.date({ required_error: "Expiry Date should not be empty" }),
  termination_date: z.date({
    required_error: "Termination Date should not be empty",
  }),
  purchase_cost: z.number({ required_error: "Purchase Cost is required" }),
});

type EditProps = {
  id: string;
};

const LicenseEditForm: React.FC<EditProps> = ({ id }) => {
  const { toast } = useToast();

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
      order_number: "",
      purchase_date: new Date(),
      expiry_date: new Date(),
      termination_date: new Date(),
      purchase_cost: 0,
    },
  });

  const fetchLicense = async (id: string) => {
    const { data } = await axios.get(`/api/core/license/${id}`);
    return data.data;
  };

  const {
    data: licenseData,
    isLoading: isFetching,

  } = useQuery({
    queryKey: ["license", id],
    queryFn: () => fetchLicense(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (licenseData) {
      form.reset({
        name: licenseData.name,
        category: licenseData.category?.name,
        product_key: licenseData.product_key,
        company: licenseData.company?.name,
        supplier: licenseData.supplier?.name,
        manufacturer: licenseData.manufacturer?.name,
        license_to_name: licenseData.license_to_name,
        license_to_email: licenseData.license_to_email,
        purchase_cost: licenseData.purchase_cost,
        seats: Number(licenseData.seats),
        order_number: licenseData.order_number,
        purchase_date: new Date(licenseData.purchase_date),
        expiry_date: new Date(licenseData.expiry_date),
        termination_date: new Date(licenseData.termination_date),
      });
    }
  }, [licenseData, form]);

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const response = await axios.put<ApiResponse>(`/api/core/license/${id}`, {
        name: values.name,
        categoryName: values.category,
        product_key: values.product_key,
        companyName: values.company,
        supplierName: values.supplier,
        manufacturerName: values.manufacturer,
        license_to_name: values.license_to_name,
        license_to_email: values.license_to_email,
        order_number: values.order_number,
        purchase_date: values.purchase_date,
        expiry_date: values.expiry_date,
        termination_date: values.termination_date,
        seats: Number(values.seats),
        purchase_cost: values.purchase_cost,
      });

      toast({
        title: response.data.message,
        description: "License Updated Successfully",
        variant: "default",
      });
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: "Error",
        description:
          axiosError.response?.data.message ?? "Failed to Update License",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          className="border text-blue-500 hover:text-blue-700"
        >
          <Edit size={20} />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-full max-w-[550px] p-0">
        <ScrollArea className="h-[90%] w-full p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl">Update License</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-3 max-w-3xl mx-auto py-5"
            >
              {/* Form Fields */}
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
                      <FormItem>
                        <FormLabel>Seats</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter Seats"
                            type="number"
                            value={field.value}
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
                      <FormItem>
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
                      <FormItem>
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
                      <FormItem>
                        <FormLabel>Purchase Date</FormLabel>
                        <Popover>
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
              </div>
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-6">
                  <FormField
                    control={form.control}
                    name="expiry_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expiry Date</FormLabel>
                        <Popover>
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
                <div className="col-span-6">
                  <FormField
                    control={form.control}
                    name="termination_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Termination Date</FormLabel>
                        <Popover>
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
                            value={field.value}
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
                <Button type="submit" disabled={isFetching}>
                  {isFetching ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    "Update"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default LicenseEditForm;
