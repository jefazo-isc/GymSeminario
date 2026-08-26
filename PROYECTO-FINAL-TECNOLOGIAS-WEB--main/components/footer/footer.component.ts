import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  imports: [],
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
