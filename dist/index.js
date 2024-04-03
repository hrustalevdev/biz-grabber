"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const path_1 = __importDefault(require("path"));
const BizGrabber_1 = require("./BizGrabber");
const env_1 = require("./lib/env");
const input = env_1.isTesting ?
    path_1.default.resolve(__dirname, '..', 'input', 'test')
    : path_1.default.resolve(__dirname, '..', 'input');
const output = env_1.isTesting ?
    path_1.default.resolve(__dirname, '..', 'output', 'test')
    : path_1.default.resolve(__dirname, '..', 'output');
BizGrabber_1.BizGrabber.grab({ input, output, grabSize: env_1.grabSize, viaVpn: env_1.viaVpn });
//# sourceMappingURL=index.js.map