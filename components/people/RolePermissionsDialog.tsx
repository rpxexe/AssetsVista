"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PERMISSION_LABELS,
  PERMISSION_MATRIX,
  ROLE_METADATA,
  USER_ROLES,
} from "@/lib/rbac";
import { Check, Shield, X } from "lucide-react";

export function RolePermissionsDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Shield className="h-4 w-4 text-blue-600" />
          Role Matrix
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="h-5 w-5 text-blue-600" />
            Role-Based Access Control (RBAC) Matrix
          </DialogTitle>
          <DialogDescription>
            Granular permissions granted to each role across AssetsVista modules.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-2">
          {USER_ROLES.map((r) => {
            const meta = ROLE_METADATA[r];
            return (
              <div key={r} className="p-3 rounded-lg border bg-muted/20 space-y-1.5">
                <Badge variant="outline" className={meta.badgeClass}>
                  {meta.label}
                </Badge>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {meta.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[220px]">Permission</TableHead>
                {USER_ROLES.map((r) => (
                  <TableHead key={r} className="text-center">
                    {ROLE_METADATA[r].label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {PERMISSION_LABELS.map((perm) => (
                <TableRow key={perm.key}>
                  <TableCell className="font-medium text-sm">{perm.label}</TableCell>
                  {USER_ROLES.map((r) => {
                    const allowed = PERMISSION_MATRIX[r][perm.key];
                    return (
                      <TableCell key={r} className="text-center">
                        {allowed ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground/50">
                            <X className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

