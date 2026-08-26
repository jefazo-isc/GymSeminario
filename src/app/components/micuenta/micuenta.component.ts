import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../auth/data-access/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-micuenta',
  templateUrl: './micuenta.component.html',
  styleUrl: './micuenta.component.css',
  imports: [CommonModule]
})
export class MicuentaComponent implements OnInit {
  nombre: string | null = null;
  edad: string | null = null; // Solo si estás usando edad más adelante
  role: string | null = null; // 👈 Aquí agregas el rol

  constructor(private authService: AuthService) {
    // Nombre
    this.authService.userName$.subscribe((nombref) => {
      this.nombre = nombref;
    });

    // Rol
    this.authService.userRole$.subscribe((rol) => {
      this.role = rol;
      console.log('Rol recibido:', rol);
    });
  }

  ngOnInit(): void {}
}
