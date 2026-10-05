// Milestone 2: SharedLinksManager Component
// Displays all shared links for an assessment, allowing users to view status, views, and revoke access.

import React, { useState, useEffect } from "react";
import {
  fetchAssessmentShares,
  revokeShareLink,
  ShareLinkItem,
} from "@/services/shareService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Share2,
  Eye,
  Clock,
  ShieldOff,
  Plus,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SharedLinksManagerProps {
  assessmentId: string;
  userId: string;
  isDemo?: boolean;
  onOpenCreate: () => void;
  refreshTrigger?: number;
}

export const SharedLinksManager: React.FC<SharedLinksManagerProps> = ({
  assessmentId,
  userId,
  isDemo = false,
  onOpenCreate,
  refreshTrigger = 0,
}) => {
  const { toast } = useToast();
  const [links, setLinks] = useState<ShareLinkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const loadLinks = async () => {
    setIsLoading(true);
    try {
      const items = await fetchAssessmentShares(assessmentId, userId, isDemo);
      setLinks(items);
    } catch {
      // Non-fatal
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId, userId, isDemo, refreshTrigger]);

  const handleRevoke = async (shareId: string) => {
    setRevokingId(shareId);
    try {
      await revokeShareLink(shareId, isDemo);
      toast({
        title: "Access Revoked",
        description: "The selected share link can no longer be accessed.",
      });
      await loadLinks();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to revoke link.";
      toast({
        title: "Revoke Failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setRevokingId(null);
    }
  };

  const getStatusBadge = (status: "active" | "expired" | "revoked") => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold text-2xs">
            Active
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="outline" className="text-muted-foreground text-2xs">
            Expired
          </Badge>
        );
      case "revoked":
        return (
          <Badge variant="destructive" className="text-2xs">
            Revoked
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="border-border/80 shadow-2xs print:hidden">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
            <Share2 className="w-4 h-4 text-primary" />
            <span>Shared Links Management</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Manage active and previous doctor share links for this wellness report.
          </CardDescription>
        </div>
        <Button size="sm" onClick={onOpenCreate} className="gap-1.5 rounded-xl shadow-2xs h-8 text-xs">
          <Plus className="w-3.5 h-3.5" />
          <span>New Link</span>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>Loading active links...</span>
          </div>
        ) : links.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground space-y-1">
            <p>No share links have been generated for this report yet.</p>
            <p className="text-2xs text-muted-foreground/80">
              Create an expiring, read-only link to share with your physician.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50 text-xs">
            {links.map((link) => (
              <div key={link.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(link.status)}
                    <span className="font-mono text-2xs text-muted-foreground">
                      ID: {link.id.slice(0, 8)}...
                    </span>
                    <span className="flex items-center gap-1 text-2xs text-muted-foreground">
                      <Eye className="w-3 h-3 text-primary" />
                      <span>{link.view_count} views</span>
                    </span>
                  </div>
                  <div className="text-2xs text-muted-foreground flex items-center gap-3">
                    <span>Created: {new Date(link.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Expires: {new Date(link.expires_at).toLocaleString()}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {link.status === "active" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevoke(link.id)}
                      disabled={revokingId === link.id}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive h-7 text-2xs gap-1 rounded-lg"
                    >
                      {revokingId === link.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <ShieldOff className="w-3 h-3" />
                      )}
                      <span>Revoke Access</span>
                    </Button>
                  ) : (
                    <span className="text-2xs text-muted-foreground italic">No longer accessible</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
