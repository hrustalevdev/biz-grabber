export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DADATA: string;
    }
  }
}
