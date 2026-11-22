import { Component } from "@angular/core";
import { EjerciciosComponent } from "../ejercicios/ejercicios.component";
import { VideoCardsComponent } from "../video-cards/video-cards.component";

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [EjerciciosComponent, VideoCardsComponent],
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.css"],
})
export class DashboardComponent {
  parteSeleccionada: string = "";

  actualizarParte(parte: string): void {
    this.parteSeleccionada = parte;
  }
}
