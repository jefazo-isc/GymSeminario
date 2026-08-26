import { Routes } from '@angular/router';
import { UbicacionComponent } from './components/ubicacion/ubicacion.component';
import { FormComponent } from './components/usuario/usuario.component';
import { CarruselComponent } from './components/carrusel/carrusel.component';
import { ServiciosComponent } from './components/servicios/servicios.component';
import { ResponsablesComponent } from './components/responsables/responsables.component';
import { VideoCardsComponent } from './components/video-cards/video-cards.component';
import { RedesComponent } from './components/redes/redes.component';
import { NosotrosComponent } from './components/nosotros/nosotros.component';
import { FooterComponent } from './components/footer/footer.component';
import { EjerciciosComponent } from './components/ejercicios/ejercicios.component';
import authRoutes from './auth/features/auth.routes';
import { Component } from '@angular/core';
import { ChangeComponent } from './auth/features/change/change.component';
import { Formulario2Component } from './components/formulario2/formulario2.component';
import { Editar1Component } from './components/editar1/editar1.component';
import { Editar2Component } from './components/editar2/editar2.component';
import { Formulario3Component } from './components/formulario3/formulario3.component';
import { PhoneComponent } from './components/phone/phone.component';
import { MicuentaComponent } from './components/micuenta/micuenta.component';
import { ProductosComponent } from './components/productos/productos.component';
import { AuthComponent } from './auth/features/auth/auth.component';
import { GraficosComponent } from './components/graficos/graficos.component';
import { HomeComponent } from './components/home/home.component';
import { BuscarComponent } from './components/buscar/buscar.component';
import { CursoDetalleComponent } from './components/curso-detalle/curso-detalle.component';


export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },  { path: 'ubicacion', component: UbicacionComponent },
  { path: 'carrusel', component: CarruselComponent },
  { path: 'servicio', component: ServiciosComponent },
  { path: 'responsables', component: ResponsablesComponent },
  { path: 'form', component: FormComponent },
  { path: 'redes/:id', component: RedesComponent },
   {path: 'detalle/:id', component: CursoDetalleComponent},
  {path: 'buscar', component: BuscarComponent },
  { path: 'nosotros', component: NosotrosComponent },
  { path: 'footer', component: FooterComponent },
  { path: 'ejercicios', component: EjerciciosComponent },
  { path: 'videos', component: VideoCardsComponent },
  { path: 'change', component: ChangeComponent },
  { path: 'f2', component: Formulario2Component },
  { path: 'f3', component: Formulario3Component },
  { path: 'editar1', component: Editar1Component },
  { path: 'editar2', component: Editar2Component },
  { path: 'phone', component: PhoneComponent },
  { path: 'micuenta', component: MicuentaComponent },
  { path: 'productos', component: ProductosComponent },
  { path: 'sesion', component: AuthComponent },
  { path: 'graficos', component: GraficosComponent },

  {
    path: 'auth',
    children: authRoutes // ← Integra las rutas hijas desde auth.routes.ts
  }
];