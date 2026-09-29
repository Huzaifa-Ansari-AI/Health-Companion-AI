import React from "react";
import { AlertTriangle, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmergencyBannerProps {
  category?: string;
}

export const EmergencyBanner: React.FC<EmergencyBannerProps> = ({ category }) => {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="bg-rose-500/15 border-y md:border md:rounded-xl border-rose-500/40 p-4 text-foreground shadow-sm animate-in fade-in slide-in-from-top-2 duration-300"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 animate-pulse" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-semibold text-rose-700 dark:text-rose-300 text-sm md:text-base flex items-center gap-2">
              Potential Medical Emergency Detected
              {category && (
                <span className="text-xs font-normal bg-rose-500/20 px-2 py-0.5 rounded-full">
                  {category}
                </span>
              )}
            </h3>
            <p className="text-xs md:text-sm text-foreground/90 mt-1 leading-relaxed">
              Your symptoms suggest urgent medical attention may be needed. Please call emergency services (<strong>911</strong> in US/Canada, <strong>999</strong> in UK, <strong>112</strong> in Europe) or go to the nearest Emergency Room immediately.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <a href="tel:911" className="w-full sm:w-auto">
            <Button
              variant="destructive"
              size="sm"
              className="w-full sm:w-auto gap-2 font-medium shadow-sm bg-rose-600 hover:bg-rose-700 text-white"
            >
              <PhoneCall className="w-4 h-4" />
              Call 911 Now
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
};
