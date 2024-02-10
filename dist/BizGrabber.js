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
exports.BizGrabber = void 0;
const Excel = __importStar(require("exceljs"));
const node_fs_1 = require("node:fs");
const path_1 = __importDefault(require("path"));
const progress_1 = __importDefault(require("progress"));
const api_1 = require("./api");
class BizGrabber {
    input;
    output;
    grabSize;
    constructor(input, output, grabSize = 100) {
        this.prepareOutputFolder(output);
        this.input = this.prepareInputFilePath(input);
        this.output = this.prepareOutputFilePath(input, output);
        this.grabSize = grabSize;
    }
    static async grab(input, output, grabSize) {
        const grabber = new this(input, output, grabSize);
        await grabber.grab();
    }
    async grab() {
        const INNs = await this.getINNs();
        const process = this.processLog(INNs.length);
        const { table, onDataInserted } = this.useResultTable();
        for (let i = 0; i < INNs.length; i += this.grabSize) {
            const chunkIds = INNs.slice(i, i + this.grabSize);
            const promises = chunkIds.map((inn) => this.fetchOrganizationDataByInn(inn));
            const rows = await Promise.all(promises);
            rows.forEach((r) => {
                table.addRow([r.name, r.inn, r.status]);
            });
            process.tick();
        }
        await onDataInserted();
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
    async fetchOrganizationDataByInn(inn) {
        const data = await api_1.dadataApi.suggest.party({ query: inn });
        if (!data.length) {
            return { name: 'no data', inn, status: 'no data' };
        }
        if (data.length === 1) {
            const d = data[0];
            return {
                name: d.data.name.short_with_opf,
                inn,
                status: d.data.state.status,
            };
        }
        const d = data.find((d) => d.data.state.status === 'ACTIVE');
        if (d) {
            return {
                name: d.data.name.short_with_opf,
                inn,
                status: d.data.state.status,
            };
        }
        else {
            const d = data[0];
            return {
                name: d.data.name.short_with_opf,
                inn,
                status: d.data.state.status,
            };
        }
    }
    useResultTable() {
        const tableName = 'BizGrabber';
        const workbook = new Excel.Workbook();
        const worksheet = workbook.addWorksheet('biz-grabber');
        worksheet.addTable({
            name: tableName,
            ref: 'A1',
            headerRow: true,
            columns: [{ name: 'CompanyName' }, { name: 'INN' }, { name: 'Status' }],
            rows: [],
        });
        worksheet.getRow(1).alignment = {
            vertical: 'middle',
            horizontal: 'center',
        };
        worksheet.columns = [
            { width: 40 },
            { width: 20, style: { alignment: { horizontal: 'right' } } },
            { width: 20, style: { alignment: { horizontal: 'right' } } },
        ];
        const table = worksheet.getTable(tableName);
        const onDataInserted = async () => {
            table.commit();
            await workbook.xlsx.writeFile(this.output);
        };
        return {
            table,
            onDataInserted,
        };
    }
    prepareInputFilePath(input) {
        const [fileName] = (0, node_fs_1.readdirSync)(input);
        return path_1.default.resolve(input, fileName);
    }
    prepareOutputFilePath(input, output) {
        const [fileName] = (0, node_fs_1.readdirSync)(input);
        const fileExt = path_1.default.extname(fileName);
        const rawFileName = path_1.default.basename(fileName, fileExt);
        const currentDate = new Date()
            .toISOString()
            .slice(0, 10)
            .replace(/-/g, '-');
        const newFileName = `biz-grabber_${currentDate}_${rawFileName}${fileExt}`;
        return path_1.default.resolve(output, newFileName);
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
exports.BizGrabber = BizGrabber;
