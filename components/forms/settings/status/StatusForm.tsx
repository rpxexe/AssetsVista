"use client";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { DialogClose } from "@radix-ui/react-dialog";
import axios, { AxiosError } from "axios";
import { useToast } from "@/hooks/use-toast";
import { ApiResponse } from "@/types/ApiResponse";
import { useState } from "react";
import { Loader2, PlusIcon } from "lucide-react";
const formSchema = z.object({
  name: z.string().min(2, {
    message: "Status name must be at least 2 characters.",
  }),
});
const StatusForm = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      const response = await axios.post<ApiResponse>("/api/settings/status", {
        name: values.name,
      });

      toast({
        title: response.data.message,
        description: "Status created Succesfully",
        variant: "default",
      });
      form.reset({ ...form.getValues() });
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: "Error",
        description:
          axiosError.response?.data.message ?? "Failed to create Status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }

    console.log(values);
  };
  return (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">
                <PlusIcon className="h-4 w-4" />
                Create New</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="md:text-2xl">
                Create New Status
              </DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className=" flex justify-center items-center gap-3"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Enter Status Name" {...field} />
                      </FormControl>
                      <FormMessage className="text-sm" />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">
                      Close
                    </Button>
                  </DialogClose>
                  {isLoading ? (
                    <Button disabled>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Please wait
                    </Button>
                  ) : (
                    <Button type="submit" disabled={isLoading}>
                      Create
                    </Button>
                  )}
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
  )}
export default StatusForm