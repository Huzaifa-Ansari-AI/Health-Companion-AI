import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { CheckinForm } from "@/components/tracking/CheckinForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, ArrowLeft, Shield } from "lucide-react";

const Checkin: React.FC = () => {
  const { isDemo } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-muted/30 pb-16">
      {/* Header */}
      <header className="bg-card border-b border-border/60 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Heart className="w-5 h-5 text-primary" />
              </div>
              <span className="font-bold text-base text-foreground">HealthAI</span>
            </Link>
            {isDemo && (
              <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                Demo Mode
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Daily Health & Rhythm Check-in
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-md mx-auto">
            Log your daily energy, sleep, and lifestyle habits in seconds to unlock personalized wellness trends.
          </p>
        </div>

        <CheckinForm onSuccess={() => navigate("/dashboard")} />

        {/* Medical Safety Disclaimer */}
        <div className="mt-8 text-center text-xs text-muted-foreground max-w-lg mx-auto flex items-center justify-center gap-1.5 bg-muted/40 p-3 rounded-xl border border-border/50">
          <Shield className="w-3.5 h-3.5 text-teal-600 shrink-0" />
          <span>
            <strong>Wellness Notice:</strong> Daily check-ins are for self-reflection and habit tracking. This is not a
            medical diagnosis or treatment plan.
          </span>
        </div>
      </main>
    </div>
  );
};

export default Checkin;
