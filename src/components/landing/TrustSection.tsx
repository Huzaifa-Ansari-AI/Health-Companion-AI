import React from "react";
import { Shield, Lock, Eye, AlertCircle } from "lucide-react";

const TrustSection = () => {
  const trustPoints = [
    {
      icon: Shield,
      title: "Not a Medical Diagnosis",
      description:
        "Afiyat AI provides general wellness guidance and risk awareness. It is not intended to diagnose, treat, or replace professional healthcare consultations.",
    },
    {
      icon: Lock,
      title: "Strict Data Privacy",
      description:
        "Your health data remains private and securely stored with Row Level Security. We never sell your personal information or use it for marketing.",
    },
    {
      icon: Eye,
      title: "Transparent AI Reasoning",
      description:
        "Our AI explains its analysis with verifiable clinical references and clear categorization. No opaque black boxes—always transparent.",
    },
  ];

  return (
    <section id="trust" className="py-24 bg-white border-t border-slate-200/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block text-xs font-bold tracking-widest text-teal-700 uppercase mb-3 px-3.5 py-1 bg-teal-50 rounded-full border border-teal-200">
              TRUST & SAFETY
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
              Your Health, Your Privacy, Your Control
            </h2>
            <p className="text-base sm:text-lg text-slate-600">
              Built on clinical transparency, strict medical safeguards, and responsible AI practices.
            </p>
          </div>

          {/* 3 Trust Pillars */}
          <div className="grid md:grid-cols-3 gap-8 mb-14">
            {trustPoints.map((point) => (
              <div
                key={point.title}
                className="bg-slate-50/70 rounded-3xl p-8 border border-slate-200/80 text-center flex flex-col items-center hover:bg-slate-50 transition-colors"
              >
                <div className="w-16 h-16 rounded-2xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center mb-5 shadow-xs">
                  <point.icon className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {point.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed font-normal">
                  {point.description}
                </p>
              </div>
            ))}
          </div>

          {/* Mandatory Medical Disclaimer Card */}
          <div className="bg-amber-50/80 rounded-3xl p-7 sm:p-8 border-2 border-amber-300 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-200/80 text-amber-800 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-amber-950 mb-2">
                  Important Medical Safety Notice
                </h3>
                <p className="text-sm text-amber-900 leading-relaxed mb-4 font-normal">
                  Afiyat AI (عافیت AI) is designed for educational and personal health awareness only. The lifestyle
                  guidance and categorical risk estimates are generated from general clinical wellness parameters and
                  user-provided inputs.
                </p>
                <ul className="text-sm text-amber-900 space-y-2 font-medium">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-700 font-bold">•</span>
                    <strong>This is not a medical diagnosis:</strong> It cannot identify specific diseases or conditions.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-700 font-bold">•</span>
                    <strong>Consult a professional:</strong> Always seek the advice of a qualified doctor or healthcare provider for diagnosis and treatment.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-700 font-bold">•</span>
                    <strong>Emergency situation:</strong> If you experience chest pain, severe shortness of breath, or emergency symptoms, call local emergency services (e.g., 911 or local emergency number) immediately.
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
