import "./lib/global-polyfill"; // Must be first import
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Router } from "wouter";

// Ensure the AuthProvider is wrapped by QueryClientProvider
// and QueryClientProvider is the outermost provider
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <Router base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
    <AuthProvider>
      <App />
    </AuthProvider>
    </Router>
  </QueryClientProvider>
);
