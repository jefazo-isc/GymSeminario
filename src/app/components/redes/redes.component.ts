import { Component } from "@angular/core";
@Component({
  selector: "app-redes",
  standalone: true,
  templateUrl: "./redes.component.html",
  styleUrl: "./redes.component.css",
})
export class RedesComponent {
  socialId = "";
  readonly channels = [
    {
      name: "Instagram",
      handle: "@gromfitnesscenter",
      url: "https://www.instagram.com/gromfitnesscenter/",
      description: "Fotografías, novedades y publicaciones del gimnasio.",
    },
    {
      name: "Facebook",
      handle: "GROM Fitness Center",
      url: "https://www.facebook.com/gromfitnesscenter",
      description: "Información y publicaciones de la comunidad.",
    },
    {
      name: "TikTok",
      handle: "@grom_fitnesscenter",
      url: "https://www.tiktok.com/@grom_fitnesscenter",
      description: "Videos y momentos de entrenamiento.",
    },
  ];
}
