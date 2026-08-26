import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Firestore, collection, collectionData, updateDoc, doc, deleteDoc } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-editar1',
  templateUrl: './editar1.component.html',
  imports: [FormsModule, CommonModule],
  styleUrl: './editar1.component.css'
})
export class Editar1Component implements OnInit {
  registros: any[] = [];
  entrenamientos: string[] = ['Boxeo', 'Crossfit', 'Spinning', 'Yoga', 'Pesas'];

  constructor(private firestore: Firestore) {}

  ngOnInit() {
    const colRef = collection(this.firestore, 'formularioEntrenamiento');
    collectionData(colRef, { idField: 'id' }).subscribe(data => {
      this.registros = data;
    });
  }

  async actualizar(item: any) {
    const docRef = doc(this.firestore, 'formularioEntrenamiento', item.id);
    try {
      await updateDoc(docRef, {
        entrenamiento: item.entrenamiento,
        fecha: item.fecha,
        turno: item.turno,
        nombre: item.nombre // usamos 'nombre' en lugar de 'usuario'
      });
      Swal.fire('Actualizado', 'Registro actualizado', 'success');
      item.editando = false; // salir del modo edición
    } catch (error) {
      console.error('Error al actualizar:', error);
      Swal.fire('Error', 'Intenta más tarde', 'error');
    }
  }

  async borrar(item: any) {
  const resultado = await Swal.fire({
    title: '¿Estás seguro?',
    text: 'Esta acción no se puede deshacer.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, borrar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6'
  });

  if (!resultado.isConfirmed) return;

  try {
    const docRef = doc(this.firestore, 'formularioEntrenamiento', item.id);
    await deleteDoc(docRef);
    Swal.fire('Borrado', 'Registro borrado correctamente', 'success');
    this.registros = this.registros.filter(r => r.id !== item.id);
  } catch (error) {
    console.error('Error al borrar:', error);
    Swal.fire('Error', 'Intenta más tarde', 'error');
  }
}

}
