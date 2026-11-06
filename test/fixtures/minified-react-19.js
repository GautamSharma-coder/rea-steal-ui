/**
 * Synthetic Minified React 19 Bundle Fixture
 *
 * This fixture simulates a production-compiled React 19 bundle
 * containing minified _jsx() calls for testing the AST decompiler.
 *
 * IMPORTANT: This is NOT real application code. It is a synthetic
 * test fixture designed to exercise specific decompilation paths.
 */

// Simulated Webpack module wrapper
const __webpack_modules__ = {
  // Button component module
  42: (module, exports, require) => {
    const r = require(0); // React JSX runtime
    const ButtonComponent = (props) => {
      return (0, r.jsx)("button", {
        className: "px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 transition-colors",
        onClick: props.onClick,
        disabled: props.disabled,
        children: (0, r.jsx)("span", { children: props.children }),
      });
    };
    exports.Button = ButtonComponent;
  },

  // Modal component module
  43: (module, exports, require) => {
    const r = require(0);
    const ModalComponent = (props) => {
      return (0, r.jsxs)("div", {
        className: "fixed inset-0 z-50 flex items-center justify-center",
        children: [
          (0, r.jsx)("div", {
            className: "fixed inset-0 bg-black/60 backdrop-blur-sm",
            onClick: props.onClose,
          }),
          (0, r.jsxs)("div", {
            className: "relative z-10 w-full max-w-lg rounded-xl bg-gray-900 p-6 shadow-2xl",
            children: [
              (0, r.jsx)("h2", {
                className: "text-lg font-semibold text-white",
                children: props.title,
              }),
              (0, r.jsx)("div", {
                className: "mt-4 text-gray-400",
                children: props.children,
              }),
            ],
          }),
        ],
      });
    };
    exports.Modal = ModalComponent;
  },

  // Inline SVG icon module
  44: (module, exports, require) => {
    const r = require(0);
    const SearchIcon = (props) => {
      return (0, r.jsxs)("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "#ffffff",
        strokeWidth: "2",
        ...props,
        children: [
          (0, r.jsx)("circle", { cx: "11", cy: "11", r: "8" }),
          (0, r.jsx)("path", { d: "m21 21-4.3-4.3" }),
        ],
      });
    };
    exports.SearchIcon = SearchIcon;
  },
};

