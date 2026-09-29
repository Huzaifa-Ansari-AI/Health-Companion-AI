import { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Heart,
  ArrowLeft,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Send,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { mapAuthError, validatePassword } from "@/lib/authErrors";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signIn, signUp, resendVerificationEmail, loginAsDemo, user } = useAuth();
  const { toast } = useToast();

  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isUnconfirmedError, setIsUnconfirmedError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Verification screen state
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const mode = searchParams.get("mode");
    setIsLogin(mode !== "signup");
    setError("");
    setIsUnconfirmedError(false);
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  // 60-second cooldown timer for resend email
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsUnconfirmedError(false);

    // Basic validation
    if (!email || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!isLogin) {
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      const pwCheck = validatePassword(password);
      if (!pwCheck.isValid) {
        setError(pwCheck.error || "Password does not meet requirements.");
        return;
      }
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        const { error: signInError } = await signIn(email, password);
        if (signInError) {
          const mapped = mapAuthError(signInError);
          setError(mapped.message);
          setIsUnconfirmedError(mapped.isUnconfirmedEmail);
        } else {
          toast({ title: "Welcome back!", description: "Successfully logged in." });
          navigate("/dashboard");
        }
      } else {
        const { error: signUpError, hasSession } = await signUp(email, password, fullName);
        if (signUpError) {
          const mapped = mapAuthError(signUpError);
          setError(mapped.message);
        } else if (!hasSession) {
          // Email confirmation is required - transition to dedicated verification view
          setRegisteredEmail(email);
          setIsVerificationSent(true);
          setResendCooldown(60);
          toast({
            title: "Verification email sent!",
            description: "Please check your inbox to confirm your account.",
          });
        } else {
          // Auto-confirmed / direct session
          toast({
            title: "Account created!",
            description: "Welcome to Health Companion AI.",
          });
          navigate("/dashboard");
        }
      }
    } catch (err: unknown) {
      const mapped = mapAuthError(err);
      setError(mapped.message);
      setIsUnconfirmedError(mapped.isUnconfirmedEmail);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async (targetEmail: string) => {
    if (!targetEmail || resendCooldown > 0 || isResending) return;

    setIsResending(true);
    try {
      const { error: resendErr } = await resendVerificationEmail(targetEmail);
      if (resendErr) {
        const mapped = mapAuthError(resendErr);
        toast({
          title: "Resend failed",
          description: mapped.message,
          variant: "destructive",
        });
      } else {
        setResendCooldown(60);
        toast({
          title: "Verification email sent",
          description: `A new confirmation link was sent to ${targetEmail}. Please check your inbox and spam folder.`,
        });
      }
    } catch (err: unknown) {
      const mapped = mapAuthError(err);
      toast({
        title: "Resend error",
        description: mapped.message,
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleDemoLogin = () => {
    loginAsDemo();
    toast({
      title: "Demo Mode Active",
      description: "Exploring AI Health Assistant with demo session.",
    });
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      {/* Header */}
      <header className="p-4 sm:p-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm">Back to home</span>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Heart className="w-6 h-6 text-primary" />
              </div>
              <span className="text-xl font-semibold text-foreground">HealthAI</span>
            </Link>
          </div>

          {/* DEDICATED VERIFICATION EMAIL SENT SCREEN */}
          {isVerificationSent ? (
            <div className="bg-card rounded-3xl shadow-card border border-border/50 p-8 text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">Check your email</h1>
                <p className="text-sm text-muted-foreground">
                  We've sent a confirmation link to:
                </p>
                <p className="font-semibold text-foreground bg-muted py-1.5 px-3 rounded-xl inline-block text-sm">
                  {registeredEmail}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-secondary/60 border border-secondary text-xs text-muted-foreground leading-relaxed text-left space-y-1.5">
                <p className="font-medium text-foreground">Next steps:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Click the confirmation link in your email.</li>
                  <li>Check your <strong>spam or junk folder</strong> if you don't see it within a minute.</li>
                  <li>Return here and log in to your account.</li>
                </ol>
              </div>

              <div className="space-y-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  disabled={resendCooldown > 0 || isResending}
                  onClick={() => handleResend(registeredEmail)}
                >
                  {isResending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : resendCooldown > 0 ? (
                    `Resend email (${resendCooldown}s)`
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Resend confirmation email
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="hero"
                  className="w-full"
                  onClick={() => {
                    setIsVerificationSent(false);
                    setIsLogin(true);
                    setEmail(registeredEmail);
                    setError("");
                  }}
                >
                  Back to Log in
                </Button>
              </div>
            </div>
          ) : (
            /* STANDARD AUTH CARD */
            <div className="bg-card rounded-3xl shadow-card border border-border/50 p-8">
              {/* Title */}
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {isLogin ? "Welcome back" : "Create your account"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {isLogin
                    ? "Enter your credentials to access your health insights"
                    : "Start your journey to better health awareness"}
                </p>
              </div>

              {/* Error message & Unconfirmed Banner */}
              {error && (
                <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive leading-relaxed">{error}</p>
                  </div>

                  {/* Resend button directly inside error banner if email is unconfirmed */}
                  {isUnconfirmedError && (
                    <div className="pt-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="w-full text-xs gap-1.5 border-destructive/30 hover:bg-destructive/10 text-foreground"
                        disabled={resendCooldown > 0 || isResending}
                        onClick={() => handleResend(email)}
                      >
                        {isResending ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Sending email...
                          </>
                        ) : resendCooldown > 0 ? (
                          `Resend confirmation email (${resendCooldown}s)`
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5 text-primary" />
                            Resend confirmation email
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Full Name (signup only) */}
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-sm font-medium text-foreground">
                      Full name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Jane Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-12 h-12 rounded-xl border-border bg-muted/50 focus:bg-background"
                      />
                    </div>
                  </div>
                )}

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">
                    Email address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-12 h-12 rounded-xl border-border bg-muted/50 focus:bg-background"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium text-foreground">
                      Password
                    </Label>
                    {!isLogin && (
                      <span className="text-xs text-muted-foreground">Min. 8 characters</span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-12 pr-12 h-12 rounded-xl border-border bg-muted/50 focus:bg-background"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password (signup only) */}
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                      Confirm password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-12 pr-12 h-12 rounded-xl border-border bg-muted/50 focus:bg-background"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Submit button */}
                <Button
                  type="submit"
                  variant="hero"
                  size="lg"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Please wait..." : isLogin ? "Log in" : "Create Account"}
                </Button>

                {/* Demo account button (login only) */}
                {isLogin && (
                  <Button
                    type="button"
                    variant="hero-outline"
                    size="lg"
                    className="w-full"
                    onClick={handleDemoLogin}
                  >
                    <User className="w-5 h-5" />
                    Try Demo Account
                  </Button>
                )}
              </form>

              {/* Toggle auth mode */}
              <div className="mt-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setError("");
                      setIsUnconfirmedError(false);
                      setPassword("");
                      setConfirmPassword("");
                    }}
                    className="text-primary font-medium hover:underline"
                  >
                    {isLogin ? "Sign up" : "Log in"}
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-xs text-muted-foreground text-center mt-6 px-4">
            By continuing, you acknowledge that this application provides general health information and is
            not a substitute for professional medical advice.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Auth;
