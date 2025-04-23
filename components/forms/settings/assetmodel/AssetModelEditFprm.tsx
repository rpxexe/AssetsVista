import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";

import {  Edit, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

import { ScrollArea } from "@/components/ui/scroll-area";

import CategoryBox from "@/components/dropDowns/category.dropdown";

// Form Schema
const formSchema = z.object({
  category: z.string().nonempty({
    message: "Department shoud not be empty",
  }),
  name: z
    .string()
    .min(2, {
      message: "Asset name must be at least 2 characters.",
    })
    .nonempty({
      message: "Asset name can't be Empty",
    }),
  model_no: z.string().nonempty({
    message: "Model Number can't be Empty",
  }),
});

type EditProps = {
  id: string;
};

const AssetModelEditForm: React.FC<EditProps> = ({ id }) => {
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      model_no: "",
      category: "",
      
    },
  });


  const fetchAssetModel = async (id: string) => {
    const { data } = await axios.get(`/api/settings/assetmodel/${id}`);
    return data.data;
  };

  const {
    data: assetModelData,
    isLoading: isFetching,
    error,
  } = useQuery({
    queryKey: ["assetmodel", id],
    queryFn: () => fetchAssetModel(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (assetModelData) {
      form.reset({
        name: assetModelData.name,
        model_no: assetModelData.model_no,
        category: assetModelData.category?.name,
      });
    }
  }, [assetModelData]);

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const response = await axios.put<ApiResponse>(`/api/settings/assetmodel/${id}`, {
        name: values.name,
        model_no: values.model_no,
        categoryName: values.category,
        
      });

      toast({
        title: response.data.message,
        description: "Asset Model Updated Successfully",
        variant: "default",
      });
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: "Error",
        description:
          axiosError.response?.data.message ?? "Failed to Update Asset Model",
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
            <DialogTitle className="text-2xl">Update Asset Model</DialogTitle>
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

export default AssetModelEditForm;
