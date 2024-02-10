import * as Excel from 'exceljs';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'path';
import ProgressBar from 'progress';

import { dadataApi } from './api';

export class BizGrabber {
  private readonly input: string;
  private readonly output: string;

  /**
   * @param input - путь к папке с исходными данными
   * @param output - путь к папке с результатом
   */
  constructor(input: string, output: string) {
    this.input = this.prepareInputFilePath(input);
    this.output = this.prepareOutputFilePath(input, output);
    this.prepareOutputFolder(output);
  }

  /**
   * @param input - путь к папке с исходными данными
   * @param output - путь к папке с результатом
   */
  static async grab(input: string, output: string) {
    const grabber = new this(input, output);
    await grabber.grab();
  }

  async grab() {
    const INNs = await this.getINNs();
    const process = this.processLog(INNs.length);
    const { table, onDataInserted } = this.useResultTable();

    for (const inn of INNs) {
      const [data] = await dadataApi.suggest.party({ query: inn, count: 1 });
      const { data: organizationData } = data;

      table.addRow([
        organizationData.name.short_with_opf,
        organizationData.inn,
        organizationData.state.status,
      ]);

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
    const [fileName] = readdirSync(input);

    return path.resolve(input, fileName);
  }

  /** Возвращает путь на основе исходного файла. */
  private prepareOutputFilePath(input: string, output: string) {
    const [fileName] = readdirSync(input);
    const fileExt = path.extname(fileName);

    /** Имя файля без расширения. */
    const rawFileName = path.basename(fileName, fileExt);
    const currentDate = new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, '-');

    const newFileName = `biz-grabber_${currentDate}_${rawFileName}${fileExt}`;

    return path.resolve(output, newFileName);
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

  private processLog(total: number) {
    console.log('Start grabbing...');
    console.log(`Total grabs: ${total}`);

    return new ProgressBar(
      `Grabbing process : [:bar] :current/:total :percent :etas :elapseds`,
      {
        complete: '=',
        incomplete: ' ',
        width: 30,
        total,
      },
    );
  }
}
