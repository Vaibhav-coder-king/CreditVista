import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Credit Vista is a single dark navy theme — force dark class
document.documentElement.classList.add("dark");

createRoot(document.getElementById("root")!).render(<App />);
