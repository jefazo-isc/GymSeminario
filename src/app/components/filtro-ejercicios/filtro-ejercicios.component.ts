import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-filtro-ejercicios',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatIconModule],
  templateUrl: './filtro-ejercicios.component.html',
  styleUrl: './filtro-ejercicios.component.css'
})
export class FiltroEjerciciosComponent {
  @Output() searchChange = new EventEmitter<string>();
  
  searchTerm: string = '';

  onSearchChange(): void {
    this.searchChange.emit(this.searchTerm);
  }
}