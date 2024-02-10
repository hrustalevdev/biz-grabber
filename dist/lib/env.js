"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.grabSize = exports.isTesting = void 0;
exports.isTesting = process.env.NODE_ENV === 'testing';
const gs = process.env.GRAB_SIZE;
exports.grabSize = !Number.isNaN(Number(gs)) && Number(gs) > 0 && Number(gs) <= 1000 ?
    Number(gs)
    : undefined;
