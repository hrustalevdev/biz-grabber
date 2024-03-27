import * as Excel from 'exceljs';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'path';
import ProgressBar from 'progress';

import { dadataApi } from './api';
import type { IFullOrganizationItem } from './api/datata/types';
import { withRetryRequest } from './lib/withRetryRequest';

interface IRowData {
  name: string;
  inn: string;
  status: string;
  emails: string;
  phones: string;
  address: string;
  okved: string;
  financeYear: string;
  financeIncome: string;
  financeRevenue: string;
  financeExpense: string;
  financeDebt: string;
  financePenalty: string;
  smbCategory: string;
  smbIssueDate: string;
}

const NO_DATA = 'no data';

export class BizGrabber {
  private readonly input: string;
  private readonly output: string;
  private readonly grabSize: number;

  /**
   * @param input - путь к папке с исходными данными
   * @param output - путь к папке с результатом
   * @param grabSize - количество одновременных запросов
   */
  constructor(input: string, output: string, grabSize = 30) {
    this.prepareOutputFolder(output);
    this.input = this.prepareInputFilePath(input);
    this.output = this.prepareOutputFilePath(input, output);
    this.grabSize = grabSize;

    this.fetchRowDataByInn = this.fetchRowDataByInn.bind(this);
  }

  /**
   * @param input - путь к папке с исходными данными
   * @param output - путь к папке с результатом
   * @param grabSize - количество одновременных запросов
   */
  static async grab(input: string, output: string, grabSize?: number) {
    const grabber = new this(input, output, grabSize);
    await grabber.grab();
  }

  async grab() {
    const INNs = await this.getINNs();
    const process = this.processLog(INNs.length);
    const { table, onDataInserted } = this.useResultTable();

    for (let i = 0; i < INNs.length; i += this.grabSize) {
      const chunkIds = INNs.slice(i, i + this.grabSize);

      const promises = chunkIds.map((inn) => withRetryRequest(this.fetchRowDataByInn)(inn));

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

  private async getINNs() {
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
    const INNs: string[] = [];

    innCol.eachCell({ includeEmpty: false }, (inn, cellNumber) => {
      /** Заголовок пропускаем */
      if (cellNumber === 1) return;

      INNs.push(String(inn.value));
    });

    return INNs;
  }

  private async fetchRowDataByInn(inn: string): Promise<IRowData> {
    const data = await dadataApi.find.party({ query: inn });

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

    /** Для ИП может выдать несколько данных, т.к. при повторном закрытии/открытии ИНН остаётся прежний. */
    const d = data.find((d) => d.data.state.status === 'ACTIVE');
    if (d) {
      return this.adaptOrganizationData(d);
    } else {
      const d = data[0];
      return this.adaptOrganizationData(d);
    }
  }

  private adaptOrganizationData(data: IFullOrganizationItem): IRowData {
    const { data: d } = data;

    return {
      name: d.name.short_with_opf || d.name.full_with_opf,
      inn: d.inn,
      status: d.state.status,
      emails:
        d.emails?.length ?
          d.emails.map((e) => e.data?.source || e.value || NO_DATA).join(', ')
        : NO_DATA,
      phones:
        d.phones?.length ?
          d.phones.map((p) => p.data?.source || p.value || NO_DATA).join(', ')
        : NO_DATA,
      address: (d.address?.data?.source as string) || d.address?.value || NO_DATA,
      okved: d.okved || NO_DATA,
      financeYear: d.finance?.year ? String(d.finance.year) : NO_DATA,
      financeIncome: d.finance?.income ? String(d.finance.income) : NO_DATA,
      financeRevenue: d.finance?.revenue ? String(d.finance.revenue) : NO_DATA,
      financeExpense: d.finance?.expense ? String(d.finance.expense) : NO_DATA,
      financeDebt: d.finance?.debt ? String(d.finance.debt) : NO_DATA,
      financePenalty: d.finance?.penalty ? String(d.finance.penalty) : NO_DATA,
      smbCategory: d.documents?.smb?.category || NO_DATA,
      smbIssueDate:
        d.documents?.smb?.issue_date ?
          new Date(d.documents.smb.issue_date).toLocaleDateString()
        : NO_DATA,
    };
  }

  private useResultTable() {
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
      { width: 10, style: { alignment: { horizontal: 'right' } } },
      { width: 10, style: { alignment: { horizontal: 'right' } } },
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

  /** Возвращает путь до первого файла в папке. */
  private prepareInputFilePath(input: string) {
    const file = this.getFirstXlsxFile(input);
    return path.resolve(input, file.name);
  }

  /** Возвращает путь на основе исходного файла. */
  private prepareOutputFilePath(input: string, output: string) {
    const inputFile = this.getFirstXlsxFile(input);

    const currentDate = new Date().toISOString().slice(0, 10).replace(/-/g, '-');

    const newFileName = `biz-grabber_${currentDate}_${inputFile.name}`;

    return path.resolve(output, newFileName);
  }

  /** Возвращает первый `.xlsx` файл из папки, либо выбрасывает исключение. */
  private getFirstXlsxFile(input: string) {
    const content = readdirSync(input, { withFileTypes: true });
    const xlsxFile = content.find((c) => path.extname(c.name) === '.xlsx');

    if (!xlsxFile) {
      throw new Error('Не найден файл с расширением ".xlsx" в папке "input".');
    }

    return xlsxFile;
  }

  private prepareOutputFolder(outputFolder: string) {
    try {
      if (!existsSync(outputFolder)) {
        mkdirSync(outputFolder, { recursive: true });
      }
    } catch (error) {
      console.error(error);
    }
  }

  private processLog(totalRecords: number) {
    const total = Math.ceil(totalRecords / this.grabSize);

    console.log('Start grabbing...');
    console.log(`Total records    : ${totalRecords}`);
    console.log(`Grab size        : ${this.grabSize}`);
    console.log(`Total grabs      : ${total}`);

    return new ProgressBar(`Grabbing process : [:bar] :current/:total :percent :etas :elapseds`, {
      complete: '=',
      incomplete: '-',
      width: 30,
      total,
    });
  }
}
