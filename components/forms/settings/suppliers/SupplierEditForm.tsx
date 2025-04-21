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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { useToast } from "@/hooks/use-toast";

import { ApiResponse } from "@/types/ApiResponse";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { AxiosError } from "axios";

import { Edit, Loader2, PlusIcon } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";

const formSchema = z.object({
 name: z
    .string()
    .min(2, {
      message: "Supplier name must be at least 2 characters.",
    })
    .nonempty({
      message: "Supplier name can't be Empty",
    }),
  contact_name: z.string().nonempty({
    message: "Contact Name can't be Empty",
  }),
  address: z.string(),
  phone: z.string().nonempty({
    message: "phone can't be Empty",
  }),
  email: z.string().nonempty({
    message: "Email can't be Empty",
  }),

});

type EditProps = {
  id: string;
};

const SupplierEditForm: React.FC<EditProps> = ({ id }) => {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
        contact_name: "",
        address: "",
    
        phone: "",
        email:""
    },
  });

  const fetchSupplier = async (id: string) => {
    const { data } = await axios.get(`/api/settings/supplier/${id}`);
    return data.data;
  };

  const {
    data: supplierData,
    isLoading: isFetching,
    error,
  } = useQuery({
    queryKey: ["supplier", id],
    queryFn: () => fetchSupplier(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (supplierData) {
      form.reset({
        name: supplierData.name,
        contact_name: supplierData.contact_name,
        address: supplierData.address,
      
        phone: supplierData.phone,
        email: supplierData.email,

      });
    }
  }, [supplierData]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const response = await axios.put<ApiResponse>(
        `/api/settings/supplier/${id}`,
        {
          name: values.name,
            contact_name: values.contact_name,
            address: values.address,
          
            phone: values.phone,
            email: values.email,

        }
      );

      toast({
        title: response.data.message,
        description: "Supplier Updated Successfully",
        variant: "default",
      });
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: "Error",
        description:
          axiosError.response?.data.message ?? "Failed to Update Supplier",
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
        <ScrollArea className="h-[100%] w-full p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl">Update Supplier</DialogTitle>
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
                                  <FormLabel>Supplier Name</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Supplier Name"
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
                              name="contact_name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Contact Name</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Contact Name"
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
                              name="phone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Phone</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="+912545454454"
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
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Email</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="admin@example.com"
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
                              name="address"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Address</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Address" type="text" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

              <DialogFooter className="gap-2 pt-2 sm:space-x-0">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                {isFetching ? (
                  <Button disabled>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Please wait
                  </Button>
                ) : (
                  <Button type="submit" disabled={isFetching}>
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
export default SupplierEditForm;
