import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, MessageSquare, Activity, LayoutDashboard, CheckCircle2, Sparkles, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { AfiyatLogo } from "@/components/common/AfiyatLogo";
import { useQuery } from "@tanstack/react-query";
import { fetchUserAssessments, AssessmentRecord } from "@/services/healthService";

const Hero = () => {
  const { user, isDemo } = useAuth();

  const { data: assessments, isLoading: isLoadingAssessments } = useQuery<AssessmentRecord[]>({
    queryKey: ["hero-user-assessments", user?.id],
    queryFn: () => (user?.id ? fetchUserAssessments(user.id, isDemo) : Promise.resolve([])),
    enabled: !!user?.id,
  });

  const latestAssessment = assessments && assessments.length > 0 ? assessments[0] : null;
  const latestBmiAssessment = assessments?.find((a) => a.bmi != null);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden gradient-hero pt-24 pb-16">
      {/* Decorative ambient gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse-soft" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Top Category Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 mb-8 shadow-xs">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span className="text-xs sm:text-sm font-semibold text-emerald-800">
              Intelligent Healthcare & Wellness Assistant
            </span>
          </div>

          {/* Main Hero Emblem & Calligraphy - Prominent Image 1 Logo */}
          <div className="mb-6 flex justify-center">
            <AfiyatLogo
              variant="full"
              size="hero"
              className="max-w-[90vw] sm:max-w-md md:max-w-lg h-auto drop-shadow-sm"
              alt="Afiyat AI (عافیت AI) — Your Health, Our Priority"
            />
          </div>

          {/* Accessible Semantic Heading for Screen Readers & SEO */}
          <h1 className="sr-only">
            Afiyat AI — AI-Powered Health & Wellness Assistant
          </h1>

          {/* Subheading */}
          <p className="text-base sm:text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            Understand potential health risks, evaluate daily lifestyle metrics, and consult
            transparent AI guidance in seconds.
          </p>

          {/* The Three Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            {/* Primary Action: AI Consultation */}
            <Link to="/chat" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto h-12 px-6 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-semibold shadow-sm border border-emerald-500 flex items-center justify-center gap-2 text-base transition-all hover:scale-[1.02]"
              >
                <MessageSquare className="w-5 h-5" />
                <span>AI Consultation</span>
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </Button>
            </Link>

            {/* Secondary Action: Health Risk Assessment */}
            <Link to="/assessment" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-12 px-6 rounded-xl bg-white hover:bg-emerald-50/70 text-emerald-800 hover:text-emerald-900 border-2 border-emerald-400 font-semibold shadow-xs flex items-center justify-center gap-2 text-base transition-all hover:scale-[1.02]"
              >
                <Activity className="w-5 h-5 text-emerald-600" />
                <span>Health Risk Assessment</span>
              </Button>
            </Link>

            {/* Tertiary Action: Dashboard */}
            <Link to="/dashboard" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-12 px-6 rounded-xl bg-white hover:bg-slate-100 text-slate-800 hover:text-slate-900 border-2 border-slate-300 font-semibold shadow-xs flex items-center justify-center gap-2 text-base transition-all hover:scale-[1.02]"
              >
                <LayoutDashboard className="w-5 h-5 text-slate-600" />
                <span>Dashboard</span>
              </Button>
            </Link>
          </div>

          {/* Safety Trust Note */}
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-medium text-slate-500 mb-14">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>This is not a medical diagnosis • Transparent AI • Free to explore</span>
          </div>

          {/* Interactive Health Overview Card */}
          <div className="relative mx-auto max-w-3xl text-left">
            <div className="bg-white rounded-3xl shadow-card border border-slate-200/80 p-6 sm:p-8 backdrop-blur-xs">
              {user && latestAssessment ? (
                /* Authenticated User with Real Assessment Data */
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100/70 flex items-center justify-center text-emerald-700">
                        <Activity className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">Your Health Overview</h3>
                        <p className="text-xs sm:text-sm text-slate-500">
                          Based on your {latestAssessment.source === "chat" ? "AI consultation" : "assessment"} from{" "}
                          {latestAssessment.created_at
                            ? new Date(latestAssessment.created_at).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "Recent Evaluation"}
                        </p>
                      </div>
                    </div>
                    <Link to={latestAssessment.id ? `/reports/${latestAssessment.id}` : "/dashboard"}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs"
                      >
                        <FileText className="w-3.5 h-3.5 mr-1.5" />
                        View Full Report
                      </Button>
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {latestAssessment.bmi != null ? (
                      <MetricCard
                        label="Your BMI"
                        value={String(latestAssessment.bmi)}
                        badge={latestAssessment.bmi_category || "Calculated"}
                        variant="emerald"
                      />
                    ) : latestBmiAssessment?.bmi != null ? (
                      <MetricCard
                        label="Your BMI"
                        value={String(latestBmiAssessment.bmi)}
                        badge={latestBmiAssessment.bmi_category || "Recent Record"}
                        variant="emerald"
                      />
                    ) : (
                      <MetricCard
                        label={latestAssessment.source === "chat" ? "Chief Symptom" : "Your BMI"}
                        value={latestAssessment.symptoms?.[0] || "Consultation"}
                        badge={latestAssessment.source === "chat" ? "From AI Chat" : "Pending Check"}
                        variant="emerald"
                      />
                    )}

                    <MetricCard
                      label="Evaluated Risk"
                      value={latestAssessment.risk_level || "Low"}
                      badge="Categorical"
                      variant={
                        latestAssessment.risk_level === "High"
                          ? "rose"
                          : latestAssessment.risk_level === "Medium"
                          ? "amber"
                          : "emerald"
                      }
                    />

                    <MetricCard
                      label="Sleep Routine"
                      value={
                        latestAssessment.lifestyle_data?.sleep_hours
                          ? `${latestAssessment.lifestyle_data.sleep_hours} hrs`
                          : "Logged"
                      }
                      badge="Daily Habit"
                      variant="cyan"
                    />

                    <MetricCard
                      label="Activity"
                      value={
                        typeof latestAssessment.lifestyle_data?.activity_level === "string" &&
                        latestAssessment.lifestyle_data.activity_level.trim()
                          ? latestAssessment.lifestyle_data.activity_level
                          : "Active"
                      }
                      badge="Habit"
                      variant="indigo"
                    />
                  </div>
                </div>
              ) : user && !isLoadingAssessments ? (
                /* Authenticated User without Assessments Yet */
                <div className="text-center py-6">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center mb-4">
                    <Activity className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">Welcome to Afiyat AI</h3>
                  <p className="text-sm text-slate-600 max-w-md mx-auto mb-5">
                    You have not completed a health assessment yet. Take a quick 3-minute check to generate your
                    personalized BMI evaluation and wellness risk insights.
                  </p>
                  <Link to="/assessment">
                    <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
                      Start Your First Health Assessment
                    </Button>
                  </Link>
                </div>
              ) : (
                /* Unauthenticated Visitor: Clear Demonstration Preview */
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-slate-900">Health Intelligence Overview</h3>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Feature Preview
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-500">
                        Sample personalized indicators generated after completing your free assessment
                      </p>
                    </div>
                    <Link to="/assessment">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-semibold"
                      >
                        Check Your Numbers Free
                      </Button>
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <MetricCard label="BMI Indicator" value="22.4" badge="Healthy Range" variant="emerald" />
                    <MetricCard label="Lifestyle Risk" value="Low" badge="Calculated" variant="emerald" />
                    <MetricCard label="Rest Quality" value="7.5 hrs" badge="Optimal" variant="cyan" />
                    <MetricCard label="Doctor Report" value="Ready" badge="Exportable" variant="indigo" />
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 text-center sm:text-left">
                    <p className="text-[11px] text-slate-400">
                      *Sample data shown for demonstration. Take an assessment to view your authentic health metrics.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Floating Report Ready Pill */}
            <div className="absolute -top-3 -right-3 bg-white rounded-2xl shadow-soft border border-emerald-200 px-3.5 py-2 hidden sm:flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-800">Doctor Report Ready</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

interface MetricCardProps {
  label: string;
  value: string;
  badge?: string;
  variant: "emerald" | "cyan" | "amber" | "rose" | "indigo";
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, badge = "Wellness", variant }) => {
  const variantStyles = {
    emerald: "bg-emerald-50 text-emerald-800 border-emerald-200",
    cyan: "bg-cyan-50 text-cyan-800 border-cyan-200",
    amber: "bg-amber-50 text-amber-800 border-amber-200",
    rose: "bg-rose-50 text-rose-800 border-rose-200",
    indigo: "bg-indigo-50 text-indigo-800 border-indigo-200",
  };

  return (
    <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 text-center flex flex-col justify-between">
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-slate-900 my-0.5 truncate" title={value}>
        {value || "—"}
      </p>
      <span
        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border inline-block mx-auto mt-1 ${variantStyles[variant]}`}
      >
        {badge}
      </span>
    </div>
  );
};

export default Hero;
