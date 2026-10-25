import React from "react";
import { Calculator, Activity, Lightbulb, Download } from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Calculator,
      title: "Instant BMI Evaluation",
      description: "Get your Body Mass Index evaluated instantly with WHO health ranges and body metric tracking.",
      iconBg: "bg-emerald-100 text-emerald-700",
      borderAccent: "hover:border-emerald-300",
    },
    {
      icon: Activity,
      title: "Categorical Risk Assessment",
      description: "Understand your health patterns categorized safely into Low, Medium, or High risk levels.",
      iconBg: "bg-teal-100 text-teal-700",
      borderAccent: "hover:border-teal-300",
    },
    {
      icon: Lightbulb,
      title: "Non-Prescriptive Guidance",
      description: "Receive practical lifestyle guidance tailored to your hydration, sleep, nutrition, and activity.",
      iconBg: "bg-amber-100 text-amber-700",
      borderAccent: "hover:border-amber-300",
    },
    {
      icon: Download,
      title: "Doctor-Ready PDF Reports",
      description: "Export structured, vector PDF summaries to facilitate informed discussions with your healthcare provider.",
      iconBg: "bg-cyan-100 text-cyan-700",
      borderAccent: "hover:border-cyan-300",
    },
  ];

  return (
    <section id="features" className="py-24 bg-slate-50/70 border-t border-slate-200/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block text-xs font-bold tracking-widest text-emerald-700 uppercase mb-3 px-3.5 py-1 bg-emerald-50 rounded-full border border-emerald-200">
            WHAT YOU GET
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            Everything You Need to Understand Your Health
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            Comprehensive wellness intelligence without the confusion of complex medical paperwork.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {features.map((feature) => (
            <div
              key={feature.title}
              className={`bg-white rounded-3xl p-7 border border-slate-200 shadow-sm hover:shadow-card transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between ${feature.borderAccent}`}
            >
              <div>
                <div
                  className={`w-14 h-14 rounded-2xl ${feature.iconBg} flex items-center justify-center mb-6 shadow-xs`}
                >
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2.5">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed font-normal">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
