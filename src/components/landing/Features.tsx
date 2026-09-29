import { Calculator, Activity, Lightbulb, Download } from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Calculator,
      title: "Instant BMI Calculation",
      description: "Get your Body Mass Index calculated instantly with health range indicators.",
      color: "bg-health-green-light",
      iconColor: "text-primary",
    },
    {
      icon: Activity,
      title: "Disease Risk Levels",
      description: "Understand your risk levels (Low / Medium / High) for common health conditions.",
      color: "bg-health-blue-light",
      iconColor: "text-health-blue",
    },
    {
      icon: Lightbulb,
      title: "Lifestyle Recommendations",
      description: "Receive personalized tips to improve your diet, exercise, and daily habits.",
      color: "bg-health-warm",
      iconColor: "text-amber-600",
    },
    {
      icon: Download,
      title: "Downloadable Report",
      description: "Export your health insights as a PDF to share with family or healthcare providers.",
      color: "bg-secondary",
      iconColor: "text-secondary-foreground",
    },
  ];

  return (
    <section id="features" className="py-24 gradient-hero">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-card text-secondary-foreground text-sm font-medium mb-4 shadow-soft">
            What You Get
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Everything you need to understand your health
          </h2>
          <p className="text-muted-foreground">
            Comprehensive health insights without the complexity of medical reports.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <div 
              key={feature.title}
              className="group bg-card rounded-3xl p-6 border border-border/50 shadow-soft hover:shadow-card transition-all duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Icon */}
              <div className={`w-14 h-14 rounded-2xl ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                <feature.icon className={`w-7 h-7 ${feature.iconColor}`} />
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Disclaimer banner */}
        <div className="mt-16 max-w-3xl mx-auto">
          <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-soft text-center">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Important:</span>{" "}
              This tool provides general health insights and is{" "}
              <span className="text-primary font-medium">not a medical diagnosis</span>.
              Always consult healthcare professionals for medical advice.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
