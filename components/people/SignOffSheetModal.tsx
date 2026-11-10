"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, ShieldCheck } from "lucide-react";
import { format } from "date-fns";

interface SignOffSheetModalProps {
  person: {
    _id: string;
    name: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    employee_num?: string;
    title?: string;
    department?: { name: string };
    location?: { name: string };
    company?: { name: string };
    assigned_assets?: any[];
    assigned_licenses?: any[];
  };
}

export function SignOffSheetModal({ person }: SignOffSheetModalProps) {
  const [open, setOpen] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const assets = person.assigned_assets || [];
  const licenses = person.assigned_licenses || [];
  const fullName = person.name || `${person.first_name || ""} ${person.last_name || ""}`.trim();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Printer className="h-4 w-4" />
          Print Sign-off Sheet
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="print:hidden">
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              Equipment Acceptance &amp; Sign-off Sheet
            </DialogTitle>
            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
        </DialogHeader>

        {/* Printable Document Container */}
        <div id="printable-sign-off" className="p-6 bg-white dark:bg-zinc-950 text-black dark:text-white rounded-lg border text-sm space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start border-b pb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">AssetsVista IT Asset Management</h1>
              <p className="text-muted-foreground text-xs">
                Asset Acceptance &amp; Responsibility Agreement
              </p>
            </div>
            <div className="text-right text-xs">
              <p className="font-semibold">Date Issued: {format(new Date(), "PP")}</p>
              <p className="text-muted-foreground">{person.company?.name || "Company Equipment"}</p>
            </div>
          </div>

          {/* Employee Information */}
          <div className="grid grid-cols-2 gap-4 bg-muted/40 p-4 rounded-md">
            <div>
              <p className="text-xs text-muted-foreground">Employee Name</p>
              <p className="font-semibold text-base">{fullName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Employee #</p>
              <p className="font-semibold">{person.employee_num || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Job Title</p>
              <p className="font-medium">{person.title || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Department / Location</p>
              <p className="font-medium">
                {person.department?.name || "N/A"} / {person.location?.name || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium">{person.email || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="font-medium">{person.phone || "N/A"}</p>
            </div>
          </div>

          {/* Equipment List */}
          <div>
            <h3 className="font-semibold text-base mb-2">Assigned Physical Hardware ({assets.length})</h3>
            {assets.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No physical hardware assigned.</p>
            ) : (
              <div className="rounded border overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted text-muted-foreground uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-2 border-b">Asset Tag</th>
                      <th className="p-2 border-b">Asset Name</th>
                      <th className="p-2 border-b">Model</th>
                      <th className="p-2 border-b">Serial No</th>
                      <th className="p-2 border-b">Checkout Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((asset: any) => (
                      <tr key={asset._id} className="border-b last:border-0">
                        <td className="p-2 font-mono font-semibold">{asset.asset_tag}</td>
                        <td className="p-2">{asset.asset_name || "-"}</td>
                        <td className="p-2">{asset.asset_model?.name || "-"}</td>
                        <td className="p-2 font-mono">{asset.serial_number || "-"}</td>
                        <td className="p-2">
                          {asset.checkout_date
                            ? format(new Date(asset.checkout_date), "PP")
                            : format(new Date(), "PP")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Licenses List */}
          {licenses.length > 0 && (
            <div>
              <h3 className="font-semibold text-base mb-2">Assigned Software Licenses ({licenses.length})</h3>
              <div className="rounded border overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted text-muted-foreground uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-2 border-b">Software Name</th>
                      <th className="p-2 border-b">Category</th>
                      <th className="p-2 border-b">Manufacturer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {licenses.map((lic: any) => (
                      <tr key={lic._id} className="border-b last:border-0">
                        <td className="p-2 font-semibold">{lic.name}</td>
                        <td className="p-2">{lic.category?.name || "-"}</td>
                        <td className="p-2">{lic.manufacturer?.name || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Acknowledgement Clause */}
          <div className="border p-3 rounded-md bg-muted/20 text-xs text-muted-foreground leading-relaxed">
            <p className="font-semibold text-foreground mb-1">Acknowledgement and Agreement:</p>
            <p>
              I acknowledge that I have received all the equipment and software listed above in good working order.
              I understand that these items are company property and are to be used in compliance with IT policies.
              I agree to exercise reasonable care and return all equipment immediately upon request or upon conclusion
              of my employment.
            </p>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t">
            <div>
              <div className="border-b border-black dark:border-white h-10 mb-2"></div>
              <p className="font-semibold">{fullName}</p>
              <p className="text-xs text-muted-foreground">Employee Signature &amp; Date</p>
            </div>
            <div>
              <div className="border-b border-black dark:border-white h-10 mb-2"></div>
              <p className="font-semibold">IT Asset Manager / Administrator</p>
              <p className="text-xs text-muted-foreground">Authorized Signature &amp; Date</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SignOffSheetModal;

