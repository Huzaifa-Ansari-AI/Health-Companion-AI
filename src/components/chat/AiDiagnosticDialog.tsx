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

              {/* Model & Latency Telemetry */}
              <div
                className={`pt-2 border-t flex items-center justify-between text-2xs font-mono opacity-85 ${
                  result.ok ? "border-emerald-500/20" : "border-destructive/20"
                }`}
              >
                <span>Model: {result.model || "gemini-3.5-flash"}</span>
                <span className="flex items-center gap-1">
                  <Zap className={`w-3 h-3 ${result.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`} />
                  {result.latencyMs ?? 0}ms
                </span>
              </div>

              {/* Resolution Instructions */}
              {!result.ok && !isDemo && (
                <div className="pt-2 border-t border-destructive/20 text-2xs opacity-90 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">How to resolve:</span>
                    {result.category && (
                      <span className="font-mono text-3xs uppercase px-1.5 py-0.5 rounded bg-destructive/15 text-destructive font-semibold">
                        {result.category}
                      </span>
                    )}
                  </div>
                  {result.category === "key_missing" ? (
                    <ol className="list-decimal list-inside space-y-0.5 pl-1">
                      <li>Open your Supabase Project Dashboard.</li>
                      <li>Go to Edge Functions &gt; Manage Secrets.</li>
                      <li>Add secret <code className="font-mono bg-destructive/10 px-1 rounded">GEMINI_API_KEY</code>.</li>
                    </ol>
                  ) : result.category === "model_not_found" ? (
                    <ol className="list-decimal list-inside space-y-0.5 pl-1">
                      <li>Open your Supabase Project Dashboard &gt; Edge Functions &gt; Manage Secrets.</li>
                      <li>Update <code className="font-mono bg-destructive/10 px-1 rounded">GEMINI_MODEL</code> to an active model (e.g. <code className="font-mono">gemini-3.5-flash</code>).</li>
                      <li>Save and retry the diagnostic test.</li>
                    </ol>
                  ) : result.category === "rate_limited" ? (
                    <ol className="list-decimal list-inside space-y-0.5 pl-1">
                      <li>Wait 15–30 seconds before retrying.</li>
                      <li>Check your Google AI Studio quota and billing tier.</li>
                    </ol>
                  ) : result.category === "auth_invalid" ? (
                    <ol className="list-decimal list-inside space-y-0.5 pl-1">
                      <li>Verify your API key in Google AI Studio.</li>
                      <li>Update <code className="font-mono bg-destructive/10 px-1 rounded">GEMINI_API_KEY</code> in Supabase Secrets.</li>
                    </ol>
                  ) : result.category === "timeout" ? (
                    <ol className="list-decimal list-inside space-y-0.5 pl-1">
                      <li>Google Gemini response exceeded the timeout threshold.</li>
                      <li>You can retry now or set <code className="font-mono bg-destructive/10 px-1 rounded">GEMINI_FALLBACK_MODEL</code> in Supabase secrets.</li>
                    </ol>
                  ) : result.category === "upstream_unavailable" ? (
                    <ol className="list-decimal list-inside space-y-0.5 pl-1">
                      <li>Google AI servers are temporarily experiencing high traffic.</li>
                      <li>Wait a moment and click &ldquo;Run Diagnostic Test&rdquo; again.</li>
                    </ol>
                  ) : (
                    <p className="leading-relaxed pl-1">
                      {result.resolution || "Inspect Supabase Edge Function logs for diagnostic details."}
                    </p>
                  )}
                  {result.details && (
                    <div className="mt-2 pt-1.5 border-t border-destructive/15">
                      <p className="text-3xs font-mono text-destructive/80 break-all bg-destructive/5 p-1.5 rounded">
                        {result.details.length > 220 ? `${result.details.slice(0, 220)}...` : result.details}
                      </p>
                    </div>
                  )}
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
