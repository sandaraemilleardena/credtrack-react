import { installSessionProtection } from './auth/session';
import {initializeTheme} from './theme';
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app";
import "./index.css";

initializeTheme();
installSessionProtection();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
