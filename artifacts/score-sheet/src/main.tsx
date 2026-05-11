import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";

// Point the API client at the correct server.
// In dev: http://localhost:5000  (or whatever VITE_API_URL is set to)
// In production (Vercel): your Render API URL set in VITE_API_URL
const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:5000";
setBaseUrl(apiUrl);

document.documentElement.classList.add("dark");

createRoot(document.getElementById("root")!).render(<App />);

