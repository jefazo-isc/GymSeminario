import { createProfileDraft } from "../../../profile/models/profile.model";
import { Subscription } from "rxjs";
import { RequestState } from "../../../../core/data-access/request-state";
import { RequestStateComponent } from "../../../../shared/ui/request-state/request-state.component";
import { CommonModule } from "@angular/common";
import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  OnInit,
  afterNextRender,
  inject,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule, NgForm } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { authErrorMessage } from "../../../../core/auth/auth-feedback";
import { ButtonDirective } from "../../../../shared/ui/button.directive";
import { IconComponent } from "../../../../shared/ui/icon/icon.component";
import { SESSION } from "../../../auth/data-access/session.repository";
import { PROFILES } from "../../../profile/data-access/profile.repository";
import { COACH } from "../../data-access/coach.repository";
import { validRoutine } from "../../models/rutina.guard";
import {
  CoachInfo,
  MensajeChat,
  PerfilSocio,
  RutinaData,
} from "../../models/rutina.model";
export { validRoutine } from "../../models/rutina.guard";
@Component({
  selector: "app-coach-ia",
  standalone: true,
  imports: [
    CommonModule,
    RequestStateComponent,
    FormsModule,
    RouterLink,
    ButtonDirective,
    IconComponent,
  ],
  templateUrl: "./coach-ia.component.html",
  styleUrl: "./coach-ia.component.css",
})
export class CoachIaComponent implements OnInit {
  private routines = inject(COACH);
  private auth = inject(SESSION);
  private profiles = inject(PROFILES);
  private destroyRef = inject(DestroyRef);
  private host: ElementRef<HTMLElement> = inject(ElementRef);
  private injector = inject(Injector);
  pestanaActiva: "rutina" | "chat" = "rutina";
  usuarioAutenticado = false;
  usuarioNombre: string | null = null;
  cargandoAuth = true;
  authBusy = false;
  perfil: PerfilSocio = createProfileDraft();
  profileReady = false;
  profileLoading = false;
  profileError = "";
  private profileStream?: Subscription;
  cargando = false;
  rutina: RutinaData | null = null;
  errorMensaje: string | null = null;
  origenRespuesta: string | null = null;
  coaches: CoachInfo[] = [];
  coachActivo: CoachInfo | null = null;
  mensajes: MensajeChat[] = [];
  mensajeInput = "";
  enviandoMensaje = false;
  coachesLoading = false;
  coachesError = "";
  chatError = "";
  private failedText = "";
  objetivos = [
    "Ganancia muscular",
    "Pérdida de grasa / Definición",
    "Fuerza máxima",
    "Acondicionamiento físico",
    "Tonificación general",
  ];
  opcionesDias = [2, 3, 4, 5, 6];
  ngOnInit() {
    this.verificarAutenticacion();
    this.cargarCoaches();
    this.loadProfile();
    this.destroyRef.onDestroy(() => this.profileStream?.unsubscribe());
  }
  get profileState(): RequestState<PerfilSocio> {
    if (this.profileLoading) return { status: "loading" };
    if (this.profileError)
      return {
        status: "error",
        error: { kind: "network", message: this.profileError, retryable: true },
      };
    return { status: "data", data: this.perfil };
  }
  loadProfile() {
    this.profileStream?.unsubscribe();
    this.profileLoading = true;
    this.profileError = "";
    this.profileReady = false;
    this.profileStream = this.profiles.perfil$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.perfil = { ...profile };
          this.profileReady = true;
          this.profileLoading = false;
        },
        error: () => {
          this.profileReady = false;
          this.profileLoading = false;
          this.profileError =
            "No se pudo consultar el perfil. Reintenta la lectura antes de enviar información al coach.";
        },
      });
  }
  private listeningToName = false;
  verificarAutenticacion() {
    this.auth
      .getCurrentUser()
      .then(async (user) => {
        this.cargandoAuth = false;
        this.usuarioAutenticado = !!user;
        this.usuarioNombre = user?.displayName || user?.email || null;
        if (user) {
          try {
            await this.profiles.actualizarNombre(
              user.displayName || user.email?.split("@")[0] || "Socio",
            );
          } catch {
            this.errorMensaje =
              "Tu sesión está activa, pero no pudimos guardar el nombre en el perfil local.";
          }
        }
      })
      .catch(() => {
        this.cargandoAuth = false;
        this.errorMensaje = "No se pudo consultar tu sesión.";
      });
    if (this.listeningToName) return;
    this.listeningToName = true;
    this.auth.userName$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((name) => {
        this.usuarioAutenticado = !!name;
        if (name) this.usuarioNombre = name;
      });
  }
  async loginConGoogle() {
    if (this.authBusy) return;
    this.authBusy = true;
    this.errorMensaje = null;
    try {
      await this.auth.signInWithGoogle();
      this.verificarAutenticacion();
    } catch (error) {
      this.errorMensaje = authErrorMessage(error);
    } finally {
      this.authBusy = false;
    }
  }
  cargarCoaches() {
    if (this.coachesLoading) return;
    this.coachesLoading = true;
    this.coachesError = "";
    this.routines
      .obtenerCoaches()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.coaches = Array.isArray(list) ? list : [];
          this.coachesLoading = false;
          if (this.coaches.length && !this.coachActivo)
            this.seleccionarCoach(this.coaches[0]);
          if (!this.coaches.length)
            this.coachesError = "El servicio no publicó coaches disponibles.";
        },
        error: () => {
          this.coachesLoading = false;
          this.coachesError =
            "El servicio de coaches no está disponible. Reintenta cuando esté conectado.";
        },
      });
  }
  seleccionarCoach(coach: CoachInfo) {
    if (this.enviandoMensaje) return;
    this.coachActivo = coach;
    this.mensajes = [];
    this.chatError = "";
    this.failedText = "";
  }
  enviarMensaje(retry = false) {
    if (
      !this.usuarioAutenticado ||
      !this.coachActivo ||
      this.enviandoMensaje ||
      !this.profileReady
    )
      return;
    const text = retry ? this.failedText : this.mensajeInput.trim();
    if (!text) return;
    this.chatError = "";
    this.mensajeInput = "";
    if (!retry)
      this.mensajes.push({
        remitente: "usuario",
        texto: text,
        hora: this.obtenerHora(),
      });
    this.enviandoMensaje = true;
    this.scrollLog();
    this.routines
      .enviarMensajeChat(
        this.coachActivo.id,
        text,
        this.mensajes,
        this.rutina,
        this.perfil,
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.enviandoMensaje = false;
          if (
            response?.exito === true &&
            typeof response.respuesta === "string" &&
            response.respuesta.trim()
          ) {
            this.mensajes.push({
              remitente: "coach",
              texto: response.respuesta,
              hora: this.obtenerHora(),
            });
            this.failedText = "";
            this.scrollLog();
          } else this.messageFailed(text);
        },
        error: () => {
          this.enviandoMensaje = false;
          this.messageFailed(text);
        },
      });
  }
  private messageFailed(text: string) {
    this.failedText = text;
    this.chatError =
      "No se recibió una respuesta válida del coach. Tu mensaje se conserva; puedes volver a enviarlo.";
  }
  retryMessage() {
    this.enviarMensaje(true);
  }
  generarRutina(form?: NgForm) {
    if (this.cargando || !this.usuarioAutenticado || !this.profileReady) return;
    if (form?.invalid) {
      form.form.markAllAsTouched();
      return;
    }
    this.cargando = true;
    this.errorMensaje = null;
    this.rutina = null;
    this.origenRespuesta = null;
    const profile = {
      ...this.perfil,
      nombre: this.perfil.nombre.trim() || "Socio",
    };
    this.routines
      .generarRutina(profile)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.cargando = false;
          if (response?.exito === true && validRoutine(response.data)) {
            this.rutina = response.data;
            this.origenRespuesta = response.origen || "unverified";
          } else {
            this.errorMensaje =
              response?.error ||
              "El servicio no devolvió una rutina personalizada válida. No mostramos un ejemplo genérico como resultado.";
          }
        },
        error: () => {
          this.cargando = false;
          this.errorMensaje =
            "No se pudo contactar al servicio de rutinas. Revisa la conexión con el servidor e inténtalo de nuevo.";
        },
      });
  }
  imprimirRutina() {
    const details = Array.from(
      this.host.nativeElement.querySelectorAll<HTMLDetailsElement>(
        ".routine-day",
      ),
    );
    const previous = details.map((item) => item.open);
    details.forEach((item) => (item.open = true));
    const restore = () =>
      details.forEach((item, index) => (item.open = previous[index]));
    window.addEventListener("afterprint", restore, { once: true });
    this.destroyRef.onDestroy(() =>
      window.removeEventListener("afterprint", restore),
    );
    window.print();
  }
  nuevaRutina() {
    this.rutina = null;
    this.errorMensaje = null;
    this.origenRespuesta = null;
  }
  private obtenerHora() {
    return new Date().toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  private scrollLog() {
    afterNextRender(
      () => {
        const log =
          this.host.nativeElement.querySelector<HTMLElement>(".chat-log");
        if (log) log.scrollTop = log.scrollHeight;
      },
      { injector: this.injector },
    );
  }
}
