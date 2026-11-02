import { environment as current } from "./environment.defaults";
export const environment = {
  ...current,
  production: true,
  services: {
    ...current.services,
    coach: "https://gymseminario.onrender.com/api",
  },
} as const;
