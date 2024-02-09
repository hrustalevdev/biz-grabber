import * as Excel from 'exceljs';
import ProgressBar from 'progress';

import { dadataApi } from './api';

export class BizGrabber {
  private readonly output: string;

  constructor(output: string) {
    this.output = output;
  }

  static async grab(output: string) {
    const grabber = new this(output);
    await grabber.grab();
  }

  async grab() {
    const workbook = new Excel.Workbook();
    await workbook.xlsx.readFile(this.output);
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

    const dadata = [];

    const process = this.processLog(INNs.length);

    for (const inn of INNs) {
      const [data] = await dadataApi.suggest.party({ query: inn, count: 1 });
      dadata.push(data);
      process.tick();
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
