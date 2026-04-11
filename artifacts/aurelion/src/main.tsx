/**
 * @module main
 * @description Application entry point for the AURELION luxury Aruba adventure tourism platform.
 * Mounts the root React component into the DOM element with id "root".
 * This file is the Vite build entry — it imports global CSS and renders the
 * top-level `<App />` component using React 18's `createRoot` API.
 *
 * No authentication or routing logic lives here; all of that is delegated to App.tsx.
 */

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

/**
 * Bootstrap the React application.
 * The non-null assertion (!) is safe because index.html always contains <div id="root">.
 */
createRoot(document.getElementById("root")!).render(<App />);
