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

import { Edit, Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageUploadField } from "@/components/ImageUploadField";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Status name must be at least 2 characters.",
  }),
  email: z.string().nonempty({
    message: "Email can't be Empty",
  }),
  image: z.string().optional(),
});

type EditProps = {
  id: string;
};

const CompanyEditForm: React.FC<EditProps> = ({ id }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      image: "",
    },
  });

  const fetchCompany = async (id: string) => {
    const { data } = await axios.get(`/api/settings/company/${id}`);
    return data.data;
  };

  const {
    data: companyData,
    isLoading: isFetching,
  } = useQuery({
    queryKey: ["company", id],
    queryFn: () => fetchCompany(id),
    enabled: open && Boolean(id),
  });

  useEffect(() => {
    if (companyData) {
      form.reset({
        name: companyData.name,
        email: companyData.email,
        image: companyData.image || "",
      });
    }
  }, [companyData, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const response = await axios.put<ApiResponse>(
        `/api/settings/company/${id}`,
        {
          name: values.name,
          email: values.email,
          image: values.image ?? "",
        }
      );

      toast({
        title: response.data.message,
        description: "Company Updated Successfully",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["company", id] });
      setOpen(false);
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: "Error",
        description:
          axiosError.response?.data.message ?? "Failed to Update Company",
        variant: "destructive",
      });
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          className="border text-blue-500 hover:text-blue-700"
        >
          <Edit size={20} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <ScrollArea className="max-h-[calc(90vh-1rem)] w-full p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl">Update Company</DialogTitle>
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
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Company Name" {...field} />
                    </FormControl>
                    <FormMessage className="text-sm" />
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
                      <Input placeholder="Email" {...field} />
                    </FormControl>
                    <FormMessage className="text-sm" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Logo</FormLabel>
                    <FormControl>
                      <ImageUploadField
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="https://example.com/company-logo.png"
                      />
                    </FormControl>
                    <FormMessage className="text-sm" />
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
export default CompanyEditForm;
