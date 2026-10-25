import { createRoot } from "react-dom/client";
import { initSentry } from "./lib/sentry";
import App from "./App.tsx";
import "./index.css";

// Initialize privacy-preserving Sentry error monitoring
initSentry();

createRoot(document.getElementById("root")!).render(<App />);

