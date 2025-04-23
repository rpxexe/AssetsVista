
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

import {  Loader2, PlusIcon } from "lucide-react";
import React, {  useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import CategoryBox from "@/components/dropDowns/category.dropdown";
const formSchema = z.object({
  category: z.string().nonempty({
    message: "Category shoud not be empty",
  }),
  name: z
    .string()
    .min(2, {
      message: "Asset Model name must be at least 2 characters.",
    })
    .nonempty({
      message: "Asset Model name can't be Empty",
    }),
  model_no: z.string().nonempty({
    message: "Model Number can't be Empty",
  })  
});

const AssetModelForm = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name:"",
        model_no:"",
        category:"",
    },
  });
 
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      console.log("Form values before submission:", values);

      const response = await axios.post<ApiResponse>("/api/settings/assetmodel", {
        name: values.name,
        model_no: values.model_no,
        categoryName: values.category,
      });

      console.log(response.data);

      toast({
        title: response.data.message,
        description: "Asset Model Added Successfully",
        variant: "default",
      });

      form.reset();
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      console.error("Submission error:", error);
      toast({
        title: "Error",
        description: axiosError.response?.data.message ?? "Failed to Add Asset Model",
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
          Add Asset Model
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-full max-w-[550px] p-0">
        <ScrollArea className="h-[100%] w-full p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl">Create Asset Model</DialogTitle>
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
                    <FormLabel>Asset Model Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Asset Model Name" type="text" {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="model_no"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Model Number" type="text" {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Category</FormLabel>
                    <CategoryBox
                      value={field.value}
                      onChange={field.onChange}
                    />
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
export default AssetModelForm;
