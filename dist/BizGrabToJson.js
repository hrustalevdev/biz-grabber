"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BizGrabToJson = void 0;
const Excel = __importStar(require("exceljs"));
const fs = __importStar(require("node:fs"));
const node_fs_1 = require("node:fs");
const path_1 = __importDefault(require("path"));
const progress_1 = __importDefault(require("progress"));
const api_1 = require("./api");
const withRetryRequest_1 = require("./lib/withRetryRequest");
class BizGrabToJson {
    input;
    output;
    grabSize;
    viaVpn;
    constructor(input, output, grabSize = 30, viaVpn = true) {
        this.prepareOutputFolder(output);
        this.input = this.prepareInputFilePath(input);
        this.output = this.prepareOutputFilePath(input, output);
        this.grabSize = grabSize;
        this.viaVpn = viaVpn;
        this.fetchRawDataByInn = this.fetchRawDataByInn.bind(this);
    }
    static async grab(params) {
        const { input, output, grabSize, viaVpn } = params;
        const grabber = new this(input, output, grabSize, viaVpn);
        await grabber.grab();
    }
    async grab() {
        const INNs = await this.getINNs();
        const process = this.processLog(INNs.length);
        for (let i = 0; i < INNs.length; i += this.grabSize) {
            const chunkIds = INNs.slice(i, i + this.grabSize);
            const promises = chunkIds.map((inn) => (0, withRetryRequest_1.withRetryRequest)(this.fetchRawDataByInn)(inn));
            const rows = await Promise.all(promises);
            const chunkResult = {};
            rows.forEach((raw, index) => {
                if (!raw?.suggestions?.length)
                    return;
                const inn = chunkIds[index];
                chunkResult[inn] = raw;
            });
            await this.saveResult(chunkResult);
            process.tick();
        }
    }
    async getINNs() {
        const workbook = new Excel.Workbook();
        await workbook.xlsx.readFile(this.input);
        const worksheet = workbook.worksheets[0];
        worksheet.columns = [
            { key: 'opf', header: 'OPF' },
            { key: 'fio', header: 'FIO' },
            { key: 'phone', header: 'PHONE' },
            { key: 'inn', header: 'INN' },
            { key: 'city', header: 'CITY' },
        ];
        const innCol = worksheet.getColumn('inn');
        const INNs = [];
        innCol.eachCell({ includeEmpty: false }, (inn, cellNumber) => {
            if (cellNumber === 1)
                return;
            INNs.push(String(inn.value));
        });
        return INNs;
    }
    async fetchRawDataByInn(inn) {
        return api_1.dadataApi.find.rawParty({ query: inn }, this.viaVpn);
    }
    async saveResult(chunkResult) {
        const lines = Object.entries(chunkResult).map(([inn, response]) => JSON.stringify({ inn, response }));
        if (!lines.length)
            return;
        await fs.promises.appendFile(this.output, `${lines.join('\n')}\n`, 'utf-8');
    }
    prepareInputFilePath(input) {
        const file = this.getFirstXlsxFile(input);
        return path_1.default.resolve(input, file.name);
    }
    prepareOutputFilePath(input, output) {
        const inputFile = this.getFirstXlsxFile(input);
        const currentDate = new Date().toISOString().slice(0, 10).replace(/-/g, '-');
        const newFileName = `biz-grabber_${currentDate}_${inputFile.name.replace(/\.xlsx$/i, '.jsonl')}`;
        return path_1.default.resolve(output, newFileName);
    }
    getFirstXlsxFile(input) {
        const content = (0, node_fs_1.readdirSync)(input, { withFileTypes: true });
        const xlsxFile = content.find((c) => path_1.default.extname(c.name) === '.xlsx');
        if (!xlsxFile) {
            throw new Error('Не найден файл с расширением ".xlsx" в папке "input".');
        }
        return xlsxFile;
    }
    prepareOutputFolder(outputFolder) {
        try {
            if (!(0, node_fs_1.existsSync)(outputFolder)) {
                (0, node_fs_1.mkdirSync)(outputFolder, { recursive: true });
            }
        }
        catch (error) {
            console.error(error);
        }
    }
    processLog(totalRecords) {
        const total = Math.ceil(totalRecords / this.grabSize);
        console.log('Start grabbing...');
        console.log(`Total records    : ${totalRecords}`);
        console.log(`Grab size        : ${this.grabSize}`);
        console.log(`Total grabs      : ${total}`);
        return new progress_1.default(`Grabbing process : [:bar] :current/:total :percent :etas :elapseds`, {
            complete: '=',
            incomplete: '-',
            width: 30,
            total,
        });
    }
}
exports.BizGrabToJson = BizGrabToJson;
//# sourceMappingURL=BizGrabToJson.js.map