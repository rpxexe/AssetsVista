"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, Download, Printer, QrCode } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export interface AssetQrTagCardProps {
  assetId: string;
  assetTag: string;
  assetName?: string;
  serialNumber?: string;
  modelName?: string;
  companyName?: string;
  settings?: {
    site_name?: string;
    label_width_mm?: number;
    label_height_mm?: number;
    label_show_serial?: boolean;
    label_show_model?: boolean;
    label_show_company?: boolean;
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Generates an inline SVG path string representing all dark QR modules for fast, XSS-safe rendering.
 */
function buildQrSvgPath(value: string): { size: number; pathData: string } | null {
  try {
    const qr = QRCode.create(value, { errorCorrectionLevel: "M" });
    const size = qr.modules.size;
    let d = "";
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (qr.modules.get(r, c)) {
          d += `M${c + 1},${r + 1}h1v1h-1z`;
        }
      }
    }
    return { size: size + 2, pathData: d };
  } catch {
    return null;
  }
}

export function AssetQrTagCard({
  assetId,
  assetTag,
  assetName,
  serialNumber,
  modelName,
  companyName,
  settings,
}: AssetQrTagCardProps) {
  const { toast } = useToast();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [origin, setOrigin] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const canonicalUrl = useMemo(() => {
    const path = `/assets/view/${assetId}`;
    return origin ? `${origin}${path}` : path;
  }, [origin, assetId]);

  const qrMatrix = useMemo(() => buildQrSvgPath(canonicalUrl), [canonicalUrl]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(canonicalUrl);
      setCopiedLink(true);
      toast({ title: "Copied", description: "Asset permalink copied to clipboard." });
      setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      toast({ title: "Copy failed", description: "Could not access clipboard.", variant: "destructive" });
    }
  };

  const handleDownloadSvg = () => {
    if (!svgRef.current) return;
    const svgXml = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgXml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(assetTag || assetId).replace(/[^a-zA-Z0-9_-]/g, "_")}_qr.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintLabel = () => {
    if (!svgRef.current) return;
    const svgXml = new XMLSerializer().serializeToString(svgRef.current);
    const widthMm = settings?.label_width_mm || 50;
    const heightMm = settings?.label_height_mm || 25;
    const showCompany = settings?.label_show_company ?? true;
    const showModel = settings?.label_show_model ?? true;
    const showSerial = settings?.label_show_serial ?? true;
    const orgHeader = escapeHtml(companyName || settings?.site_name || "AssetsVista");

    const win = window.open("", "_blank", "width=460,height=340");
    if (!win) {
      toast({
        title: "Popup blocked",
        description: "Allow popups to open the print label dialog.",
        variant: "destructive",
      });
      return;
    }

    win.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Asset Tag ${escapeHtml(assetTag)}</title>
    <style>
      @page { size: ${widthMm}mm ${heightMm}mm; margin: 2mm; }
      * { box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif; }
      body { margin: 0; padding: 8px; display: flex; align-items: center; justify-content: center; background: #fff; color: #09090b; }
      .label {
        width: ${widthMm}mm;
        min-height: ${heightMm}mm;
        border: 1px solid #d4d4d8;
        border-radius: 6px;
        padding: 4px 6px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .qr { width: 18mm; height: 18mm; flex-shrink: 0; }
      .qr svg { width: 100%; height: 100%; display: block; }
      .meta { min-width: 0; flex: 1; line-height: 1.25; }
      .org { font-size: 7pt; text-transform: uppercase; letter-spacing: 0.05em; color: #52525b; }
      .tag { font-size: 10pt; font-weight: 700; font-family: ui-monospace, monospace; margin: 1px 0; }
      .line { font-size: 7.5pt; color: #27272a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    </style>
  </head>
  <body>
    <div class="label">
      <div class="qr">${svgXml}</div>
      <div class="meta">
        ${showCompany ? `<div class="org">${orgHeader}</div>` : ""}
        <div class="tag">#${escapeHtml(assetTag)}</div>
        ${showModel && (assetName || modelName) ? `<div class="line">${escapeHtml(modelName || assetName || "")}</div>` : ""}
        ${showSerial && serialNumber ? `<div class="line">S/N: ${escapeHtml(serialNumber)}</div>` : ""}
      </div>
    </div>
    <script>window.onload = function(){ window.focus(); window.print(); };</script>
  </body>
</html>`);
    win.document.close();
  };

  return (
    <>
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <QrCode className="h-3.5 w-3.5" />
            <span>Asset QR &amp; Tag Label</span>
          </div>
          <Badge variant="outline" className="font-mono text-[10px]">
            #{assetTag}
          </Badge>
        </div>

        <div className="flex flex-col items-center justify-center rounded-xl border bg-muted/25 p-4 gap-2">
          <div className="rounded-xl border bg-white p-2.5 shadow-sm">
            {qrMatrix ? (
              <svg
                ref={svgRef}
                viewBox={`0 0 ${qrMatrix.size} ${qrMatrix.size}`}
                className="h-32 w-32"
                shapeRendering="crispEdges"
                role="img"
                aria-label={`QR code for asset ${assetTag}`}
              >
                <rect width={qrMatrix.size} height={qrMatrix.size} fill="#ffffff" />
                <path d={qrMatrix.pathData} fill="#09090b" />
              </svg>
            ) : (
              <div className="h-32 w-32 flex items-center justify-center text-xs text-zinc-500">
                QR Unavailable
              </div>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground text-center break-all max-w-full px-2">
            Scan to open asset record
          </p>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => setPrintOpen(true)}
          >
            <Printer className="h-3.5 w-3.5" />
            Label
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={handleCopyUrl}
          >
            {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copiedLink ? "Copied" : "Link"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={handleDownloadSvg}
          >
            <Download className="h-3.5 w-3.5" />
            SVG
          </Button>
        </div>
      </div>

      <Dialog open={printOpen} onOpenChange={setPrintOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Printable Asset Tag Preview
            </DialogTitle>
            <DialogDescription>
              Configured label size: {settings?.label_width_mm || 50}mm ×{" "}
              {settings?.label_height_mm || 25}mm
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-center py-4">
            <div className="flex items-center gap-3.5 rounded-xl border bg-white text-zinc-950 p-3.5 shadow-sm max-w-[340px] w-full">
              {qrMatrix && (
                <svg
                  viewBox={`0 0 ${qrMatrix.size} ${qrMatrix.size}`}
                  className="h-20 w-20 shrink-0"
                  shapeRendering="crispEdges"
                >
                  <rect width={qrMatrix.size} height={qrMatrix.size} fill="#ffffff" />
                  <path d={qrMatrix.pathData} fill="#09090b" />
                </svg>
              )}
              <div className="min-w-0 flex-1 space-y-0.5">
                {(settings?.label_show_company ?? true) && (
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 truncate">
                    {companyName || settings?.site_name || "AssetsVista"}
                  </p>
                )}
                <p className="font-mono text-base font-bold text-zinc-950 truncate">#{assetTag}</p>
                {(settings?.label_show_model ?? true) && (modelName || assetName) && (
                  <p className="text-xs text-zinc-700 truncate">{modelName || assetName}</p>
                )}
                {(settings?.label_show_serial ?? true) && serialNumber && (
                  <p className="font-mono text-[11px] text-zinc-600 truncate">
                    S/N: {serialNumber}
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPrintOpen(false)}>
              Close
            </Button>
            <Button type="button" onClick={handlePrintLabel} className="gap-1.5">
              <Printer className="h-4 w-4" />
              Print Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

