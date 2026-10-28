import { Routes } from "@angular/router";

export const routes: Routes = [
  { path: "", redirectTo: "/home", pathMatch: "full" },
  {
    path: "home",
    loadComponent: () =>
      import("./features/home/pages/home/home.component").then(
        (m) => m.HomeComponent,
      ),
  },
  {
    path: "membresias",
    loadComponent: () =>
      import(
        "./features/memberships/pages/membresias/membresias.component"
      ).then((m) => m.MembresiasComponent),
  },
  {
    path: "estado-cuenta",
    loadComponent: () =>
      import(
        "./features/billing/pages/estado-cuenta/estado-cuenta.component"
      ).then((m) => m.EstadoCuentaComponent),
  },
  {
    path: "actividad",
    loadComponent: () =>
      import("./features/activity/pages/actividad/actividad.component").then(
        (m) => m.ActividadComponent,
      ),
  },
  {
    path: "coach-ia",
    loadComponent: () =>
      import("./features/coach/pages/coach-ia/coach-ia.component").then(
        (m) => m.CoachIaComponent,
      ),
  },
  {
    path: "ubicacion",
    loadComponent: () =>
      import("./features/public/pages/ubicacion/ubicacion.component").then(
        (m) => m.UbicacionComponent,
      ),
  },
  {
    path: "carrusel",
    loadComponent: () =>
      import("./features/public/pages/carrusel/carrusel.component").then(
        (m) => m.CarruselComponent,
      ),
  },
  {
    path: "servicio",
    loadComponent: () =>
      import("./features/public/pages/servicios/servicios.component").then(
        (m) => m.ServiciosComponent,
      ),
  },
  {
    path: "responsables",
    loadComponent: () =>
      import(
        "./features/public/pages/responsables/responsables.component"
      ).then((m) => m.ResponsablesComponent),
  },
  {
    path: "form",
    loadComponent: () =>
      import("./features/legacy/pages/usuario/usuario.component").then(
        (m) => m.FormComponent,
      ),
  },
  {
    path: "redes/:id",
    loadComponent: () =>
      import("./features/public/pages/redes/redes.component").then(
        (m) => m.RedesComponent,
      ),
  },
  {
    path: "detalle/:id",
    loadComponent: () =>
      import(
        "./features/courses/pages/curso-detalle/curso-detalle.component"
      ).then((m) => m.CursoDetalleComponent),
  },
  {
    path: "buscar",
    loadComponent: () =>
      import("./features/courses/pages/buscar/buscar.component").then(
        (m) => m.BuscarComponent,
      ),
  },
  {
    path: "nosotros",
    loadComponent: () =>
      import("./features/public/pages/nosotros/nosotros.component").then(
        (m) => m.NosotrosComponent,
      ),
  },
  {
    path: "footer",
    loadComponent: () =>
      import("./layouts/public/ui/footer/footer.component").then(
        (m) => m.FooterComponent,
      ),
  },
  {
    path: "ejercicios",
    loadComponent: () =>
      import("./features/training/pages/ejercicios/ejercicios.component").then(
        (m) => m.EjerciciosComponent,
      ),
  },
  {
    path: "videos",
    loadComponent: () =>
      import(
        "./features/training/pages/video-cards/video-cards.component"
      ).then((m) => m.VideoCardsComponent),
  },
  {
    path: "change",
    loadComponent: () =>
      import("./features/auth/pages/change/change.component").then(
        (m) => m.ChangeComponent,
      ),
  },
  {
    path: "f2",
    loadComponent: () =>
      import(
        "./features/training/pages/formulario2/formulario2.component"
      ).then((m) => m.Formulario2Component),
  },
  {
    path: "f3",
    loadComponent: () =>
      import(
        "./features/training/pages/formulario3/formulario3.component"
      ).then((m) => m.Formulario3Component),
  },
  {
    path: "editar1",
    loadComponent: () =>
      import("./features/admin/pages/editar1/editar1.component").then(
        (m) => m.Editar1Component,
      ),
  },
  {
    path: "editar2",
    loadComponent: () =>
      import("./features/admin/pages/editar2/editar2.component").then(
        (m) => m.Editar2Component,
      ),
  },
  {
    path: "phone",
    loadComponent: () =>
      import("./features/auth/pages/phone/phone.component").then(
        (m) => m.PhoneComponent,
      ),
  },
  {
    path: "micuenta",
    loadComponent: () =>
      import("./features/profile/pages/micuenta/micuenta.component").then(
        (m) => m.MicuentaComponent,
      ),
  },
  {
    path: "productos",
    loadComponent: () =>
      import("./features/products/pages/productos/productos.component").then(
        (m) => m.ProductosComponent,
      ),
  },
  { path: "sesion", redirectTo: "/auth/sign-in", pathMatch: "full" },
  {
    path: "graficos",
    loadComponent: () =>
      import("./features/admin/pages/graficos/graficos.component").then(
        (m) => m.GraficosComponent,
      ),
  },

  {
    path: "auth",
    loadChildren: () =>
      import("./features/auth/auth.routes").then((m) => m.default),
  },
];
