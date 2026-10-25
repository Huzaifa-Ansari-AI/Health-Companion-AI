import { createRoot } from "react-dom/client";
import { initSentry } from "./lib/sentry";
import { initWebVitals } from "./lib/vitals";
import App from "./App.tsx";
import "./index.css";

// Initialize privacy-preserving Sentry error monitoring & Core Web Vitals telemetry
initSentry();
initWebVitals();

createRoot(document.getElementById("root")!).render(<App />);


