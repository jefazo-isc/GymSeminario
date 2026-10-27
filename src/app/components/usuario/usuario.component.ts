import { Component, inject, Input } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  FormBuilder,
  ReactiveFormsModule,
  FormsModule,
  NgForm,
  Validators,
} from "@angular/forms";
import { RouterLink } from "@angular/router";
import { PasswordToggleDirective } from "../../shared/ui/password-toggle.directive";
import { ButtonDirective } from "../../shared/ui/button.directive";
import { matchContra } from "../../../validators/match-contra.validator";
import Swal from "sweetalert2";
@Component({
  selector: "app-form",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    PasswordToggleDirective,
    ButtonDirective,
  ],
  templateUrl: "./usuario.component.html",
  styleUrl: "./usuario.component.css",
})
export class FormComponent {
  private fb = inject(FormBuilder);
  @Input() usuarioActual: string | null = null;
  mensaje = "";
  hoy = this.today();
  horaMin = "06:00";
  horaMax = "23:00";
  resumenVisible = false;
  resumen: any = {};
  selectedSession = 1;
  draft = { nombre: "", usuario: "", hora: "" };
  readonly clases = [
    { valor: "pesas", nombre: "Indoor Cycling" },
    { valor: "crosfit", nombre: "Crosfit" },
    { valor: "zumba", nombre: "Zumba" },
  ];
  private readonly admins = [
    { usuario: "abraham", contrasena: "123" },
    { usuario: "pepe", contrasena: "123" },
    { usuario: "luis", contrasena: "123" },
  ];
  cuentaForm = this.fb.nonNullable.group(
    {
      nombre: ["", Validators.required],
      usuario: ["", Validators.required],
      correo: ["", [Validators.required, Validators.email]],
      contrasena: ["", Validators.required],
      confirmarContrasena: ["", Validators.required],
    },
    { validators: matchContra("contrasena", "confirmarContrasena") },
  );
  constructor() {
    try {
      this.usuarioActual = localStorage.getItem("usuarioActual");
      const saved = localStorage.getItem("ultimaSesion");
      if (saved) {
        this.resumen = JSON.parse(saved);
        this.draft = {
          nombre: this.resumen.nombre || "",
          usuario: this.resumen.usuario || "",
          hora: this.resumen.hora || "",
        };
        this.selectedSession = Number(this.resumen.sesiones) || 1;
        this.resumenVisible = !!this.usuarioActual;
      }
    } catch {
      this.mensaje = "No se pudieron recuperar los datos locales.";
    }
  }
  private today() {
    const d = new Date();
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
    ].join("-");
  }
  guardar() {
    this.cuentaForm.markAllAsTouched();
    if (this.cuentaForm.invalid) return;
    const { usuario, contrasena } = this.cuentaForm.getRawValue();
    if (
      !this.admins.some(
        (a) => a.usuario === usuario && a.contrasena === contrasena,
      )
    ) {
      this.mensaje =
        "La cuenta de prueba no coincide. Este flujo no utiliza las cuentas de Firebase.";
      return;
    }
    try {
      localStorage.setItem("usuarioActual", usuario);
      this.usuarioActual = usuario;
      this.mensaje =
        "Acceso al ejemplo local. No se abrió una sesión de Firebase.";
      this.cuentaForm.reset();
    } catch {
      this.mensaje = "El navegador no permite guardar el acceso de prueba.";
    }
  }
  validarDia() {
    this.mensaje = "";
    if (!this.draft.usuario) return;
    const day = new Date(this.draft.usuario + "T00:00:00").getDay();
    this.horaMax = day === 6 ? "14:00" : "23:00";
    if (day === 0)
      this.mensaje = "El gimnasio no abre los domingos. Elige otro día.";
  }
  mostrarResumen(form: NgForm) {
    this.validarDia();
    if (form.invalid || this.mensaje) {
      form.form.markAllAsTouched();
      return;
    }
    if (
      this.draft.usuario < this.hoy ||
      this.draft.hora < this.horaMin ||
      this.draft.hora > this.horaMax
    ) {
      this.mensaje =
        "Revisa fecha y hora con el horario publicado del gimnasio.";
      return;
    }
    this.resumen = { ...this.draft, sesiones: this.selectedSession };
    this.resumenVisible = true;
  }
  guardarTemplate(form: NgForm) {
    this.mostrarResumen(form);
    if (form.invalid || this.mensaje || !this.resumenVisible) return;
    try {
      localStorage.setItem("ultimaSesion", JSON.stringify(this.resumen));
      localStorage.setItem("formTemplateData", JSON.stringify(this.resumen));
      localStorage.setItem(
        "sesionesSeleccionadas",
        JSON.stringify([this.selectedSession]),
      );
      this.mensaje = "La sesión de ejemplo se guardó solo en este navegador.";
    } catch {
      this.mensaje = "No se pudo guardar la sesión local.";
    }
  }
  editarSesion() {
    this.draft = {
      nombre: this.resumen.nombre,
      usuario: this.resumen.usuario,
      hora: this.resumen.hora,
    };
    this.selectedSession = Number(this.resumen.sesiones) || 1;
    this.resumenVisible = false;
    this.mensaje = "Edita los campos y vuelve a guardar.";
  }
  async eliminarSesion() {
    const result = await Swal.fire({
      title: "Eliminar sesión de ejemplo",
      text: "Se eliminarán los datos guardados en este navegador. No afecta Firestore.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Eliminar ejemplo",
      cancelButtonText: "Conservar",
    });
    if (result.isConfirmed) {
      try {
        for (const key of [
          "ultimaSesion",
          "formTemplateData",
          "sesionesSeleccionadas",
        ])
          localStorage.removeItem(key);
        this.resumen = {};
        this.resumenVisible = false;
        this.mensaje = "Ejemplo local eliminado.";
      } catch {
        this.mensaje = "No se pudo eliminar el ejemplo local.";
      }
    }
  }
  cerrarSesion() {
    try {
      localStorage.removeItem("usuarioActual");
      localStorage.removeItem("formTemplateData");
      this.usuarioActual = null;
      this.resumenVisible = false;
      this.mensaje =
        "Acceso al ejemplo cerrado. La sesión de Firebase no se modificó.";
    } catch {
      this.mensaje = "No se pudo actualizar el almacenamiento local.";
    }
  }
}
