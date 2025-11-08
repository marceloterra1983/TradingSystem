"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const Tabs_1 = __importDefault(require("@theme/Tabs"));
const TabItem_1 = __importDefault(require("@theme/TabItem"));
const CodeTabs = ({ groupId, items }) => {
    if (!items.length) {
        return null;
    }
    return ((0, jsx_runtime_1.jsx)(Tabs_1.default, { groupId: groupId, children: items.map(({ label, language, code }) => ((0, jsx_runtime_1.jsx)(TabItem_1.default, { value: label, label: label, children: (0, jsx_runtime_1.jsx)("pre", { children: (0, jsx_runtime_1.jsx)("code", { className: `language-${language}`, children: code }) }) }, label))) }));
};
exports.default = CodeTabs;
