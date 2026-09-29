import { Heart } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-muted py-12 border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo and tagline */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Heart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span className="font-semibold text-foreground">HealthAI</span>
                <p className="text-xs text-muted-foreground">
                  Built for health awareness, not diagnosis
                </p>
              </div>
            </div>

            {/* Links */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#how-it-works" className="hover:text-foreground transition-colors">
                How it works
              </a>
              <a href="#features" className="hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#trust" className="hover:text-foreground transition-colors">
                Trust & Safety
              </a>
            </div>
          </div>

          {/* Disclaimer and copyright */}
          <div className="mt-8 pt-8 border-t border-border/50 text-center">
            <p className="text-xs text-muted-foreground mb-2">
              <span className="font-medium">Disclaimer:</span> This application provides general health information 
              and is not intended to be a substitute for professional medical advice, diagnosis, or treatment.
            </p>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} HealthAI. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
