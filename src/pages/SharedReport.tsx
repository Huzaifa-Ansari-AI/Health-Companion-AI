// Milestone 2: Public Shared Report Page
// Route: /shared/:token (Public read-only)
// Strictly isolated from private user routes; enforces noindex/nofollow SEO directives.

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getSharedReport, SharedReportResult } from "@/services/shareService";
import { ReportView } from "@/components/report/ReportView";
import { ShieldCheck, AlertCircle, Clock, Heart, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const SharedReport: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [data, setData] = useState<SharedReportResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Inject noindex, nofollow meta tag dynamically for healthcare privacy
    let metaTag = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    let created = false;
    if (!metaTag) {
      metaTag = document.createElement("meta");
      metaTag.name = "robots";
      metaTag.content = "noindex, nofollow";
      document.head.appendChild(metaTag);
      created = true;
    } else {
      metaTag.content = "noindex, nofollow";
    }

    return () => {
      if (created && metaTag && metaTag.parentNode) {
        metaTag.parentNode.removeChild(metaTag);
      }
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      setErrorMessage("No access token provided.");
      return;
    }

    const loadShared = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const isDemo = token.startsWith("demo_token_");
        const res = await getSharedReport(token, isDemo);
        setData(res);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "This link is invalid or expired.";
        setErrorMessage(msg);
      } finally {
        setIsLoading(false);
      }
    };

    loadShared();
  }, [token]);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Public Header Bar */}
      <header className="bg-card border-b border-border/60 sticky top-0 z-40 print:hidden">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Heart className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-base text-foreground tracking-tight">Health Companion AI</span>
            <Badge variant="outline" className="text-2xs text-primary border-primary/30 ml-1">
              Verified Shared View
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Secure Read-Only Access</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="container mx-auto px-4 py-8 print:p-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Verifying access token and loading report...</p>
          </div>
        ) : errorMessage || !data ? (
          <div className="max-w-md mx-auto text-center space-y-4 py-16 px-4">
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Link Expired or Invalid</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This health wellness report link is no longer accessible. It may have reached its expiration date, been revoked by the patient, or the URL might be mistyped.
            </p>
            <div className="p-3 rounded-xl bg-muted/50 border border-border/60 text-2xs text-muted-foreground text-left">
              <strong>Patient Data Protection:</strong> Share links are temporary and cryptographically hashed to ensure patient privacy. Please contact the patient if you need an updated link.
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Expiry Banner */}
            <div className="max-w-4xl mx-auto p-3.5 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-foreground/80 print:hidden">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary shrink-0" />
                <span>
                  <strong>Authorized Doctor & Provider View:</strong> Temporary read-only access granted.
                </span>
              </div>
              <div className="text-2xs text-muted-foreground">
                Access expires: <strong>{new Date(data.expires_at).toLocaleString()}</strong>
              </div>
            </div>

            {/* Read-Only Report View */}
            <ReportView
              report={data.snapshot}
              verificationUrl={typeof window !== "undefined" ? window.location.href : undefined}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default SharedReport;
