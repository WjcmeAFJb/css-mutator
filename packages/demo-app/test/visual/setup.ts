import React from "react";
import ReactDOM from "react-dom/client";

/**
 * Render a React component into the document body for screenshot testing.
 * Returns a cleanup function.
 */
export function renderComponent(element: React.ReactElement): {
  container: HTMLElement;
  cleanup: () => void;
} {
  const container = document.createElement("div");
  container.id = "test-root";
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
