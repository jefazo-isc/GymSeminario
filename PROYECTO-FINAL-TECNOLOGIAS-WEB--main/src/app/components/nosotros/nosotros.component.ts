import { Component } from '@angular/core';

@Component({
  selector: 'app-nosotros',
  templateUrl: './nosotros.component.html',
  styleUrls: ['./nosotros.component.css']
})
export class NosotrosComponent {
  titulo = '¿Quiénes somos?';
  parrafo = `En GROM FITNESS CENTER somos un gimnasio local de Aguascalientes, creado con el propósito de ofrecer una experiencia única en el mundo del fitness. 
Nos dedicamos a proporcionar un ambiente motivador y de alto rendimiento, donde el bienestar y el esfuerzo de cada persona son nuestra prioridad.
Queremos que cada miembro se sienta motivado y satisfecho con su progreso, porque sabemos que la clave para alcanzar tus metas es la constancia y el apoyo adecuado.
En GROM FITNESS CENTER, trabajamos cada día para que tu experiencia sea inolvidable y que te sientas parte de una comunidad dedicada a mejorar la salud y el rendimiento físico.`;
}
