// Milestone 2: Report Page
// Route: /reports/:assessmentId (Protected)
// Loads, formats, and displays the complete 8-section wellness summary report.

import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { fetchReportData, fetchProfileDemographics } from "@/services/reportService";
import { ReportData, ProfileDemographics } from "@/types/report";
import { ReportView } from "@/components/report/ReportView";
import { CompleteDetailsDialog } from "@/components/report/CompleteDetailsDialog";
import { ShareReportDialog } from "@/components/report/ShareReportDialog";
import { SharedLinksManager } from "@/components/report/SharedLinksManager";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertCircle, RefreshCw, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Report: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const { user, isDemo } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [report, setReport] = useState<ReportData | null>(null);
  const [profile, setProfile] = useState<ProfileDemographics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [refreshSharesTrigger, setRefreshSharesTrigger] = useState(0);

  const loadData = async () => {
    if (!assessmentId || !user) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [reportData, profileData] = await Promise.all([
        fetchReportData(assessmentId, user.id, isDemo),
        fetchProfileDemographics(user.id, isDemo),
      ]);
      setReport(reportData);
      setProfile(profileData);

      // If demographics are missing and haven't been asked yet in this session
      if (!profileData?.age && !profileData?.gender) {
        const hasPrompted = sessionStorage.getItem(`prompted_demographics_${user.id}`);
        if (!hasPrompted) {
          setIsDetailsDialogOpen(true);
          sessionStorage.setItem(`prompted_demographics_${user.id}`, "true");
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to load report.";
      setErrorMessage(msg);
      toast({
        title: "Report Load Failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId, user?.id, isDemo]);

  const handleDemographicsSaved = (updated: ProfileDemographics) => {
    setProfile(updated);
    // Reload report data with new profile demographics
    if (assessmentId && user) {
      fetchReportData(assessmentId, user.id, isDemo)
        .then((fresh) => setReport(fresh))
        .catch(() => {});
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top Header Bar */}
      <header className="bg-card border-b border-border/60 sticky top-0 z-40 print:hidden">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="text-xs text-muted-foreground">
            {isDemo && <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full mr-2">Demo</span>}
            Health Companion AI — Report Viewer
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container mx-auto px-4 py-8 print:p-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading your wellness summary...</p>
          </div>
        ) : errorMessage || !report ? (
          <div className="max-w-md mx-auto text-center space-y-4 py-16">
            <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Report Unavailable</h2>
            <p className="text-sm text-muted-foreground">
              {errorMessage || "The requested assessment record could not be found."}
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
                Return to Dashboard
              </Button>
              <Button size="sm" onClick={loadData} className="gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                Try Again
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <ReportView
              report={report}
              onEditDetails={() => setIsDetailsDialogOpen(true)}
              actionSlot={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsShareDialogOpen(true)}
                  className="gap-1.5 rounded-xl border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share with Doctor</span>
                </Button>
              }
            />

            {assessmentId && user && (
              <SharedLinksManager
                assessmentId={assessmentId}
                userId={user.id}
                isDemo={isDemo}
                onOpenCreate={() => setIsShareDialogOpen(true)}
                refreshTrigger={refreshSharesTrigger}
              />
            )}

            {user && (
              <CompleteDetailsDialog
                open={isDetailsDialogOpen}
                onOpenChange={setIsDetailsDialogOpen}
                userId={user.id}
                initialData={profile}
                isDemo={isDemo}
                onSaved={handleDemographicsSaved}
              />
            )}

            {assessmentId && user && (
              <ShareReportDialog
                open={isShareDialogOpen}
                onOpenChange={setIsShareDialogOpen}
                assessmentId={assessmentId}
                report={report}
                userId={user.id}
                isDemo={isDemo}
                onShareCreated={() => setRefreshSharesTrigger((c) => c + 1)}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Report;
