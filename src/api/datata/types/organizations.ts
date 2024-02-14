import type { IAddressItem } from './addresses';

type UType = 'LEGAL' | 'INDIVIDUAL';
type UStatus = 'ACTIVE' | 'LIQUIDATING' | 'LIQUIDATED' | 'BANKRUPT' | 'REORGANIZING';
type UBranchType = 'MAIN' | 'BRANCH';
type UTaxSystem = 'AUSN' | 'ESHN' | 'SRP' | 'USN';
type USmallMediumBusiness = 'MICRO' | 'SMALL' | 'MEDIUM';

export interface IOrganizationSuggestionsParams {
  /** Название организации, ИНН */
  query: string;
  /** Количество результатов. По умолчанию — 10, максимум — 20 */
  count?: number;
  /** Фильтр по типу организации: юр. лица, ИП */
  type?: UType;
  /** Фильтр по статусу организации: действующая, ликвидируемая, ликвидированная */
  status?: UStatus[];
}

export interface IFindOrganizationParams {
  /** ИНН или ОГРН */
  query: string;
  /** Количество результатов (максимум — 300) */
  count?: number;
  /** КПП для поиска по филиалам */
  kpp?: string;
  /** Фильтр по типу организации: юр. лица, ИП */
  type?: UType;
  /** Фильтр по статусу организации: действующая, ликвидируемая, ликвидированная */
  status?: UStatus[];
}

interface IBaseOrganizationData {
  inn: string;
  kpp: string;
  ogrn: string;
  ogrn_date: number;
  /** Внутренний уникальный идентификатор в Дадате */
  hid: string;
  type: UType;
  name: {
    full_with_opf: string;
    short_with_opf: string;
    latin: unknown;
    full: string;
    short: string;
  };
  /** ФИО индивидуального предпринимателя */
  fio?: {
    surname: string;
    name: string;
    patronymic: string;
  };
  okato: string;
  oktmo: string;
  okpo: string;
  okogu: string;
  okfs: string;
  okved: string;
  /** Версия справочника ОКВЭД (2001 или 2014) */
  okved_type: string;
  opf: {
    /** Код по классификатору ОКОПФ */
    code: string;
    full: string;
    short: string;
    type: string;
  };
  management: {
    name: string;
    post: string;
  };
  branch_count: number;
  branch_type: UBranchType;
  address?: IAddressItem;
  state: {
    actuality_date: number;
    registration_date: number;
    liquidation_date: unknown;
    status: UStatus;
  };
}

interface IAuthority {
  /** Код гос. органа */
  type: string;
  /** Код отделения */
  code: string;
  /** Наименование отделения */
  name: string;
  address: string;
}

interface IRegistrationDocument {
  type: string;
  series: string;
  number: string;
  /** Дата выдачи */
  issue_date: number;
  /** Код подразделения */
  issue_authority: string;
}

interface IFullOrganizationData extends IBaseOrganizationData {
  employee_count: number;
  /** Гражданство ИП */
  citizenship: {
    code: {
      /** Числовой код страны по ОКСМ */
      numeric: number;
      /** Трехбуквенный код страны по ОКСМ */
      alpha_3: string;
    };
    name: {
      /** Наименование страны */
      full: string;
      /** Краткое наименование страны */
      short: string;
    };
  };
  finance: {
    tax_system: UTaxSystem;
    /** Год бух. отчётности */
    year: number;
    /** Доходы по бух. отчётности */
    income: number;
    /** Расходы по бух. отчётности */
    expense: number;
    /** Недоимки по налогам */
    debt: number;
    /** Налоговые штрафы */
    penalty: number;
  };
  /** Коды ОКВЭД дополнительных видов деятельности */
  okveds: Array<{
    /** Основной или нет */
    main: boolean;
    /** Версия справочника ОКВЭД (2001 или 2014) */
    type: string;
    /** Код по справочнику */
    code: string;
    /** Наименование по справочнику */
    name: string;
  }>;
  authorities: {
    /** Сведения о налоговом органе */
    fts_registration: IAuthority;
    /** Отделение Пенсионного фонда */
    pf: IAuthority;
    /** Отделение Фонда соц. страхования */
    sif: IAuthority;
  };
  /** Учредители компании */
  founders: Array<{
    /** ОГРН учредителя (для юр.лиц) */
    ogrn: string;
    /** ИНН учредителя */
    inn: string;
    /** Наименование учредителя (для юр.лиц) */
    name: string;
    /** ФИО учредителя (для физ.лиц) */
    fio: string | { surname: string; name: string; patronymic: string };
    /** Внутренний идентификатор */
    hid: string;
    /** Тип учредителя (LEGAL / PHYSICAL) */
    type: 'LEGAL' | 'PHYSICAL';
    share: {
      /** Тип значения (PERCENT / DECIMAL / FRACTION) */
      type: 'PERCENT' | 'DECIMAL' | 'FRACTION';
      /** Значение (для type = PERCENT и type = DECIMAL) */
      value: number;
      /** Числитель дроби (для type = FRACTION) */
      numerator: number;
      /** Знаменатель дроби (для type = FRACTION) */
      denominator: number;
    };
  }>;
  managers: Array<Record<string, unknown>>;
  capital: { type: string; value: number };
  documents: {
    /** Свидетельство о регистрации в налоговой */
    fts_registration: IRegistrationDocument;
    /** Сведения об учете в налоговом органе */
    fts_report: IRegistrationDocument;
    /** Свидетельство о регистрации в Пенсионном фонде */
    pf_registration: IRegistrationDocument;
    smb: {
      type: 'SMB';
      category: USmallMediumBusiness;
      issue_date: number;
    };
  };
  licenses: Array<Record<string, unknown>>;
  phones: Array<{
    data?: {
      /** Телефон одной строкой как в ЕГРЮЛ */
      source?: string;
      /** тип телефона (мобильный, стационарный, ...) */
      type?: 'Мобильный';
      /** Код страны */
      country_code?: '7';
      /** Код города / DEF-код */
      city_code?: '911';
      /** Локальный номер телефона */
      number?: '2410309';
      /** Оператор связи */
      provider?: 'ПАО "Мобильные ТелеСистемы"';
      /** Регион */
      region?: 'Санкт-Петербург и Ленинградская область';
      /** Город (только для стационарных телефонов) */
      city?: null;
      /** Часовой пояс */
      timezone?: 'UTC+3';
      /** Контактное лицо */
      contact?: null;
    };
    unrestricted_value?: string;
    value?: string;
  }>;
  emails: Array<{
    data?: {
      /** Email одной строкой как в ЕГРЮЛ */
      source: string;
      /** Локальная часть адреса (то, что до «собачки») */
      local: string;
      /** Домен (то, что после «собачки») */
      domain: string;
    };
    /** Email одной строкой */
    unrestricted_value?: string;
    /** Email одной строкой */
    value?: string;
  }>;

  /**
   * Полный перечень данных можно найти по ссылке:
   * @link https://dadata.ru/api/find-party/#response
   */
}

export interface IBaseOrganizationItem {
  value: string;
  unrestricted_value: string;
  data: IBaseOrganizationData;
}

export interface IFullOrganizationItem {
  value: string;
  unrestricted_value: string;
  data: IFullOrganizationData;
}

export interface IBaseOrganizationSuggestions {
  suggestions: IBaseOrganizationItem[];
}

export interface IFullOrganizationSuggestions {
  suggestions: IFullOrganizationItem[];
}
