import * as Excel from 'exceljs';
import fs from 'fs';
import path from 'path';
import ProgressBar from 'progress';

import { dadataApi } from './api';

export class BizGrabber {
  private readonly input: string;

  constructor(input: string) {
    this.input = this.prepareInputFilePath(input);
  }

  static async grab(input: string) {
    const grabber = new this(input);
    await grabber.grab();
  }

  async grab() {
    const INNs = await this.getINNs();

    const dadata = [];

    const process = this.processLog(INNs.length);

    for (const inn of INNs) {
      const [data] = await dadataApi.suggest.party({ query: inn, count: 1 });
      // TODO: тут сразу сохраняем в excel
      dadata.push(data);
      process.tick();
    }
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

  /** Возвращает путь до первого файла в папке. */
  private prepareInputFilePath(input: string) {
    const [fileName] = fs.readdirSync(input);

    return path.resolve(input, fileName);
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
