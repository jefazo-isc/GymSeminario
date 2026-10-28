import { Component, Input, OnChanges } from "@angular/core";
import { SafeUrlPipe } from "../../../../shared/pipes/safe-url.pipe";
import { ButtonDirective } from "../../../../shared/ui/button.directive";
import { IconComponent } from "../../../../shared/ui/icon/icon.component";
@Component({
  selector: "app-video-cards",
  standalone: true,
  imports: [SafeUrlPipe, IconComponent, ButtonDirective],
  templateUrl: "./video-cards.component.html",
  styleUrl: "./video-cards.component.scss",
})
export class VideoCardsComponent implements OnChanges {
  @Input() parte = "";
  filter = "";
  activeId: string | null = null;
  readonly videos = [
    {
      id: "UglCbW0bmEw",
      title: "Cómo crear una rutina de gimnasio",
      category: "General",
    },
    {
      id: "KXnOryN4ENc",
      title: "Cómo organizar tu entrenamiento",
      category: "General",
    },
    { id: "i1PzWkmY7gQ", title: "Entrenamiento de brazos", category: "Brazos" },
    { id: "wzIsWDRQmVs", title: "Rutina de espalda", category: "Espalda" },
    { id: "YB6PwKTnKnw", title: "Entrenamiento de pecho", category: "Pecho" },
    { id: "nHtypUjIB-A", title: "Rutina de piernas", category: "Piernas" },
  ];
  get categories() {
    return [...new Set(this.videos.map((v) => v.category))];
  }
  get visible() {
    return this.videos.filter(
      (v) => !this.filter || v.category === this.filter,
    );
  }
  ngOnChanges() {
    if (this.parte) {
      const category = this.categories.find(
        (c) => c.toLowerCase() === this.parte.toLowerCase(),
      );
      this.filter = category || "";
      this.activeId = null;
    }
  }
  selectFilter(value: string) {
    this.filter = value;
    this.activeId = null;
  }
}
