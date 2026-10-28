import { Routes } from "@angular/router";

export default [
  {
    path: "sign-in",
    loadComponent: () => import("./pages/sign-in/sign-in.component"),
  },
  {
    path: "sign-up",
    loadComponent: () => import("./pages/sign-up/sign-up.component"),
  },
] as Routes;
