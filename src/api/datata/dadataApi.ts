import { httpClient } from '../httpClient';

import type {
  IBaseOrganizationItem,
  IBaseOrganizationSuggestions,
  IOrganizationSuggestionsParams,
  IFindOrganizationParams,
  IFullOrganizationItem,
  IFullOrganizationSuggestions,
} from './types';

const SERVICE_URL = new URL('v1/', process.env.DADATA);
const SUGGEST_URL = new URL('suggest/party/', SERVICE_URL);
const FIND_URL = new URL('find/party/', SERVICE_URL);

const suggest = {
  /** @description Получить организации по части названия или ИНН. */
  async party(params: IOrganizationSuggestionsParams): Promise<IBaseOrganizationItem[]> {
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
  async party(params: IFindOrganizationParams): Promise<IFullOrganizationItem[]> {
    try {
      const { data } = await httpClient.post<IFullOrganizationSuggestions>(FIND_URL.href, params);

      return data.suggestions || [];
    } catch (e) {
      throw new Error(e as unknown as string);
    }
  },
};

export const dadataApi = { suggest, find };
