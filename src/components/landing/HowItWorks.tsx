import React from "react";
import { ClipboardList, Brain, TrendingUp } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      icon: ClipboardList,
      step: "01",
      title: "Enter Your Health Details",
      description: "Fill in basic health information like age, weight, height, and lifestyle habits.",
      iconBg: "bg-emerald-500 text-white",
      stepColor: "text-slate-300",
    },
    {
      icon: Brain,
      step: "02",
      title: "AI Analyzes Patterns",
      description: "Our AI processes your data to identify potential health patterns and risk factors.",
      iconBg: "bg-teal-500 text-white",
      stepColor: "text-slate-300",
    },
    {
      icon: TrendingUp,
      step: "03",
      title: "Get Simple Insights",
      description: "Receive easy-to-understand health insights with personalized lifestyle recommendations.",
      iconBg: "bg-cyan-500 text-white",
      stepColor: "text-slate-300",
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-white border-t border-slate-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block text-xs font-bold tracking-widest text-teal-600 uppercase mb-3 px-3 py-1 bg-teal-50 rounded-full border border-teal-100">
            HOW IT WORKS
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            Three Simple Steps to{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
              Better Health
            </span>
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            Get started in minutes with our easy-to-use health assessment tool.
          </p>
        </div>

        {/* 3 Step Cards with Connectors */}
        <div className="relative max-w-5xl mx-auto">
          {/* Connecting line behind cards on desktop */}
          <div
            className="hidden md:block absolute top-1/2 left-16 right-16 h-0.5 bg-slate-200 -translate-y-6 z-0"
            aria-hidden="true"
          />

          <div className="grid md:grid-cols-3 gap-8 relative z-10">
            {steps.map((step) => (
              <div
                key={step.step}
                className="group bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm hover:shadow-card transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
              >
                <div>
                  {/* Top card header: Icon badge & Large Step Number */}
                  <div className="flex items-center justify-between mb-6">
                    <div
                      className={`w-14 h-14 rounded-2xl ${step.iconBg} flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform`}
                    >
                      <step.icon className="w-7 h-7" />
                    </div>
                    <span className={`text-4xl font-extrabold ${step.stepColor} tracking-tight select-none`}>
                      {step.step}
                    </span>
                  </div>

                  {/* Step Title */}
                  <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-emerald-700 transition-colors">
                    {step.title}
                  </h3>

                  {/* Step Description */}
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
