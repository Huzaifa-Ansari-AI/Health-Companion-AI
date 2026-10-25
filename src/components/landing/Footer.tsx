import React from "react";
import { AfiyatLogo } from "@/components/common/AfiyatLogo";

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 py-14 border-t border-slate-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 pb-10 border-b border-slate-800">
            {/* Logo and Tagline with authentic Urdu Calligraphy */}
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="bg-white/10 p-2 rounded-2xl backdrop-blur-xs border border-white/15">
                <AfiyatLogo variant="mark" size="sm" linkTo="/" />
              </div>
              <div>
                <p className="text-base font-bold text-white tracking-wide">
                  Afiyat AI <span className="text-emerald-400 font-normal text-sm font-sans">(عافیت AI)</span>
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Your Health, Our Priority — Behtar Sehat 🍃 Roshan Mustaqbil
                </p>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="flex items-center gap-8 text-sm font-medium">
              <a href="#how-it-works" className="text-slate-300 hover:text-emerald-400 transition-colors">
                How It Works
              </a>
              <a href="#features" className="text-slate-300 hover:text-emerald-400 transition-colors">
                Features
              </a>
              <a href="#trust" className="text-slate-300 hover:text-emerald-400 transition-colors">
                Trust & Safety
              </a>
            </div>
          </div>

          {/* Mandatory Disclaimer & Copyright */}
          <div className="pt-8 text-center text-xs text-slate-400 space-y-3">
            <p className="max-w-3xl mx-auto leading-relaxed">
              <span className="font-semibold text-slate-300">Mandatory Medical Notice:</span> This application provides
              general wellness guidance and personal lifestyle awareness. It is not a medical diagnosis or treatment plan.
              Always consult a qualified healthcare professional regarding any medical condition or symptoms.
            </p>
            <p className="text-slate-500">
              © {new Date().getFullYear()} Afiyat AI. All rights reserved. Built for safe, transparent wellness insights.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
