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
const withRetryRequest_1 = require("./lib/withRetryRequest");
const NO_DATA = 'no data';
class BizGrabber {
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
        this.fetchRowDataByInn = this.fetchRowDataByInn.bind(this);
    }
    static async grab(params) {
        const { input, output, grabSize, viaVpn } = params;
        const grabber = new this(input, output, grabSize, viaVpn);
        await grabber.grab();
    }
    async grab() {
        const INNs = await this.getINNs();
        const process = this.processLog(INNs.length);
        const { table, onDataInserted } = this.useResultTable();
        for (let i = 0; i < INNs.length; i += this.grabSize) {
            const chunkIds = INNs.slice(i, i + this.grabSize);
            const promises = chunkIds.map((inn) => (0, withRetryRequest_1.withRetryRequest)(this.fetchRowDataByInn)(inn));
            const rows = await Promise.all(promises);
            rows.forEach((r) => {
                table.addRow([
                    r.name,
                    r.inn,
                    r.status,
                    r.emails,
                    r.phones,
                    r.address,
                    r.okved,
                    r.financeYear,
                    r.financeIncome,
                    r.financeRevenue,
                    r.financeExpense,
                    r.financeDebt,
                    r.financePenalty,
                    r.smbCategory,
                    r.smbIssueDate,
                ]);
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
    async fetchRowDataByInn(inn) {
        const data = await api_1.dadataApi.find.party({ query: inn }, this.viaVpn);
        if (!data.length) {
            return {
                name: NO_DATA,
                inn,
                status: NO_DATA,
                emails: NO_DATA,
                phones: NO_DATA,
                address: NO_DATA,
                okved: NO_DATA,
                financeYear: NO_DATA,
                financeIncome: NO_DATA,
                financeRevenue: NO_DATA,
                financeExpense: NO_DATA,
                financeDebt: NO_DATA,
                financePenalty: NO_DATA,
                smbCategory: NO_DATA,
                smbIssueDate: NO_DATA,
            };
        }
        if (data.length === 1) {
            const d = data[0];
            return this.adaptOrganizationData(d);
        }
        const d = data.find((d) => d.data.state.status === 'ACTIVE');
        if (d) {
            return this.adaptOrganizationData(d);
        }
        else {
            const d = data[0];
            return this.adaptOrganizationData(d);
        }
    }
    adaptOrganizationData(data) {
        const { data: d } = data;
        return {
            name: d.name.short_with_opf || d.name.full_with_opf,
            inn: d.inn,
            status: d.state.status,
            emails: d.emails?.length ?
                d.emails.map((e) => e.data?.source || e.value || NO_DATA).join(', ')
                : NO_DATA,
            phones: d.phones?.length ?
                d.phones.map((p) => p.data?.source || p.value || NO_DATA).join(', ')
                : NO_DATA,
            address: d.address?.data?.source || d.address?.value || NO_DATA,
            okved: d.okved || NO_DATA,
            financeYear: d.finance?.year ? String(d.finance.year) : NO_DATA,
            financeIncome: d.finance?.income ? String(d.finance.income) : NO_DATA,
            financeRevenue: d.finance?.revenue ? String(d.finance.revenue) : NO_DATA,
            financeExpense: d.finance?.expense ? String(d.finance.expense) : NO_DATA,
            financeDebt: d.finance?.debt ? String(d.finance.debt) : NO_DATA,
            financePenalty: d.finance?.penalty ? String(d.finance.penalty) : NO_DATA,
            smbCategory: d.documents?.smb?.category || NO_DATA,
            smbIssueDate: d.documents?.smb?.issue_date ?
                new Date(d.documents.smb.issue_date).toLocaleDateString()
                : NO_DATA,
        };
    }
    useResultTable() {
        const tableName = 'BizGrabber';
        const workbook = new Excel.Workbook();
        const worksheet = workbook.addWorksheet('biz-grabber');
        worksheet.addTable({
            name: tableName,
            ref: 'A1',
            headerRow: true,
            columns: [
                { name: 'CompanyName' },
                { name: 'INN' },
                { name: 'Status' },
                { name: 'E-mail' },
                { name: 'Phone' },
                { name: 'Address' },
                { name: 'Main OKVED' },
                { name: 'Finance year' },
                { name: 'Finance income' },
                { name: 'Finance revenue' },
                { name: 'Finance expense' },
                { name: 'Finance debt' },
                { name: 'Finance penalty' },
                { name: 'SMB category' },
                { name: 'SMB issue date' },
            ],
            rows: [],
        });
        worksheet.getRow(1).alignment = {
            vertical: 'middle',
            horizontal: 'center',
        };
        worksheet.columns = [
            { width: 40 },
            { width: 15, style: { alignment: { horizontal: 'right' } } },
            { width: 15, style: { alignment: { horizontal: 'center' } } },
            { width: 30, style: { alignment: { horizontal: 'left' } } },
            { width: 20, style: { alignment: { horizontal: 'left' } } },
            { width: 70, style: { alignment: { horizontal: 'left' } } },
            { width: 12, style: { alignment: { horizontal: 'right' } } },
            { width: 20, style: { alignment: { horizontal: 'right' } } },
            { width: 20, style: { alignment: { horizontal: 'right' } } },
            { width: 20, style: { alignment: { horizontal: 'right' } } },
            { width: 20, style: { alignment: { horizontal: 'right' } } },
            { width: 20, style: { alignment: { horizontal: 'right' } } },
            { width: 20, style: { alignment: { horizontal: 'right' } } },
            { width: 12, style: { alignment: { horizontal: 'right' } } },
            { width: 12, style: { alignment: { horizontal: 'right' } } },
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
        const file = this.getFirstXlsxFile(input);
        return path_1.default.resolve(input, file.name);
    }
    prepareOutputFilePath(input, output) {
        const inputFile = this.getFirstXlsxFile(input);
        const currentDate = new Date().toISOString().slice(0, 10).replace(/-/g, '-');
        const newFileName = `biz-grabber_${currentDate}_${inputFile.name}`;
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
exports.BizGrabber = BizGrabber;
//# sourceMappingURL=BizGrabber.js.map