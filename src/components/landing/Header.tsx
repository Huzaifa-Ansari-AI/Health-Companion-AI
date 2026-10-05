import { Button } from "@/components/ui/button";
import { Heart, LayoutDashboard, LogOut, MessageSquare, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const Header = () => {
  const { user, signOut } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Heart className="w-5 h-5 text-primary" />
            </div>
            <span className="text-lg font-semibold text-foreground">
              HealthAI
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/chat" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>AI Chatbot</span>
            </Link>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              How it works
            </a>
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#trust" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Trust & Safety
            </a>
          </nav>

          {/* CTA */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link to="/chat">
                  <Button variant="outline" size="sm" className="gap-1.5 hidden sm:inline-flex rounded-xl">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    <span>AI Chat</span>
                  </Button>
                </Link>
                <Link to="/profile">
                  <Button variant="outline" size="sm" className="gap-1.5 hidden md:inline-flex rounded-xl">
                    <User className="w-4 h-4 text-primary" />
                    <span>Profile</span>
                  </Button>
                </Link>
                <Link to="/dashboard">
                  <Button size="sm" className="gap-2 rounded-xl">
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard</span>
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={() => signOut()} className="gap-1.5 text-muted-foreground hover:text-foreground">
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign out</span>
                </Button>
              </>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                    Log in
                  </Button>
                </Link>
                <Link to="/auth?mode=signup">
                  <Button size="sm">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
