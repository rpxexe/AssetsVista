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


const formSchema = z.object({
  name: z
    .string()
    .min(2, {
      message: "Manufacturer name must be at least 2 characters.",
    })
    .nonempty({
      message: "Manufacturer name can't be Empty",
    }),
  url: z.string().nonempty({
    message: "URL can't be Empty",
  }),
  support_url: z.string(),
  support_phone: z.string().nonempty({
    message: "Phone can't be Empty",
  }),
  support_email: z.string().nonempty({
    message: "Support Email can't be Empty",
  }),
});

const ManufacturerForm = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      url: "",
      support_url:"",
      support_email: "",
      support_phone:""
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      console.log("Form values before submission:", values);

      const response = await axios.post<ApiResponse>("/api/settings/manufacturer", {
        name: values.name,
        url: values.url,
        support_url: values.support_url,
        support_phone: values.support_phone,
        support_email: values.support_email,
      });

      console.log(response.data);

      toast({
        title: response.data.message,
        description: "Manufacturer Added Successfully",
        variant: "default",
      });

      form.reset();
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      console.error("Submission error:", error);
      toast({
        title: "Error",
        description:
          axiosError.response?.data.message ?? "Failed to Add Manufacturer",
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
          Add Manufacturer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-full max-w-[550px] p-0">
        <ScrollArea className="h-[100%] w-full p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl">Create Manufacturer</DialogTitle>
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
                    <FormLabel>Manufacturer Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Manufacturer Name"
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
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com"
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
                name="support_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel> Support URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com"
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
                name="support_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Support Email</FormLabel>
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
                name="support_phone"
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
export default ManufacturerForm;
