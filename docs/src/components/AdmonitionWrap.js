"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const Admonition_1 = __importDefault(require("@theme/Admonition"));
const AdmonitionWrap = ({ type, title, children }) => ((0, jsx_runtime_1.jsx)(Admonition_1.default, { type: type, title: title, children: children }));
exports.default = AdmonitionWrap;
