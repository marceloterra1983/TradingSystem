"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const Link_1 = __importDefault(require("@docusaurus/Link"));
const Related = ({ title = 'Related reading', items }) => {
    if (!items.length) {
        return null;
    }
    return ((0, jsx_runtime_1.jsxs)("aside", { className: "related", children: [(0, jsx_runtime_1.jsx)("h3", { children: title }), (0, jsx_runtime_1.jsx)("ul", { children: items.map(({ label, to }) => ((0, jsx_runtime_1.jsx)("li", { children: (0, jsx_runtime_1.jsx)(Link_1.default, { to: to, children: label }) }, to))) })] }));
};
exports.default = Related;
