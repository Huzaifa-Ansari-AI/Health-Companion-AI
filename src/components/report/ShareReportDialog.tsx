// Milestone 2: ShareReportDialog Component
// Privacy-first consent modal for creating secure, expiring read-only doctor links.

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import {
  Share2,
  ShieldAlert,
  Copy,
  Check,
  QrCode,
  Loader2,
  Clock,
  UserX,
  FileLock2,
  AlertTriangle,
} from "lucide-react";
import { ReportData } from "@/types/report";
import { createShareLink, CreateShareOptions, ShareLinkItem } from "@/services/shareService";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";

interface ShareReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessmentId: string;
  report: ReportData;
  userId: string;
  isDemo?: boolean;
  onShareCreated?: (item: ShareLinkItem) => void;
}

export const ShareReportDialog: React.FC<ShareReportDialogProps> = ({
  open,
  onOpenChange,
  assessmentId,
  report,
  userId,
  isDemo = false,
  onShareCreated,
}) => {
  const { toast } = useToast();

  const [expiryHours, setExpiryHours] = useState<24 | 72 | 168>(72);
  const [hideName, setHideName] = useState(true); // Default to maximum privacy
  const [hideChatExcerpts, setHideChatExcerpts] = useState(true);

  const [isCreating, setIsCreating] = useState(false);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [createdExpiry, setCreatedExpiry] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setCreatedUrl(null);
      setCreatedExpiry(null);
      setCopied(false);
      setQrDataUrl(null);
    }
  }, [open]);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const options: CreateShareOptions = {
        expiryHours,
        hideName,
        hideChatExcerpts,
      };

      const result = await createShareLink(assessmentId, report, options, userId, isDemo);
      setCreatedUrl(result.shareUrl);
      setCreatedExpiry(result.shareItem.expires_at);

      // Generate QR Code preview
      try {
        const qr = await QRCode.toDataURL(result.shareUrl, { width: 160, margin: 1 });
        setQrDataUrl(qr);
      } catch {
        // Non-blocking
      }

      toast({
        title: "Share Link Created",
        description: `Active for ${expiryHours === 24 ? "24 hours" : expiryHours === 72 ? "3 days" : "7 days"}.`,
      });

      if (onShareCreated) {
        onShareCreated(result.shareItem);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create share link.";
      toast({
        title: "Creation Failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = () => {
    if (!createdUrl) return;
    navigator.clipboard.writeText(createdUrl);
    setCopied(true);
    toast({ title: "Link Copied", description: "Shareable doctor link copied to clipboard." });
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-1">
            <Share2 className="w-5 h-5 text-primary" />
          </div>
          <DialogTitle>Share Wellness Summary</DialogTitle>
          <DialogDescription>
            Generate a secure, read-only link with expiring access to share with your healthcare provider.
          </DialogDescription>
        </DialogHeader>

        {!createdUrl ? (
          <div className="space-y-5 py-2">
            {/* Consent Notice */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-foreground/90 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-amber-900 dark:text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Security & Privacy Notice</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Anyone with this link will have read-only access to an immutable snapshot of this report until it expires. You can revoke access at any time.
              </p>
            </div>

            {/* Privacy Toggles */}
            <div className="space-y-3 p-3.5 rounded-xl bg-muted/40 border border-border/60">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <FileLock2 className="w-3.5 h-3.5" />
                <span>Privacy Controls</span>
              </h4>

              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <Label htmlFor="toggle-hide-name" className="text-xs font-medium cursor-pointer">
                    Anonymize Patient Name
                  </Label>
                  <p className="text-2xs text-muted-foreground">
                    Hides your full name on the shared report for privacy.
                  </p>
                </div>
                <Switch
                  id="toggle-hide-name"
                  checked={hideName}
                  onCheckedChange={setHideName}
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/40">
                <div className="space-y-0.5">
                  <Label htmlFor="toggle-hide-excerpts" className="text-xs font-medium cursor-pointer">
                    Sanitize Consultation Excerpts
                  </Label>
                  <p className="text-2xs text-muted-foreground">
                    Only includes synthesized symptoms without raw chat details.
                  </p>
                </div>
                <Switch
                  id="toggle-hide-excerpts"
                  checked={hideChatExcerpts}
                  onCheckedChange={setHideChatExcerpts}
                />
              </div>
            </div>

            {/* Expiry Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>Link Expiration Duration</span>
              </Label>
              <RadioGroup
                value={String(expiryHours)}
                onValueChange={(val) => setExpiryHours(Number(val) as 24 | 72 | 168)}
                className="grid grid-cols-3 gap-2"
              >
                <div className="flex items-center space-x-2 border border-border/60 rounded-xl p-2.5 hover:bg-muted/30 cursor-pointer">
                  <RadioGroupItem value="24" id="exp-24" />
                  <Label htmlFor="exp-24" className="text-xs font-medium cursor-pointer">
                    24 Hours
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border border-border/60 rounded-xl p-2.5 hover:bg-muted/30 cursor-pointer">
                  <RadioGroupItem value="72" id="exp-72" />
                  <Label htmlFor="exp-72" className="text-xs font-medium cursor-pointer">
                    3 Days
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border border-border/60 rounded-xl p-2.5 hover:bg-muted/30 cursor-pointer">
                  <RadioGroupItem value="168" id="exp-168" />
                  <Label htmlFor="exp-168" className="text-xs font-medium cursor-pointer">
                    7 Days
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Button
              className="w-full gap-2 rounded-xl shadow-2xs"
              onClick={handleCreate}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Secure Link...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>Create Expiring Share Link</span>
                </>
              )}
            </Button>
          </div>
        ) : (
          /* Link Generated Result Screen */
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Share Link Ready</strong>
                <span>
                  Expires on{" "}
                  {createdExpiry ? new Date(createdExpiry).toLocaleString() : "scheduled expiry"}.
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-2xs uppercase tracking-wider text-muted-foreground font-semibold">
                Shareable Doctor URL
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={createdUrl}
                  className="font-mono text-xs bg-muted/30 truncate"
                />
                <Button
                  size="sm"
                  variant={copied ? "default" : "outline"}
                  onClick={handleCopy}
                  className="shrink-0 gap-1.5 rounded-xl"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </Button>
              </div>
            </div>

            {qrDataUrl && (
              <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-muted/20 border border-border/40 space-y-2">
                <img
                  src={qrDataUrl}
                  alt="Doctor Verification QR"
                  className="w-28 h-28 rounded-lg border border-border/60 bg-white p-1"
                />
                <span className="text-2xs text-muted-foreground">Scan with a mobile camera to view</span>
              </div>
            )}

            <div className="p-2.5 rounded-xl bg-muted/40 text-2xs text-muted-foreground">
              <strong>Security reminder:</strong> For your privacy, the raw access token cannot be retrieved after you close this modal.
            </div>

            <Button variant="outline" className="w-full rounded-xl" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
