import { Component, AfterViewInit } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { CarruselComponent } from './components/carrusel/carrusel.component';
import { FooterComponent } from './components/footer/footer.component';
import { UbicacionComponent } from './components/ubicacion/ubicacion.component';
import { NosotrosComponent } from './components/nosotros/nosotros.component';
import { ServiciosComponent } from './components/servicios/servicios.component';
import { RedesComponent } from './components/redes/redes.component';
import { ResponsablesComponent } from './components/responsables/responsables.component';
import { MatCardModule } from '@angular/material/card';
import { VideoCardsComponent } from './components/video-cards/video-cards.component';
import { EjerciciosComponent } from './components/ejercicios/ejercicios.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { CapitalizarPipe } from './pipes/capitalizar.pipe';
import { ContraValidator } from '../validators/contra.validator';
import { matchContra } from '../validators/match-contra.validator';

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
  styleUrl: './app.component.css'
})

export class AppComponent implements AfterViewInit {
  title = 'practicaLibreria';
  synth = window.speechSynthesis;
  utterance: SpeechSynthesisUtterance | null = null;
  spans: HTMLElement[] = [];
  palabras: string[] = [];
  lecturaIniciada = false;
  fontSizeActual = 15;

  ngAfterViewInit(): void {
    const toggle = document.getElementById('accesibilidad-toggle');
    const icono = document.getElementById('icono-accesibilidad');
    toggle?.addEventListener('click', () => {
      document.body.classList.toggle('modo-accesible');
      if (icono) icono.className = document.body.classList.contains('modo-accesible') ? 'bx bx-moon' : 'bx bx-sun';
    });

    setTimeout(() => {
      const togglePanel = document.getElementById('toggle-accesibilidad');
      const panel = document.getElementById('panel-accesibilidad');
      togglePanel?.addEventListener('click', () => {
        panel?.classList.toggle('show');
      });
    }, 0);

    const play = document.getElementById('btn-lector-general');
    const pause = document.getElementById('btn-pausa-general');
    const stop = document.getElementById('btn-detener-general');

    play?.addEventListener('click', () => {
      if (this.synth.paused && this.lecturaIniciada) {
        this.synth.resume();
      } else {
        this.iniciarLectura();
      }
      play.style.display = 'none';
      pause!.style.display = 'inline-block';
      stop!.style.display = 'inline-block';
    });

    pause?.addEventListener('click', () => {
      if (this.synth.speaking) this.synth.pause();
    });

    stop?.addEventListener('click', () => {
      this.synth.cancel();
      this.quitarResaltado();
      this.lecturaIniciada = false;
      play!.style.display = 'inline-block';
      pause!.style.display = 'none';
      stop!.style.display = 'none';
    });

    const btnAumentar = document.getElementById('btn-aumentar');
    const btnDisminuir = document.getElementById('btn-disminuir');
    const btnResetear = document.getElementById('btn-resetear');

    btnAumentar?.addEventListener('click', () => this.cambiarTamano('aumentar'));
    btnDisminuir?.addEventListener('click', () => this.cambiarTamano('disminuir'));
    btnResetear?.addEventListener('click', () => this.resetearEstilos());
  }

  iniciarLectura() {
    const seccion1 = document.getElementById('contenido-lector-nosotros');
    const seccion2 = document.getElementById('contenido-lector-servicios');
    if (!seccion1 || !seccion2) return;

    this.quitarResaltado();
    this.spans = [];

    this.prepararSpans(seccion1);
    this.prepararSpans(seccion2);

    const texto1 = seccion1.textContent?.trim() || '';
    const texto2 = seccion2.textContent?.trim() || '';
    const textoCompleto = `${texto1}. ${texto2}`;
    this.palabras = textoCompleto.split(/\s+/);

    this.utterance = new SpeechSynthesisUtterance(textoCompleto);
    this.utterance.lang = 'es-ES';
    this.lecturaIniciada = true;

    const voz = this.synth.getVoices().find(v => v.lang.startsWith('es'));
    if (voz) this.utterance.voice = voz;

    this.utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const index = this.encontrarIndice(event.charIndex);
        this.resaltar(index);
      }
    };

    this.utterance.onend = () => {
      this.quitarResaltado();
      this.lecturaIniciada = false;
      const play = document.getElementById('btn-lector-general');
      const pause = document.getElementById('btn-pausa-general');
      const stop = document.getElementById('btn-detener-general');
      if (play && pause && stop) {
        play.style.display = 'inline-block';
        pause.style.display = 'none';
        stop.style.display = 'none';
      }
    };

    this.synth.cancel();
    this.synth.speak(this.utterance);
  }

  prepararSpans(container: HTMLElement) {
    const etiquetas = container.querySelectorAll('p, h3, h4, li');
    etiquetas.forEach(tag => {
      const texto = tag.textContent?.trim() || '';
      const palabras = texto.split(/\s+/);
      tag.innerHTML = palabras.map((p) => `<span>${p}</span>`).join(' ');
    });
    const nuevosSpans = container.querySelectorAll('span');
    nuevosSpans.forEach(s => this.spans.push(s as HTMLElement));
  }

  encontrarIndice(charIndex: number): number {
    let total = 0;
    for (let i = 0; i < this.palabras.length; i++) {
      total += this.palabras[i].length + 1;
      if (total > charIndex) return i;
    }
    return 0;
  }

  resaltar(index: number) {
    this.spans.forEach(span => span.classList.remove('highlight'));
    if (this.spans[index]) this.spans[index].classList.add('highlight');
  }

  quitarResaltado() {
    this.spans.forEach(span => span.classList.remove('highlight'));
  }

  cambiarFuente(event: Event) {
    const fuente = (event.target as HTMLSelectElement).value;
    const secciones = document.querySelectorAll('.contenido-servicios, .contenido-nosotros');
    secciones.forEach((seccion) => {
      (seccion as HTMLElement).style.fontFamily = fuente;
      const elementos = seccion.querySelectorAll('*');
      elementos.forEach((el) => {
        (el as HTMLElement).style.fontFamily = fuente;
      });
    });
  }

  cambiarTamano(accion: 'aumentar' | 'disminuir') {
    this.fontSizeActual += (accion === 'aumentar') ? 1 : -1;
    this.fontSizeActual = Math.max(10, Math.min(40, this.fontSizeActual));
    const nuevoTamano = `${this.fontSizeActual}px`;
    const elementos = document.querySelectorAll('.contenido-servicios *, .contenido-nosotros *');
    elementos.forEach(el => {
      (el as HTMLElement).style.fontSize = nuevoTamano;
    });
  }

  resetearEstilos() {
    this.fontSizeActual = 15;
    const secciones = document.querySelectorAll('.contenido-servicios, .contenido-nosotros');

    secciones.forEach((seccion) => {

      (seccion as HTMLElement).style.fontSize = '';
      (seccion as HTMLElement).style.fontFamily = '';


      const elementos = seccion.querySelectorAll('*');
      elementos.forEach(el => {
        (el as HTMLElement).style.fontSize = '';
        (el as HTMLElement).style.fontFamily = '';
      });
    });
  }
}
