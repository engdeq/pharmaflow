import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "boxicons/css/boxicons.min.css";
import "./styles/theme.css";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
