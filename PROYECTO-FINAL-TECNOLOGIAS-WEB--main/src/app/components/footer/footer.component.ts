import { Component } from '@angular/core';
import { CapitalizarPipe } from '../../pipes/capitalizar.pipe';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CapitalizarPipe,CommonModule],  
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent {
  date: string = "";
  email: string = 'gromfitnesscenter@gmail.com';
  
  
  constructor() {
    const fechaActual = new Date();
    this.date = fechaActual.getFullYear().toString(); 
  }
}
