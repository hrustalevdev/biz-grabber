"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dadataApi = void 0;
const httpClient_1 = require("../httpClient");
const SERVICE_URL = new URL('https://api.sravni.ru/dadata/v1.0/');
const SUGGEST_URL = new URL('suggest/party/', SERVICE_URL);
const FIND_URL = new URL('find/party/', SERVICE_URL);
const suggest = {
    async party(params) {
        try {
            const { data } = await httpClient_1.httpClient.post(SUGGEST_URL.href, params);
            return data.suggestions || [];
        }
        catch (e) {
            throw new Error(e);
        }
    },
};
const find = {
    async party(params) {
        try {
            const { data } = await httpClient_1.httpClient.post(FIND_URL.href, params);
            return data.suggestions?.[0] || null;
        }
        catch (error) {
            console.error(error);
            return null;
        }
    },
};
exports.dadataApi = { suggest, find };
//# sourceMappingURL=dadataApi.js.map