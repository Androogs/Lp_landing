import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { CartProvider } from "@/context/CartContext";
import { UIProvider } from "@/context/UIContext";
import "./styles/styles.css";

if (!("IntersectionObserver" in window)) document.documentElement.classList.add("no-io");
document.documentElement.classList.add("is-ready");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <UIProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </UIProvider>
    </BrowserRouter>
  </StrictMode>
);
