import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { fetchUserAssessments, deleteAssessment, AssessmentRecord } from "@/services/healthService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Activity,
  PlusCircle,
  LogOut,
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingUp,
  MessageSquare,
  HelpCircle,
  FileText,
  User,
  Trash2,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AfiyatLogo } from "@/components/common/AfiyatLogo";
import { TodayCheckinCard } from "@/components/dashboard/TodayCheckinCard";
import { StreakProgressCard } from "@/components/dashboard/StreakProgressCard";
import { TrendsSummaryCard } from "@/components/dashboard/TrendsSummaryCard";

const Dashboard: React.FC = () => {
  const { user, signOut, isDemo } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingRecord, setDeletingRecord] = useState<AssessmentRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const records = await fetchUserAssessments(user.id, isDemo);
        setAssessments(records);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : typeof err === "object" && err !== null && "message" in err
            ? String((err as Record<string, unknown>).message)
            : "Could not retrieve assessment history.";
        toast({
          title: "Failed to load records",
          description: message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user, isDemo, toast]);

  const handleSignOut = async () => {
    await signOut();
    toast({ title: "Signed out", description: "You have been logged out securely." });
    navigate("/");
  };

  const handleConfirmDelete = async () => {
    if (!deletingRecord?.id) return;
    setIsDeleting(true);
    try {
      await deleteAssessment(deletingRecord.id, isDemo);
      setAssessments((prev) => prev.filter((a) => a.id !== deletingRecord.id));
      toast({
        title: "Report Deleted",
        description: "The health assessment report has been permanently deleted.",
      });
      setDeletingRecord(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
          ? String((err as Record<string, unknown>).message)
          : "Failed to delete assessment report.";
      toast({
        title: "Error deleting report",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const latest = assessments[0];

  const getRiskBadge = (level: "Low" | "Medium" | "High") => {
    switch (level) {
      case "Low":
        return <Badge className="bg-emerald-100 text-emerald-900 border border-emerald-300 font-semibold text-xs">Low Risk</Badge>;
      case "Medium":
        return <Badge className="bg-amber-100 text-amber-950 border border-amber-300 font-semibold text-xs">Medium Risk</Badge>;
      case "High":
        return <Badge className="bg-rose-100 text-rose-950 border border-rose-300 font-semibold text-xs">High Risk</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top Navigation */}
      <header className="bg-card border-b border-border/60 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-4">
          {/* Brand Logo with Urdu Calligraphy beneath emblem */}
          <div className="flex items-center gap-3">
            <AfiyatLogo variant="mark" size="xs" linkTo="/" />
            {isDemo ? (
              <Badge variant="secondary" className="text-2xs sm:text-xs bg-amber-50 text-amber-700 border-amber-200">
                Demo Mode
              </Badge>
            ) : (
              <Badge variant="outline" className="text-2xs sm:text-xs text-primary border-primary/30">
                Supabase Connected
              </Badge>
            )}
          </div>

          {/* Centered Navigation Actions */}
          <div className="hidden md:flex items-center gap-2">
            <Link to="/chat">
              <Button variant="outline" size="sm" className="gap-1.5 shadow-2xs rounded-xl border-border/80 hover:border-primary/50">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span>AI Consultation</span>
              </Button>
            </Link>
            <Link to="/assessment">
              <Button size="sm" className="gap-1.5 shadow-2xs rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
                <PlusCircle className="w-4 h-4" />
                <span>New Assessment</span>
              </Button>
            </Link>
            <Link to="/profile">
              <Button variant="outline" size="sm" className="gap-1.5 shadow-2xs rounded-xl border-border/80 hover:border-primary/50">
                <User className="w-4 h-4 text-primary" />
                <span>Profile</span>
              </Button>
            </Link>
          </div>

          {/* Right cluster: Mobile actions + Sign out */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex md:hidden items-center gap-1.5">
              <Link to="/chat">
                <Button variant="outline" size="sm" className="p-2 h-9 w-9 rounded-xl" title="AI Consultation">
                  <MessageSquare className="w-4 h-4 text-primary" />
                </Button>
              </Link>
              <Link to="/assessment">
                <Button size="sm" className="p-2 h-9 w-9 rounded-xl bg-primary text-primary-foreground" title="New Assessment">
                  <PlusCircle className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/profile">
                <Button variant="outline" size="sm" className="p-2 h-9 w-9 rounded-xl" title="Profile">
                  <User className="w-4 h-4 text-primary" />
                </Button>
              </Link>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1 text-muted-foreground hover:text-foreground rounded-xl">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
        {/* Welcome greeting (duplicate consultation button & redundant banner removed) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Hello, {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User"}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Your personalized AI wellness monitoring & health history dashboard.
            </p>
          </div>
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <Link to="/assessment">
              <Button size="sm" className="gap-2 shadow-xs rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
                <PlusCircle className="w-4 h-4" />
                <span>New Assessment</span>
              </Button>
            </Link>
            {latest && latest.id && (
              <Link to={`/reports/${latest.id}`}>
                <Button variant="outline" size="sm" className="gap-2 rounded-xl border-border/80 hover:bg-muted/50">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="hidden sm:inline">View Latest</span> Report
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Section 1: Today's Wellness Check-in */}
        <TodayCheckinCard />

        {/* Section 2: Explore Trends (Directly adjacent to daily check-ins) */}
        <TrendsSummaryCard />

        {/* Section 3: Wellness Streaks & Milestones */}
        <StreakProgressCard hasAssessment={assessments.length > 0} />

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading your health history...</p>
          </div>
        ) : !latest ? (
          /* Empty state */
          <Card className="p-12 text-center border-dashed border-2">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center mb-4">
              <Activity className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">No health assessments yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Complete your first 3-minute lifestyle & biometric assessment to view your personalized health score, BMI indicators, and AI insights.
            </p>
            <Link to="/assessment">
              <Button size="lg" className="gap-2">
                Start First Health Risk Assessment
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </Card>
        ) : (
          <>
            {/* Overview Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center justify-between">
                    <span>{latest.source === "chat" ? "Chief Symptom" : "Current BMI"}</span>
                    {latest.source === "chat" ? (
                      <MessageSquare className="w-4 h-4 text-primary" />
                    ) : (
                      <TrendingUp className="w-4 h-4 text-primary" />
                    )}
                  </CardDescription>
                  <CardTitle className="text-2xl sm:text-3xl font-bold truncate">
                    {latest.source === "chat" ? latest.symptoms[0] || "Consultation" : latest.bmi}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary" className="font-medium text-xs">
                    {latest.source === "chat" ? "From AI Chat" : latest.bmi_category}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-2">
                    {latest.source === "chat"
                      ? `Timeline: ${(latest.chat_summary_data?.duration as string) || "Recent"} • Intensity: ${(latest.chat_summary_data?.intensity as string) || "Mild"}`
                      : `Height: ${latest.height_cm} cm • Weight: ${latest.weight_kg} kg`}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center justify-between">
                    <span>Wellness Risk Indicator</span>
                    <Activity className="w-4 h-4 text-primary" />
                  </CardDescription>
                  <div className="mt-2">{getRiskBadge(latest.risk_level)}</div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mt-2">
                    Categorical awareness scale: Low / Medium / High
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center justify-between">
                    <span>Total Assessments</span>
                    <Calendar className="w-4 h-4 text-primary" />
                  </CardDescription>
                  <CardTitle className="text-3xl font-bold">{assessments.length}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Last evaluated: {new Date(latest.created_at || Date.now()).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Latest AI Insights Card */}
            <Card className="border-primary/20 shadow-soft">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    {latest.lifestyle_data?.assessment_mode === "offline" ? (
                      <>
                        <Activity className="w-4 h-4 text-amber-600" />
                        <span className="text-amber-800 dark:text-amber-300">Standardized Wellness Summary</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-primary">AI Wellness Summary</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {latest.lifestyle_data?.assessment_mode === "offline" && (
                      <Badge variant="outline" className="text-2xs border-amber-400 text-amber-800 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 font-bold">
                        Offline Mode
                      </Badge>
                    )}
                    {latest.source === "chat" && (
                      <Badge variant="outline" className="text-2xs border-primary/30 text-primary">
                        From AI Chat
                      </Badge>
                    )}
                    {latest.id && (
                      <div className="flex items-center gap-1.5">
                        <Link to={`/reports/${latest.id}`}>
                          <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-primary h-7 px-2.5 rounded-lg">
                            <FileText className="w-3.5 h-3.5" />
                            <span>View Report</span>
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingRecord(latest)}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                          title="Delete assessment report"
                          aria-label="Delete latest assessment report"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <CardTitle className="text-xl">Personalized Health Observations</CardTitle>
                <CardDescription>
                  Evaluated on {new Date(latest.created_at || Date.now()).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-foreground/90 leading-relaxed bg-muted/40 p-4 rounded-xl text-sm">
                  {latest.ai_summary}
                </p>

                {/* If chat assessment contains doctor discussion questions */}
                {Boolean((latest.chat_summary_data?.doctor_questions as string[])?.length) && (
                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/20">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4" />
                      <span>Questions to Discuss with Your Doctor:</span>
                    </h4>
                    <ul className="space-y-1.5">
                      {(latest.chat_summary_data?.doctor_questions as string[]).map((q, idx) => (
                        <li key={idx} className="text-xs sm:text-sm text-foreground/90 flex items-start gap-2">
                          <span className="font-mono text-xs text-primary font-bold">{idx + 1}.</span>
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {latest.recommendations && latest.recommendations.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">Key Actionable Habits:</h4>
                    <ul className="grid sm:grid-cols-2 gap-2">
                      {latest.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground p-3 rounded-xl bg-card border border-border/60">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Assessment History Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assessment History</CardTitle>
                <CardDescription>Complete log of your previous wellness evaluations.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border/60">
                  {assessments.map((item, idx) => (
                    <div key={item.id || idx} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground text-sm">
                            {item.source === "chat"
                              ? `AI Consultation: ${item.symptoms[0] || "General"}`
                              : `BMI ${item.bmi} (${item.bmi_category})`}
                          </span>
                          {item.source === "chat" && (
                            <Badge variant="outline" className="text-2xs border-primary/30 text-primary">
                              From AI Chat
                            </Badge>
                          )}
                          {item.lifestyle_data?.assessment_mode === "offline" && (
                            <Badge variant="outline" className="text-2xs border-amber-400 text-amber-800 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 font-bold">
                              Offline Mode
                            </Badge>
                          )}
                          {getRiskBadge(item.risk_level)}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">{item.ai_summary}</p>
                      </div>
                      <div className="flex items-center gap-3 sm:flex-col sm:items-end justify-between shrink-0">
                        <div className="text-xs text-muted-foreground sm:text-right">
                          {new Date(item.created_at || Date.now()).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {item.id && (
                            <Link to={`/reports/${item.id}`}>
                              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary hover:text-primary px-2">
                                <span>View Report</span>
                                <ArrowRight className="w-3 h-3" />
                              </Button>
                            </Link>
                          )}
                          {item.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingRecord(item)}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                              title="Delete assessment report"
                              aria-label={`Delete assessment report from ${new Date(item.created_at || Date.now()).toLocaleDateString()}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Mandatory Medical Safety Disclaimer */}
        <div className="pt-6 pb-2 border-t border-border/50 text-center text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground/80">
            This is not a medical diagnosis. It is general wellness guidance. Please consult a qualified healthcare professional.
          </p>
          <p className="text-muted-foreground/70">
            Afiyat AI evaluates wellness indicators and lifestyle habits. In case of acute or severe symptoms, seek immediate emergency care.
          </p>
        </div>
      </main>

      {/* Confirmation Dialog for Deleting Assessment Report */}
      <AlertDialog open={Boolean(deletingRecord)} onOpenChange={(open) => !open && !isDeleting && setDeletingRecord(null)}>
        <AlertDialogContent className="max-w-md rounded-2xl">
          <AlertDialogHeader className="space-y-2">
            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 mx-auto sm:mx-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Delete Health Assessment Report?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed space-y-2">
              <span>
                Are you sure you want to permanently delete this report evaluated on{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {deletingRecord?.created_at ? new Date(deletingRecord.created_at).toLocaleDateString() : "recent date"}
                </span>
                {deletingRecord?.bmi ? ` (BMI ${deletingRecord.bmi} • ${deletingRecord.bmi_category})` : ""}?
              </span>
              <span className="block text-rose-700 dark:text-rose-400 text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 mt-2">
                ⚠️ This action cannot be undone. Any active shared links pointing to this report will immediately stop working.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 mt-3">
            <AlertDialogCancel disabled={isDeleting} className="rounded-xl">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              disabled={isDeleting}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1.5"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Report</span>
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
