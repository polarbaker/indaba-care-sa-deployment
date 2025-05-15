/// <reference types="vinxi/types/client" />

import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { Toaster } from "react-hot-toast";

import "./styles.css";

import { createRouter } from "./router";

// Set up a Router instance
const router = createRouter();

const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <RouterProvider router={router} />
      <Toaster position="top-right" toastOptions={{
        duration: 4000,
        style: {
          background: '#fff',
          color: '#363636',
        },
        success: {
          style: {
            background: '#ECFDF5',
            border: '1px solid #D1FAE5',
            color: '#065F46',
          },
        },
        error: {
          style: {
            background: '#FEF2F2',
            border: '1px solid #FEE2E2',
            color: '#B91C1C',
          },
        },
      }} />
    </React.StrictMode>,
  );
}