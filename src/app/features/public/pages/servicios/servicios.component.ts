import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { ButtonDirective } from "../../../../shared/ui/button.directive";
import { IconComponent } from "../../../../shared/ui/icon/icon.component";
@Component({
  selector: "app-servicios",
  standalone: true,
  imports: [RouterLink, IconComponent, ButtonDirective],
  templateUrl: "./servicios.component.html",
  styleUrl: "./servicios.component.css",
})
export class ServiciosComponent {
  readonly services = [
    {
      name: "Indoor cycling",
      tag: "Resistencia y ritmo",
      image: "img/cursos/spinning.jpeg",
      text: "Clases de spinning para trabajar tu resistencia cardiovascular en bicicleta fija.",
    },
    {
      name: "Zumba",
      tag: "Movimiento en grupo",
      image: "img/CARRUSEL/3.png",
      text: "Baila, muévete y suma actividad física a tu semana con una sesión en grupo.",
    },
    {
      name: "CrossFit",
      tag: "Fuerza y condición",
      image: "img/cursos/cross-training.jpeg",
      text: "Entrenamiento en distintas estaciones que combina fuerza, agilidad y trabajo cardiovascular.",
    },
    {
      name: "Pesas y fuerza",
      tag: "Entrena a tu ritmo",
      image: "img/CARRUSEL/2.png",
      text: "Un área equipada para desarrollar tu entrenamiento de fuerza con orientación del equipo.",
    },
  ];
}
