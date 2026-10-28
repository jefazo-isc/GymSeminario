import { Dialog, DialogModule, DialogRef } from "@angular/cdk/dialog";
import { CommonModule } from "@angular/common";
import {
  Component,
  inject,
  OnDestroy,
  OnInit,
  TemplateRef,
} from "@angular/core";
import { FormsModule, NgForm } from "@angular/forms";
import { Subscription } from "rxjs";
import Swal from "sweetalert2";
import { ButtonDirective } from "../../../../shared/ui/button.directive";
import { IconComponent } from "../../../../shared/ui/icon/icon.component";
import { TRAINING } from "../../../training/data-access/training.repository";
import { AttendanceRecord } from "../../../training/models/registration.model";
@Component({
  selector: "app-editar2",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonDirective,
    IconComponent,
  ],
  templateUrl: "./editar2.component.html",
  styleUrl: "./editar2.component.css",
})
export class Editar2Component implements OnInit, OnDestroy {
  private training = inject(TRAINING);
  private dialog = inject(Dialog);
  private stream?: Subscription;
  private editor?: DialogRef;
  registros: AttendanceRecord[] = [];
  clases = ["Cardio", "Funcional", "Spinning", "Box", "CrossFit"];
  query = "";
  selectedClass = "";
  loading = false;
  error = "";
  feedback = "";
  busyId = "";
  editing: AttendanceRecord | null = null;
  ngOnInit() {
    this.load();
  }
  ngOnDestroy() {
    this.stream?.unsubscribe();
    this.editor?.close();
  }
  load() {
    this.stream?.unsubscribe();
    this.loading = true;
    this.error = "";
    try {
      this.stream = this.training.attendances().subscribe({
        next: (data) => {
          this.registros = data;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.error =
            "No se pudieron leer los registros. Revisa tu sesión, conexión y permisos del proyecto.";
        },
      });
    } catch {
      this.loading = false;
      this.error = "El servicio de registros no está disponible.";
    }
  }
  get filtered() {
    const q = this.query.toLocaleLowerCase("es").trim();
    return this.registros
      .filter(
        (item) =>
          (!this.selectedClass || item.clase === this.selectedClass) &&
          (!q ||
            [item.clase, item.alumno, item.fecha, item.hora]
              .join(" ")
              .toLocaleLowerCase("es")
              .includes(q)),
      )
      .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  }
  openEditor(item: AttendanceRecord, template: TemplateRef<unknown>) {
    this.editing = { ...item };
    this.editor = this.dialog.open(template, {
      width: "640px",
      maxWidth: "calc(100vw - 24px)",
      panelClass: "grom-dialog",
      backdropClass: "grom-backdrop",
      ariaLabelledBy: "edit-record-title",
      autoFocus: "#admin-activity",
      restoreFocus: true,
    });
    this.editor.closed.subscribe(() => (this.editing = null));
  }
  closeEditor() {
    if (!this.busyId) this.editor?.close();
  }
  async actualizar(item: AttendanceRecord, form?: NgForm) {
    if (this.busyId || form?.invalid) {
      form?.form.markAllAsTouched();
      return;
    }
    this.busyId = item.id;
    this.feedback = "";
    try {
      await this.training.updateAttendance(item.id, {
        clase: item.clase,
        fecha: item.fecha,
        hora: item.hora,
        alumno: item.alumno,
      });
      this.feedback = "Registro actualizado en Firestore.";
      this.editor?.close();
    } catch {
      this.feedback =
        "No se pudo guardar la edición. Conservamos los campos para que puedas intentarlo de nuevo.";
    } finally {
      this.busyId = "";
    }
  }
  async borrar(item: AttendanceRecord) {
    if (this.busyId) return;
    const result = await Swal.fire({
      title: "Eliminar registro compartido",
      text:
        "Se eliminará la sesión de " +
        (item.alumno || "este socio") +
        " del " +
        item.fecha +
        ". Esta acción modifica Firestore y no se puede deshacer desde esta interfaz.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Eliminar registro",
      cancelButtonText: "Conservar",
    });
    if (!result.isConfirmed) return;
    this.busyId = item.id;
    try {
      await this.training.deleteAttendance(item.id);
      this.registros = this.registros.filter((r) => r.id !== item.id);
      this.feedback = "Registro eliminado de Firestore.";
    } catch {
      this.feedback =
        "No se pudo eliminar el registro. Revisa permisos y conexión.";
    } finally {
      this.busyId = "";
    }
  }
}
