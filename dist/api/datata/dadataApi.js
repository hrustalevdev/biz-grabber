"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dadataApi = void 0;
const httpClient_1 = require("../httpClient");
const suggest = {
    async party(params, viaVpn = true) {
        const SERVICE_URL = getServiceUrl(viaVpn);
        const SUGGEST_URL = new URL('suggest/party/', SERVICE_URL);
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
    async party(params, viaVpn = true) {
        const SERVICE_URL = getServiceUrl(viaVpn);
        const FIND_URL = new URL('find/party/', SERVICE_URL);
        try {
            const { data } = await httpClient_1.httpClient.post(FIND_URL.href, params);
            return data.suggestions || [];
        }
        catch (e) {
            throw new Error(e);
        }
    },
};
exports.dadataApi = { suggest, find };
function getServiceUrl(viaVpn) {
    const APIGATEWAY = new URL('dadata/v1.0/', process.env.APIGATEWAY);
    const DADATA = new URL('v1/', process.env.DADATA);
    return viaVpn ? DADATA : APIGATEWAY;
}
//# sourceMappingURL=dadataApi.js.map