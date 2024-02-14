import * as Excel from 'exceljs';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'path';
import ProgressBar from 'progress';

import { dadataApi } from './api';
import { withRetryRequest } from './lib/withRetryRequest';

export class BizGrabber {
  private readonly input: string;
  private readonly output: string;
  private readonly grabSize: number;

  /**
   * @param input - путь к папке с исходными данными
   * @param output - путь к папке с результатом
   * @param grabSize - количество одновременных запросов
   */
  constructor(input: string, output: string, grabSize = 100) {
    this.prepareOutputFolder(output);
    this.input = this.prepareInputFilePath(input);
    this.output = this.prepareOutputFilePath(input, output);
    this.grabSize = grabSize;
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

      const promises = chunkIds.map((inn) =>
        withRetryRequest(this.fetchOrganizationDataByInn)(inn),
      );

      const rows = await Promise.all(promises);

      rows.forEach((r) => {
        table.addRow([r.name, r.inn, r.status]);
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

  private async fetchOrganizationDataByInn(
    inn: string,
  ): Promise<{ name: string; inn: string; status: string }> {
    const data = await dadataApi.suggest.party({ query: inn });

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

    /** Для ИП может выдать несколько данных, т.к. при повторном закрытии/открытии ИНН остаётся прежний. */
    const d = data.find((d) => d.data.state.status === 'ACTIVE');
    if (d) {
      return {
        name: d.data.name.short_with_opf,
        inn,
        status: d.data.state.status,
      };
    } else {
      const d = data[0];
      return {
        name: d.data.name.short_with_opf,
        inn,
        status: d.data.state.status,
      };
    }
  }

  private useResultTable() {
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

  /** Возвращает путь до первого файла в папке. */
  private prepareInputFilePath(input: string) {
    const file = this.getFirstXlsxFile(input);
    return path.resolve(input, file.name);
  }

  /** Возвращает путь на основе исходного файла. */
  private prepareOutputFilePath(input: string, output: string) {
    const inputFile = this.getFirstXlsxFile(input);

    const currentDate = new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, '-');

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

    return new ProgressBar(
      `Grabbing process : [:bar] :current/:total :percent :etas :elapseds`,
      {
        complete: '=',
        incomplete: '-',
        width: 30,
        total,
      },
    );
  }
}
