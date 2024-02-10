import { httpClient } from '../httpClient';

import type {
  IBaseOrganizationItem,
  IBaseOrganizationSuggestions,
  IOrganizationSuggestionsParams,
  IFindOrganizationParams,
  IFullOrganizationItem,
  IFullOrganizationSuggestions,
} from './types';

const SERVICE_URL = new URL('https://api.sravni.ru/dadata/v1.0/');
const SUGGEST_URL = new URL('suggest/party/', SERVICE_URL);
const FIND_URL = new URL('find/party/', SERVICE_URL);

const suggest = {
  /** @description Получить организации по части названия или ИНН. */
  async party(
    params: IOrganizationSuggestionsParams,
  ): Promise<IBaseOrganizationItem[]> {
    try {
      const { data } = await httpClient.post<IBaseOrganizationSuggestions>(
        SUGGEST_URL.href,
        params,
      );

      return data.suggestions || [];
    } catch (e) {
      throw new Error(e as unknown as string);
    }
  },
};

const find = {
  /**
   * @description Находит компанию или ИП по ИНН или ОГРН. Возвращает все доступные сведения о компании, в отличие от
   * метода `suggest`, который возвращает только базовые поля.
   */
  async party(
    params: IFindOrganizationParams,
  ): Promise<IFullOrganizationItem | null> {
    try {
      const { data } = await httpClient.post<IFullOrganizationSuggestions>(
        FIND_URL.href,
        params,
      );

      /** Возвращаем `null`, при неудачном запросе */
      return data.suggestions?.[0] || null;
    } catch (error) {
      console.error(error);
      /** Возвращаем `null`, при неудачном запросе */
      return null;
    }
  },
};

export const dadataApi = { suggest, find };
