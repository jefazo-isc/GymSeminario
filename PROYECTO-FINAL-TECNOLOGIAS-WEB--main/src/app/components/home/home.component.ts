import { Component } from '@angular/core';
import { CarruselComponent } from '../carrusel/carrusel.component';
import { NosotrosComponent } from '../nosotros/nosotros.component';
import { ServiciosComponent } from '../servicios/servicios.component';
import { UbicacionComponent } from '../ubicacion/ubicacion.component';
import { NavbarComponent } from "../navbar/navbar.component";
import { RedesComponent } from "../redes/redes.component";
import { EjerciciosComponent } from "../../../../components/ejercicios/ejercicios.component";
import { VideoCardsComponent } from "../video-cards/video-cards.component";
import { ResponsablesComponent } from "../responsables/responsables.component";
import { FooterComponent } from "../../../../components/footer/footer.component";

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  imports: [
    CarruselComponent,
    NosotrosComponent,
    ServiciosComponent,
    UbicacionComponent,
    NavbarComponent,
    RedesComponent,
    EjerciciosComponent,
    VideoCardsComponent,
    ResponsablesComponent,
    FooterComponent
]
})
export class HomeComponent {}
