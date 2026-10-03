import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { fetchUserAssessments, AssessmentRecord } from "@/services/healthService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Heart,
  PlusCircle,
  LogOut,
  Download,
  Calendar,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  TrendingUp,
  MessageSquare,
  HelpCircle,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Dashboard: React.FC = () => {
  const { user, signOut, isDemo } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const records = await fetchUserAssessments(user.id, isDemo);
        setAssessments(records);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Could not retrieve assessment history.";
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

  const handlePrintReport = () => {
    window.print();
  };

  const latest = assessments[0];

  const getRiskBadge = (level: "Low" | "Medium" | "High") => {
    switch (level) {
      case "Low":
        return <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200">Low Risk</Badge>;
      case "Medium":
        return <Badge className="bg-amber-100 text-amber-800 border border-amber-200">Medium Risk</Badge>;
      case "High":
        return <Badge className="bg-rose-100 text-rose-800 border border-rose-200">High Risk</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top Navigation */}
      <header className="bg-card border-b border-border/60 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Heart className="w-5 h-5 text-primary" />
              </div>
              <span className="font-bold text-lg text-foreground">HealthAI</span>
            </Link>
            {isDemo ? (
              <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                Demo Mode
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-primary border-primary/30">
                Supabase Connected
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link to="/chat">
              <Button variant="outline" size="sm" className="gap-1.5 shadow-2xs rounded-xl">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span className="hidden sm:inline">AI Consultation</span>
              </Button>
            </Link>
            <Link to="/assessment">
              <Button size="sm" className="gap-1.5 shadow-2xs rounded-xl">
                <PlusCircle className="w-4 h-4" />
                <span>New Check</span>
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1 text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
        {/* Welcome greeting */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Hello, {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User"}
            </h1>
            <p className="text-muted-foreground mt-1">
              Your personalized AI wellness monitoring & health history dashboard.
            </p>
          </div>
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <Link to="/chat">
              <Button size="sm" className="gap-2 shadow-sm rounded-xl">
                <MessageSquare className="w-4 h-4" />
                Start AI Consultation
              </Button>
            </Link>
            {latest && latest.id && (
              <Link to={`/reports/${latest.id}`}>
                <Button variant="outline" size="sm" className="gap-2 rounded-xl">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="hidden sm:inline">View Full</span> Report
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Disclaimer Banner */}
        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-center gap-3 text-sm text-foreground/80">
          <ShieldAlert className="w-5 h-5 text-primary flex-shrink-0" />
          <span>
            <strong>Medical Notice:</strong> AI Health Assistant provides general wellness awareness. This is not a medical diagnosis.
          </span>
        </div>

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
                Start First Health Check
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
                  <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                    <Sparkles className="w-4 h-4" />
                    <span>AI Wellness Summary</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {latest.source === "chat" && (
                      <Badge variant="outline" className="text-2xs border-primary/30 text-primary">
                        From AI Chat
                      </Badge>
                    )}
                    {latest.id && (
                      <Link to={`/reports/${latest.id}`}>
                        <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-primary h-7 px-2.5 rounded-lg">
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Report</span>
                        </Button>
                      </Link>
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
                          {getRiskBadge(item.risk_level)}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">{item.ai_summary}</p>
                      </div>
                      <div className="flex items-center gap-3 sm:flex-col sm:items-end justify-between shrink-0">
                        <div className="text-xs text-muted-foreground sm:text-right">
                          {new Date(item.created_at || Date.now()).toLocaleDateString()}
                        </div>
                        {item.id && (
                          <Link to={`/reports/${item.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary hover:text-primary p-0 sm:px-2">
                              <span>View Report</span>
                              <ArrowRight className="w-3 h-3" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
