import { environment as current } from "./environment.defaults";
export const environment = { ...current, production: true } as const;
