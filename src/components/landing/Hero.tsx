import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Sparkles, LayoutDashboard } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const Hero = () => {
  const { user } = useAuth();
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden gradient-hero">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-health-blue/5 rounded-full blur-3xl animate-pulse-soft animation-delay-200" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border mb-8 animate-fade-up">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-secondary-foreground">
              AI-Powered Health Insights
            </span>
          </div>

          {/* Main heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6 animate-fade-up animation-delay-100">
            AI-powered health assistant,{" "}
            <span className="text-primary">made simple</span>
          </h1>

          {/* Subheading */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-up animation-delay-200">
            Understand potential health risks and improve your lifestyle using AI.
            Get personalized insights in minutes, not hours.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 animate-fade-up animation-delay-300">
            {user ? (
              <>
                <Link to="/assessment">
                  <Button variant="hero" size="lg" className="w-full sm:w-auto">
                    Start Health Check
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/dashboard">
                  <Button variant="hero-outline" size="lg" className="w-full sm:w-auto gap-2">
                    <LayoutDashboard className="w-5 h-5" />
                    View My Dashboard
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/auth?mode=signup">
                  <Button variant="hero" size="lg" className="w-full sm:w-auto">
                    Start Free Health Check
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button variant="hero-outline" size="lg" className="w-full sm:w-auto">
                    Try Demo Account
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Trust note */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground animate-fade-up animation-delay-400">
            <Shield className="w-4 h-4" />
            <span>No diagnosis • No signup required to explore</span>
          </div>

          {/* Illustration placeholder */}
          <div className="mt-16 relative animate-fade-up animation-delay-400">
            <div className="relative mx-auto max-w-3xl">
              {/* Main card mockup */}
              <div className="bg-card rounded-3xl shadow-card border border-border/50 p-6 sm:p-8">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center flex-shrink-0">
                    <Heart className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-foreground mb-1">Your Health Overview</h3>
                    <p className="text-sm text-muted-foreground">Based on your recent assessment</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <HealthMetricCard 
                    label="BMI" 
                    value="23.5" 
                    status="healthy" 
                  />
                  <HealthMetricCard 
                    label="Heart Risk" 
                    value="Low" 
                    status="healthy" 
                  />
                  <HealthMetricCard 
                    label="Sleep Score" 
                    value="85%" 
                    status="good" 
                  />
                  <HealthMetricCard 
                    label="Activity" 
                    value="Good" 
                    status="good" 
                  />
                </div>
              </div>

              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 bg-card rounded-2xl shadow-soft border border-border/50 p-3 animate-float hidden sm:block">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-health-green-light flex items-center justify-center">
                    <CheckIcon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground">Report Ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const HealthMetricCard = ({ 
  label, 
  value, 
  status 
}: { 
  label: string; 
  value: string; 
  status: 'healthy' | 'good' | 'warning';
}) => {
  const statusColors = {
    healthy: 'bg-health-green-light text-primary',
    good: 'bg-health-blue-light text-health-blue',
    warning: 'bg-health-warm text-amber-600',
  };

  return (
    <div className="bg-muted rounded-2xl p-4 text-center">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-lg font-semibold rounded-lg px-2 py-0.5 inline-block ${statusColors[status]}`}>
        {value}
      </p>
    </div>
  );
};

const Heart = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5"/>
  </svg>
);

export default Hero;
