import React from "react";
import ReactDOM from "react-dom/client";

/**
 * Render a React component into a fixed-size container for visual testing.
 * Returns a cleanup function.
 */
export function renderComponent(element: React.ReactElement): {
  container: HTMLElement;
  cleanup: () => void;
} {
  // Use a consistent container for deterministic rendering
  let container = document.getElementById("test-root");
  if (container) {
    container.remove();
  }
  container = document.createElement("div");
  container.id = "test-root";
  container.style.padding = "16px";
  container.style.background = "#f3f4f6";
  container.style.width = "400px";
  document.body.appendChild(container);

  const root = ReactDOM.createRoot(container);
  root.render(element);

  return {
    container,
    cleanup: () => {
      root.unmount();
      container.remove();
    },
  };
}
