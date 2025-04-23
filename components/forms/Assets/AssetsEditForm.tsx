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
import { CalendarIcon, Edit, Loader2, PlusIcon } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../../ui/button";
import { Calendar } from "../../ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
const formSchema = z.object({
  company: z.string().nonempty({
    message: "Company can't be empty",
  }),
  asset_tag: z.string().nonempty({
    message: "Assets Tags can't be empty",
  }),
  serial_number: z.string().nonempty({
    message: "Serial Number can't be Empty",
  }),
  asset_model: z.string().nonempty({
    message: "Asset Model should not be Empty",
  }),
  status: z.string().nonempty({
    message: "Status shoud not be empty",
  }),
  location: z.string().nonempty({
    message: "Location shoud not be empty",
  }),
  supplier: z.string().nonempty({
    message: "Supplier shoud not be empty",
  }),
  manufacturer: z.string().nonempty({
    message: "Manufacturer shoud not be empty",
  }),
  department: z.string().nonempty({
    message: "Department shoud not be empty",
  }),
  asset_name: z
    .string()
    .min(2, {
      message: "Asset name must be at least 2 characters.",
    })
    .nonempty({
      message: "Asset name can't be Empty",
    }),
  warranty: z.number({
    message: "Warranty should be a number",
    required_error: "Warranty is required",
  }),
  order_number: z.string(),
  purchase_date: z.date({
    required_error: "Purchase Date should not be empty",
  }),
  eol_date: z.date({
    required_error: "Purchase Date should not be empty",
  }),
  purchase_cost: z.number({
    required_error: "Purchase Cost is required",
  }),
});
type Editprops = {
  id:string;
};
const AssetEditForm:React.FC<Editprops> = ({id}) => {
  const { toast } = useToast();
  const [loading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      company: "",
      asset_tag: "",
      serial_number: "",
      asset_model: "",
      status: "",
      location: "",
      supplier: "",
      manufacturer: "",
      department: "",
      asset_name: "",
      warranty: 0,
      order_number: "",
      purchase_date: new Date(),
      eol_date: new Date(),
      purchase_cost: 0,
    },
  });
    const fetchAsset = async (id: string) => {
      const { data } = await axios.get(`/api/core/asset/${id}`);
      return data.data;
    };
  const {
      data: assetData,
    } = useQuery({
      queryKey: ["asset", id], // Cache the query based on `id`
      queryFn: () => fetchAsset(id),
      enabled: Boolean(id), // Only run when `id` is valid
    });
  useEffect(() => {
    if(assetData){

        form.reset({
          company: assetData.company.name || "",
          asset_tag: assetData.asset_tag || "",
          serial_number: assetData.serial_number || "",
          asset_model: assetData.asset_model.name || "",
          status: assetData.status.name || "",
          location: assetData.location.name || "",
          supplier: assetData.supplier.name || "",
          manufacturer: assetData.manufacturer.name || "",
          department: assetData.department.name || "",
          asset_name: assetData.asset_name || "",
          warranty: assetData.warranty || 0,
          order_number: assetData.order_number || "",
          purchase_date: assetData.purchase_date
            ? new Date(assetData.purchase_date)
            : new Date(),
          eol_date: assetData.eol_date
            ? new Date(assetData.eol_date)
            : new Date(),
          purchase_cost: assetData.purchase_cost || 0,
        });
      }
  }, [assetData, form]);

  
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
   try {
     console.log("Form values before submission:", values);

     const response = await axios.put<ApiResponse>(`/api/core/asset/${id}`, {
       companyName: values.company,
       asset_tag: values.asset_tag,
       serial_number: values.serial_number,
       assetModelName: values.asset_model,
       statusName: values.status,
       locationName: values.location,
       supplierName: values.supplier,
       manufacturerName: values.manufacturer,
       departmentName: values.department,
       asset_name: values.asset_name,
       warranty: values.warranty,
       order_number: values.order_number,
       purchase_date: values.purchase_date,
       eol_date: values.eol_date,
       purchase_cost: values.purchase_cost,
     });

     console.log(response.data);

     toast({
       title: response.data.message,
       description: "Asset Updated Successfully",
       variant: "default",
     });
   } catch (error) {
     const axiosError = error as AxiosError<ApiResponse>;
     console.error("Submission error:", error);
     toast({
       title: "Error",
       description:
         axiosError.response?.data.message ?? "Failed to Update Asset",
       variant: "destructive",
     });
   } finally {
     setIsLoading(false);
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
            <DialogTitle className="text-2xl">Edit Asset</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-3 max-w-3xl mx-auto py-5"
            >
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Company</FormLabel>
                    
                      <CompanyBox
                        value={field.value}
                        onChange={field.onChange}
                      />
                    

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="asset_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset Name</FormLabel>
                    <FormControl>
                      
                      <Input
                          placeholder="Asset Name"
                          type="text"
                          {...field}
                        />
                      
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-6">
                  <FormField
                    control={form.control}
                    name="asset_tag"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asset Tag</FormLabel>
                        <FormControl>
                          <Input placeholder="Tag" type="text" {...field} />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="col-span-6">
                  <FormField
                    control={form.control}
                    name="serial_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Serial Number </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Serial Number"
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
                    name="asset_model"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Asset Model</FormLabel>
                        <AssetModelBox
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
                    name="status"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Status</FormLabel>
                        <StatusBox
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
                    name="location"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Location</FormLabel>
                        <LocationBox
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
                      <FormItem className="flex flex-col">
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
                    name="manufacturer"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
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
                    name="department"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Department</FormLabel>
                        <DepartmentBox
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

                <div className="col-span-6">
                  <FormField
                    control={form.control}
                    name="warranty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Warranty</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter Warranty"
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

              <div className="grid grid-cols-12 gap-4">
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
                <div className="col-span-6">
                  <FormField
                    control={form.control}
                    name="eol_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>EOL </FormLabel>
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

              <DialogFooter className="gap-2 pt-2 sm:space-x-0">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                {loading ? (
                  <Button disabled>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Please wait
                  </Button>
                ) : (
                  <Button type="submit" disabled={loading}>
                    Update
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
export default AssetEditForm;
