import { Shield, Lock, Eye, AlertCircle } from "lucide-react";

const TrustSection = () => {
  const trustPoints = [
    {
      icon: Shield,
      title: "Not a Diagnosis",
      description: "This tool provides general health insights and awareness. It is not intended to diagnose, treat, or replace professional medical advice.",
    },
    {
      icon: Lock,
      title: "Data Privacy",
      description: "Your health information stays private and secure. We don't share your data with third parties or use it for advertising.",
    },
    {
      icon: Eye,
      title: "Transparent AI",
      description: "Our AI explains its reasoning clearly. No black boxes—understand how your health insights are generated.",
    },
  ];

  return (
    <section id="trust" className="py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Section header */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium mb-4">
              Trust & Safety
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Your health, your privacy, your control
            </h2>
            <p className="text-muted-foreground">
              We believe in transparency and responsible AI for health awareness.
            </p>
          </div>

          {/* Trust points */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {trustPoints.map((point, index) => (
              <div 
                key={point.title}
                className="text-center group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-16 h-16 rounded-2xl bg-secondary mx-auto flex items-center justify-center mb-5 group-hover:bg-primary/10 transition-colors">
                  <point.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {point.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {point.description}
                </p>
              </div>
            ))}
          </div>

          {/* Important disclaimer card */}
          <div className="bg-health-warm rounded-3xl p-8 border border-amber-200/50">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  Important Medical Disclaimer
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  HealthAI is designed for educational and informational purposes only. The health insights 
                  provided are based on general health guidelines and AI analysis of the information you provide.
                </p>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold">•</span>
                    This is NOT a medical diagnosis tool
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold">•</span>
                    Always consult qualified healthcare professionals for medical advice
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold">•</span>
                    In case of emergency, contact your local emergency services immediately
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
