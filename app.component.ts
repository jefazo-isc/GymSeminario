import { Component, AfterViewInit } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { CarruselComponent } from './components/carrusel/carrusel.component';
import { FooterComponent } from './components/footer/footer.component';
import { MatCardModule } from '@angular/material/card';
import { EjerciciosComponent } from './components/ejercicios/ejercicios.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { VideoCardsComponent } from './src/app/components/video-cards/video-cards.component';
import { matchContra } from './src/validators/match-contra.validator';
import { UbicacionComponent } from './src/app/components/ubicacion/ubicacion.component';
import { NavbarComponent } from './src/app/components/navbar/navbar.component';
import { NosotrosComponent } from './src/app/components/nosotros/nosotros.component';
import { ServiciosComponent } from './src/app/components/servicios/servicios.component';
import { RedesComponent } from './src/app/components/redes/redes.component';
import { ResponsablesComponent } from './src/app/components/responsables/responsables.component';
import { CapitalizarPipe } from './src/app/pipes/capitalizar.pipe';
import { ContraValidator } from './src/validators/contra.validator';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterModule,
    NavbarComponent,
    CarruselComponent,
    FooterComponent,
    UbicacionComponent,
    NosotrosComponent,
    ServiciosComponent,
    RedesComponent,
    ResponsablesComponent,
    MatCardModule,
    VideoCardsComponent,
    EjerciciosComponent,
    DashboardComponent,
    CapitalizarPipe,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit {
  title = 'practicaLibreria';

  ngAfterViewInit(): void {
    document.body.classList.remove('modo-accesible');

    const toggleBtn = document.getElementById('accesibilidad-toggle');
    const icono = document.getElementById('icono-accesibilidad');

    if (toggleBtn && icono) {
      toggleBtn.addEventListener('click', () => {
        const modoActivado = document.body.classList.toggle('modo-accesible');

        if (modoActivado) {
          icono.classList.remove('bx-sun');
          icono.classList.add('bx-moon');
        } else {
          icono.classList.remove('bx-moon');
          icono.classList.add('bx-sun');
        }
      });
    }
  }

  cambiarFuente(fuente: string) {
    const elementos = document.querySelectorAll('.contenido-servicios, .contenido-nosotros');
    elementos.forEach((el: Element) => {
      (el as HTMLElement).style.fontFamily = fuente;
    });
  }

  cambiarTamano(tamano: string) {
    const elementos = document.querySelectorAll('.contenido-servicios, .contenido-nosotros');
    elementos.forEach((el: Element) => {
      (el as HTMLElement).style.fontSize = tamano;
    });
  }

  activarSubrayado() {
    const elementos = document.querySelectorAll('.contenido-servicios, .contenido-nosotros');
    elementos.forEach((el: Element) => {
      (el as HTMLElement).style.textDecoration = 'underline';
    });
  }

  quitarSubrayado() {
    const elementos = document.querySelectorAll('.contenido-servicios, .contenido-nosotros');
    elementos.forEach((el: Element) => {
      (el as HTMLElement).style.textDecoration = 'none';
    });
  }
}
