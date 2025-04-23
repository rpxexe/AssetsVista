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

import { useToast } from "@/hooks/use-toast";

import { ApiResponse } from "@/types/ApiResponse";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { AxiosError } from "axios";

import { Loader2, PlusIcon } from "lucide-react";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import CompanyBox from "@/components/dropDowns/company.dropdown";
import LocationBox from "@/components/dropDowns/location.dropdown";

const formSchema = z.object({
  name: z
    .string()
    .min(2, {
      message: "Department name must be at least 2 characters.",
    })
    .nonempty({
      message: "Department name can't be Empty",
    }),
  company: z.string().nonempty({
    message: "Company can't be Empty",
  }),
  location: z.string().nonempty({
    message: "Location can't be Empty",
  }),
  phone: z.string().nonempty({
    message: "phone can't be Empty",
  }),
  
});

const DepartmentForm = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
        company: "",
        location: "",
        phone: "",
        
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      console.log("Form values before submission:", values);

      const response = await axios.post<ApiResponse>("/api/settings/department", {
        name: values.name,
        companyName: values.company,
        locationName: values.location,
        phone: values.phone,


      });

      console.log(response.data);

      toast({
        title: response.data.message,
        description: "Department Added Successfully",
        variant: "default",
      });

      form.reset();
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      console.error("Submission error:", error);
      toast({
        title: "Error",
        description:
          axiosError.response?.data.message ?? "Failed to Add Department",
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
          Add Department
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-full max-w-[550px] p-0">
        <ScrollArea className="h-[100%] w-full p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl">Create Department</DialogTitle>
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
                    <FormLabel>Department Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Department Name"
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
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <CompanyBox value={field.value} onChange={field.onChange} />
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
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <LocationBox value={field.value} onChange={field.onChange} />
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
export default DepartmentForm;
