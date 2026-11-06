/**
 * Synthetic Minified React 18 Bundle Fixture (React.createElement patterns)
 *
 * Simulates older React webpack chunks that compile JSX into
 * React.createElement(...) rather than automatic runtime _jsx().
 */

var React = require("react");

function DropdownMenu(props) {
  var isOpen = props.isOpen;
  var items = props.items || [];

  return React.createElement(
    "div",
    { className: "relative inline-block text-left" },
    React.createElement(
      "button",
      {
        type: "button",
        className: "inline-flex justify-center w-full rounded-md px-4 py-2 bg-gray-800 text-sm font-medium text-white hover:bg-gray-700",
        onClick: props.onToggle
      },
      props.label || "Options"
    ),
    isOpen
      ? React.createElement(
          "div",
          {
            className: "origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-gray-900 ring-1 ring-black ring-opacity-5 divide-y divide-gray-800 focus:outline-none"
          },
          items.map(function(item, idx) {
            return React.createElement(
              "a",
              {
                key: idx,
                href: item.href || "#",
                className: "text-gray-300 block px-4 py-2 text-sm hover:bg-gray-800 hover:text-white"
              },
              item.label
            );
          })
        )
      : null
  );
}

module.exports = {
  DropdownMenu: DropdownMenu
};

