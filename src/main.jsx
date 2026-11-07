import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

/*  Turns the site into something you can install on a phone.

    Only registered in a real build — during `npm run dev` a service worker
    would serve you stale files and make you wonder why your edits aren't
    showing up. It also needs HTTPS, which Vercel gives you and localhost
    is exempt from.                                                        */
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Not being installable is not a reason to break the page.
    });
  });
}