import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// The App component already has the necessary providers
createRoot(document.getElementById("root")!).render(<App />);
