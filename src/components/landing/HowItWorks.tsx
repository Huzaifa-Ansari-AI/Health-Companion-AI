import { ClipboardList, Brain, FileText } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      icon: ClipboardList,
      step: "01",
      title: "Enter your health details",
      description: "Answer simple questions about your lifestyle, habits, and health history. Takes less than 5 minutes.",
    },
    {
      icon: Brain,
      step: "02",
      title: "AI analyzes health patterns",
      description: "Our AI processes your information to identify potential health patterns and risk factors.",
    },
    {
      icon: FileText,
      step: "03",
      title: "Get simple health insights",
      description: "Receive easy-to-understand insights with personalized recommendations for a healthier lifestyle.",
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium mb-4">
            How It Works
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Three simple steps to better health awareness
          </h2>
          <p className="text-muted-foreground">
            No medical jargon. No complicated forms. Just straightforward health insights.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <div 
              key={step.step} 
              className="relative group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-primary/20 to-transparent -translate-x-1/2 z-0" />
              )}
              
              <div className="relative bg-card rounded-3xl p-8 border border-border/50 shadow-soft group-hover:shadow-card transition-all duration-300 group-hover:-translate-y-1">
                {/* Step number */}
                <span className="absolute -top-3 -right-3 w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-soft">
                  {step.step}
                </span>

                {/* Icon */}
                <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors">
                  <step.icon className="w-8 h-8 text-primary" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
