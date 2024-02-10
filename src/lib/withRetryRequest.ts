import { delay } from './delay';

type TCallback<T, R> = (params: T) => Promise<R>;

export function withRetryRequest<T, R>(
  callback: TCallback<T, R>,
  maxRetries = 3,
  retryDelay = 1000,
): TCallback<T, R> {
  return async (params) => {
    let error;

    for (let retries = 0; retries < maxRetries; retries++) {
      try {
        return await callback(params);
      } catch (e) {
        error = e;

        if (retries < maxRetries - 1) {
          await delay(retryDelay);
        }
      }
    }

    throw new Error(error as unknown as string);
  };
}
