import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Firestore, collection, collectionData, updateDoc, doc, deleteDoc } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-editar2',
  templateUrl: './editar2.component.html',
  imports:[FormsModule,CommonModule],
  styleUrls: ['./editar2.component.css']
 // si estás usando estilos externos
})
export class Editar2Component implements OnInit {
  registros: any[] = [];
  clases = ['Cardio', 'Funcional', 'Spinning', 'Box', 'CrossFit'];

  constructor(private firestore: Firestore) {}

  ngOnInit() {
    const colRef = collection(this.firestore, 'asistencias');
    collectionData(colRef, { idField: 'id' }).subscribe(data => {
      this.registros = data;
    });
  }

  async actualizar(item: any) {
    const docRef = doc(this.firestore, 'asistencias', item.id);
    try {
      await updateDoc(docRef, {
        clase: item.clase,
        fecha: item.fecha,
        hora: item.hora,
        alumno: item.alumno
      });
      Swal.fire('Actualizado', 'Actualizado correctamente', 'success');
      item.editando = false;
    } catch (error) {
      console.error('Error al actualizar:', error);
      Swal.fire('Error', 'Intenta mas tarde', 'error');
    }
  }

 borrar(item: any) {
  const docRef = doc(this.firestore, 'asistencias', item.id);
  deleteDoc(docRef)
    .then(() => {
      Swal.fire('Borrado', 'Borrado correctamente', 'success');
    })
    .catch((error) => {
      console.error('Error al borrar:', error);
      Swal.fire('Error', 'Intenta más tarde', 'error');
    });
}

}
