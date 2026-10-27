import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { IconComponent } from "../../shared/ui/icon/icon.component";
import { ButtonDirective } from "../../shared/ui/button.directive";
@Component({
  selector: "app-home",
  standalone: true,
  imports: [RouterLink, IconComponent, ButtonDirective],
  templateUrl: "./home.component.html",
  styleUrl: "./home.component.css",
})
export class HomeComponent {
  readonly services = [
    {
      number: "01",
      name: "Fuerza y pesas",
      description: "Construye tu entrenamiento, un movimiento a la vez.",
      image: "img/CARRUSEL/2.png",
    },
    {
      number: "02",
      name: "Indoor cycling",
      description: "Encuentra energía y ritmo sobre la bicicleta.",
      image: "img/cursos/spinning.jpeg",
    },
    {
      number: "03",
      name: "Entrenamiento en grupo",
      description: "Zumba y CrossFit para sumar movimiento a tu semana.",
      image: "img/cursos/cross-training.jpeg",
    },
  ];
}
