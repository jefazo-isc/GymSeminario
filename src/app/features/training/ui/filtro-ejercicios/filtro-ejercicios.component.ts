import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Output } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { IconComponent } from "../../../../shared/ui/icon/icon.component";

@Component({
  selector: "app-filtro-ejercicios",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    IconComponent,
  ],
  templateUrl: "./filtro-ejercicios.component.html",
  styleUrl: "./filtro-ejercicios.component.css",
})
export class FiltroEjerciciosComponent {
  @Output() searchChange = new EventEmitter<string>();

  searchTerm: string = "";

  onSearchChange(): void {
    this.searchChange.emit(this.searchTerm);
  }
}
