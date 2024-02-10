"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withRetryRequest = void 0;
const delay_1 = require("./delay");
function withRetryRequest(callback, maxRetries = 3, retryDelay = 1000) {
    return async (params) => {
        let error;
        for (let retries = 0; retries < maxRetries; retries++) {
            try {
                return await callback(params);
            }
            catch (e) {
                error = e;
                if (retries < maxRetries - 1) {
                    await (0, delay_1.delay)(retryDelay);
                }
            }
        }
        throw new Error(error);
    };
}
exports.withRetryRequest = withRetryRequest;
