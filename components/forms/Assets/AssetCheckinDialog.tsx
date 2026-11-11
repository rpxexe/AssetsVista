"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, CheckCircle, Loader2, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import StatusBox from "@/components/dropDowns/status.dropdown";

const checkinSchema = z.object({
  checkin_date: z.date(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

type CheckinFormValues = z.infer<typeof checkinSchema>;

interface AssetCheckinDialogProps {
  assetId: string;
  assetTag: string;
  assetName: string;
  assignedToName?: string;
}

export function AssetCheckinDialog({
  assetId,
  assetTag,
  assetName,
  assignedToName,
}: AssetCheckinDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CheckinFormValues>({
    resolver: zodResolver(checkinSchema),
    defaultValues: {
      checkin_date: new Date(),
      status: "Ready to Deploy",
      notes: "",
    },
  });

  const onSubmit = async (values: CheckinFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await axios.post(`/api/core/asset/${assetId}/checkin`, {
        checkin_date: values.checkin_date,
        status: values.status || "Ready to Deploy",
        notes: values.notes,
      });

      toast({
        title: "Asset Checked In",
        description: response.data.message || `${assetTag} checked in successfully.`,
      });

      const keysToInvalidate = [
        ["assets"],
        ["counttotals"],
        ["needs-attention"],
        ["acceptances"],
        ["dashboard-recent-activity"],
        ["calendar-events"],
        ["dashboard-summary"],
        ["status"],
      ];
      keysToInvalidate.forEach((key) =>
        queryClient.invalidateQueries({ queryKey: key })
      );
      setOpen(false);
      form.reset();
    } catch (err: any) {
      console.error("Checkin error:", err);
      toast({
        title: "Checkin Failed",
        description:
          err.response?.data?.message || "Failed to check in asset. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="border-green-600 text-green-700 hover:bg-green-50 dark:hover:bg-green-950 flex items-center gap-1 h-8"
        >
          <LogIn className="h-3.5 w-3.5" />
          Check In
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Check In Asset
          </DialogTitle>
          <DialogDescription>
            Check in <strong>{assetTag}</strong> ({assetName})
            {assignedToName ? ` from ${assignedToName}` : ""}.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="checkin_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Check-in Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
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

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Return Status</FormLabel>
                  <FormControl>
                    <StatusBox
                      value={field.value || ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Condition upon return, notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking in...
                  </>
                ) : (
                  "Confirm Check In"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default AssetCheckinDialog;

