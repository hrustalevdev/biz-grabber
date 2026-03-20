import * as Excel from 'exceljs';
import * as fs from 'node:fs';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'path';
import ProgressBar from 'progress';

import { dadataApi } from './api';
import type { IFullOrganizationSuggestions } from './api/datata/types';
import { withRetryRequest } from './lib/withRetryRequest';

interface IGrabParams {
  /** Путь к папке с исходными данными */
  input: string;
  /** Путь к папке с результатом */
  output: string;
  /** Количество одновременных запросов */
  grabSize?: number;
  /** Используется под VPN или нет */
  viaVpn?: boolean;
}

export class BizGrabToJson {
  private readonly input: string;
  private readonly output: string;
  private readonly grabSize: number;
  private readonly viaVpn: boolean;

  /**
   * @param input - путь к папке с исходными данными
   * @param output - путь к папке с результатом
   * @param grabSize - количество одновременных запросов
   * @param viaVpn - используется под VPN или нет
   */
  constructor(input: string, output: string, grabSize = 30, viaVpn = true) {
    this.prepareOutputFolder(output);
    this.input = this.prepareInputFilePath(input);
    this.output = this.prepareOutputFilePath(input, output);
    this.grabSize = grabSize;
    this.viaVpn = viaVpn;

    this.fetchRawDataByInn = this.fetchRawDataByInn.bind(this);
  }

  static async grab(params: IGrabParams) {
    const { input, output, grabSize, viaVpn } = params;
    const grabber = new this(input, output, grabSize, viaVpn);
    await grabber.grab();
  }

  async grab() {
    const INNs = await this.getINNs();
    const process = this.processLog(INNs.length);

    for (let i = 0; i < INNs.length; i += this.grabSize) {
      const chunkIds = INNs.slice(i, i + this.grabSize);

      const promises = chunkIds.map((inn) => withRetryRequest(this.fetchRawDataByInn)(inn));
      const rows = await Promise.all(promises);

      const chunkResult: Record<string, IFullOrganizationSuggestions> = {};

      rows.forEach((raw, index) => {
        if (!raw?.suggestions?.length) return;

        const inn = chunkIds[index];
        chunkResult[inn] = raw;
      });

      await this.saveResult(chunkResult);
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

  private async fetchRawDataByInn(inn: string): Promise<IFullOrganizationSuggestions> {
    return dadataApi.find.rawParty({ query: inn }, this.viaVpn);
  }

  private async saveResult(chunkResult: Record<string, IFullOrganizationSuggestions>) {
    const lines = Object.entries(chunkResult).map(([inn, response]) =>
      JSON.stringify({ inn, response }),
    );

    if (!lines.length) return;

    await fs.promises.appendFile(this.output, `${lines.join('\n')}\n`, 'utf-8');
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

    const newFileName = `biz-grabber_${currentDate}_${inputFile.name.replace(/\.xlsx$/i, '.jsonl')}`;

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
