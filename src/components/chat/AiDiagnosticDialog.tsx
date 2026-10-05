// AI Diagnostic Dialog Component
// Provides transparent, real-time connectivity testing for Gemini/OpenAI integration.

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { checkAiHealth, AiDiagnosticResult } from "@/services/chatService";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  KeyRound,
  Server,
  Zap,
} from "lucide-react";

interface AiDiagnosticDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDemo?: boolean;
}

export const AiDiagnosticDialog: React.FC<AiDiagnosticDialogProps> = ({
  open,
  onOpenChange,
  isDemo = false,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<AiDiagnosticResult | null>(null);

  const runTest = async () => {
    setIsRunning(true);
    setResult(null);
    try {
      const diag = await checkAiHealth(isDemo);
      setResult(diag);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setResult({
        ok: false,
        message: `Diagnostic execution failed: ${msg}`,
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl p-6">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Activity className="w-4 h-4" />
            </div>
            <DialogTitle className="text-base font-semibold">
              AI Service Diagnostic
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Test real-time connectivity between Supabase Edge Functions and the Google Gemini API.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Environment summary */}
          <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/60">
            <div>
              <span className="text-muted-foreground text-2xs block uppercase">Target Provider</span>
              <strong className="text-foreground flex items-center gap-1 font-medium mt-0.5">
                <Server className="w-3.5 h-3.5 text-primary" />
                Google Gemini
              </strong>
            </div>
            <div>
              <span className="text-muted-foreground text-2xs block uppercase">Mode</span>
              <Badge variant="outline" className="text-2xs font-normal mt-0.5">
                {isDemo ? "Demo Simulation" : "Production Edge"}
              </Badge>
            </div>
          </div>

          {/* Result view */}
          {result && (
            <div
              className={`p-3.5 rounded-xl border space-y-2 animate-in fade-in duration-200 ${
                result.ok
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200"
                  : "bg-destructive/10 border-destructive/30 text-destructive dark:text-rose-200"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {result.ok ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Connection Healthy</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-destructive dark:text-rose-400 shrink-0" />
                    <span>Connection Unsuccessful</span>
                  </>
                )}
              </div>

              <p className="text-xs opacity-90 leading-relaxed">{result.message}</p>

              {result.ok && (
                <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between text-2xs opacity-80 font-mono">
                  <span>Model: {result.model || "gemini-1.5-flash"}</span>
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    {result.latencyMs}ms
                  </span>
                </div>
              )}

              {!result.ok && !isDemo && (
                <div className="pt-2 border-t border-destructive/20 text-2xs opacity-90 space-y-1">
                  <span className="font-semibold block">How to resolve:</span>
                  <ol className="list-decimal list-inside space-y-0.5 pl-1">
                    <li>Open your Supabase Project Dashboard.</li>
                    <li>Go to Edge Functions &gt; Manage Secrets.</li>
                    <li>Add secret <code className="font-mono bg-destructive/10 px-1 rounded">GEMINI_API_KEY</code>.</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* Action Button */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs rounded-xl"
            >
              Close
            </Button>
            <Button
              size="sm"
              onClick={runTest}
              disabled={isRunning}
              className="text-xs rounded-xl gap-1.5 shadow-2xs"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Testing Connection...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Run Diagnostic Test</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
