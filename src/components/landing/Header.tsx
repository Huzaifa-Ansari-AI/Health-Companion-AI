import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, LogOut, MessageSquare, User, Menu, X, Activity } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { AfiyatLogo } from "@/components/common/AfiyatLogo";

const Header = () => {
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border shadow-xs">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo with authentic Urdu Calligraphy beneath emblem */}
          <div className="flex-shrink-0 flex items-center">
            <AfiyatLogo variant="mark" size="sm" linkTo="/" />
          </div>

          {/* Centered Informational Navigation Links */}
          <nav className="hidden lg:flex items-center justify-center space-x-10">
            <a
              href="#how-it-works"
              className="text-sm font-semibold text-slate-600 hover:text-emerald-700 transition-colors"
            >
              How It Works
            </a>
            <a
              href="#features"
              className="text-sm font-semibold text-slate-600 hover:text-emerald-700 transition-colors"
            >
              Features
            </a>
            <a
              href="#trust"
              className="text-sm font-semibold text-slate-600 hover:text-emerald-700 transition-colors"
            >
              Trust & Safety
            </a>
          </nav>

          {/* CTA Actions */}
          <div className="hidden sm:flex items-center gap-3">
            {user ? (
              <>
                <Link to="/chat">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 rounded-xl border-emerald-200 text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900"
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    <span>AI Consultation</span>
                  </Button>
                </Link>
                <Link to="/assessment">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    <Activity className="w-4 h-4 text-emerald-600" />
                    <span>New Check</span>
                  </Button>
                </Link>
                <Link to="/profile">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 rounded-xl text-slate-600 hover:text-slate-900"
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden md:inline">Profile</span>
                  </Button>
                </Link>
                <Link to="/dashboard">
                  <Button
                    size="sm"
                    className="gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-medium shadow-sm hover:from-emerald-700 hover:to-teal-800 border border-emerald-600"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard</span>
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut()}
                  className="gap-1 text-slate-500 hover:text-rose-600"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="sr-only sm:not-sr-only">Sign out</span>
                </Button>
              </>
            ) : (
              <>
                <Link to="/auth">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="font-medium text-slate-700 hover:text-emerald-700"
                  >
                    Log in
                  </Button>
                </Link>
                <Link to="/assessment">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                  >
                    Health Check
                  </Button>
                </Link>
                <Link to="/auth?mode=signup">
                  <Button
                    size="sm"
                    className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-medium shadow-sm hover:from-emerald-700 hover:to-teal-800"
                  >
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu trigger */}
          <div className="flex sm:hidden items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu drawer */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-border py-4 space-y-3 bg-background">
            <div className="flex flex-col space-y-2 px-2">
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                How It Works
              </a>
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Features
              </a>
              <a
                href="#trust"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Trust & Safety
              </a>
            </div>

            <div className="pt-3 border-t border-border flex flex-col gap-2 px-2">
              {user ? (
                <>
                  <Link to="/chat" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full justify-start gap-2">
                      <MessageSquare className="w-4 h-4 text-emerald-600" />
                      AI Consultation
                    </Button>
                  </Link>
                  <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full justify-start gap-2 bg-emerald-600 text-white">
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      signOut();
                    }}
                    className="w-full justify-start text-rose-600"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/assessment" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full border-emerald-300 text-emerald-800">
                      Start Health Check
                    </Button>
                  </Link>
                  <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full">
                      Log in
                    </Button>
                  </Link>
                  <Link to="/auth?mode=signup" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full bg-emerald-600 text-white">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
