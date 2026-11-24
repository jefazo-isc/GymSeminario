import {
  calculateBmi,
  createProfileDraft,
} from "../../../profile/models/profile.model";
import { Observable, Subscription } from "rxjs";
import { ACTIVITY } from "../../../activity/data-access/activity.repository";
import {
  SesionHistorial,
  WorkoutLogEntry,
} from "../../../activity/models/sesion.model";
import { RequestState } from "../../../../core/data-access/request-state";
import { RequestStateComponent } from "../../../../shared/ui/request-state/request-state.component";
import { CommonModule } from "@angular/common";
import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  NgZone,
  OnInit,
  afterNextRender,
  inject,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule, NgForm } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { authErrorMessage } from "../../../../core/auth/auth-feedback";
import {
  hasRoleSubscriptionBypass,
  isMembershipActive,
  isTestEnvironment,
  isTrainerOrAdminUser,
  readGymUser,
} from "../../../../core/auth/route.guards";
import { ButtonDirective } from "../../../../shared/ui/button.directive";
import { IconComponent } from "../../../../shared/ui/icon/icon.component";
import { MarkdownPipe } from "../../../../shared/pipes/markdown.pipe";
import { SESSION } from "../../../auth/data-access/session.repository";
import { MEMBERSHIPS } from "../../../memberships/data-access/membership.repository";
import { Membresia } from "../../../memberships/models/membresia.model";
import { PROFILES } from "../../../profile/data-access/profile.repository";
import { COACH } from "../../data-access/coach.repository";
import { validRoutine } from "../../models/rutina.guard";
import {
  CoachChatContext,
  CoachInfo,
  CoachUserTelemetry,
  CoachWorkoutSummary,
  MensajeChat,
  PerfilSocio,
  RutinaData,
} from "../../models/rutina.model";
export { validRoutine } from "../../models/rutina.guard";
const COACH_SPEECH_TUNING: Record<string, { pitch: number; rate: number }> = {
  temach: { pitch: 0.78, rate: 1.04 },
  arnold: { pitch: 0.68, rate: 0.92 },
  barbara: { pitch: 1.24, rate: 1.12 },
  patricio: { pitch: 0.84, rate: 0.86 },
  chavo: { pitch: 1.32, rate: 1.06 },
};

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
    MarkdownPipe,
  ],
  templateUrl: "./coach-ia.component.html",
  styleUrl: "./coach-ia.component.css",
})
export class CoachIaComponent implements OnInit {
  private routines = inject(COACH);
  private auth = inject(SESSION);
  private profiles = inject(PROFILES);
  private activity = inject(ACTIVITY, { optional: true });
  private memberships = inject(MEMBERSHIPS, { optional: true });
  private router = inject(Router, { optional: true });
  private destroyRef = inject(DestroyRef);
  private host: ElementRef<HTMLElement> = inject(ElementRef);
  private injector = inject(Injector);
  private ngZone = inject(NgZone);
  pestanaActiva: "rutina" | "chat" = "rutina";
  usuarioAutenticado = false;
  tieneSuscripcion = false;
  esEntrenadorOAdmin = false;
  modoEntrenador = false;
  clientEmail = "";
  savedRoutineId: string | number | null = null;
  routineFeedback = "";
  routineSaving = false;
  editingRoutine = false;
  private rolConAcceso = false;
  private esRecepcionPura = false;
  private membresiaActiva = false;
  private currentMembership: Membresia | null = null;
  usuarioNombre: string | null = null;
  cargandoAuth = false;
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
  autoVoz = false;
  reproduciendoSaludo = false;
  historialSesiones: SesionHistorial[] = [];
  workoutLogs: WorkoutLogEntry[] = [];
  totalAsistencias = 0;
  pesoTotalLevantadoKg = 0;
  pesoMaximoKg = 0;
  ejercicioRecord = "";
  imcActual = 0;
  private failedText = "";
  private objectUrls: string[] = [];
  objetivos = [
    "Ganancia muscular",
    "Pérdida de grasa / Definición",
    "Fuerza máxima",
    "Acondicionamiento físico",
    "Tonificación general",
  ];
  opcionesDias = [2, 3, 4, 5, 6];
  ngOnInit() {
    this.autoVoz = this.routines.leerPreferenciaAutoVoz?.() ?? false;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.getVoices();
      } catch {
        // Ignorar si speechSynthesis no está disponible
      }
    }
    this.verificarAutenticacion();
    this.observarMembresia();
    this.cargarCoaches();
    this.loadProfile();
    this.observarActividadUsuario();
    if (this.tieneSuscripcion && readGymUser()) {
      this.cargarRutinaGuardada();
      if (!isTestEnvironment()) {
        void this.activity?.syncFromServer?.();
      }
    }
    this.destroyRef.onDestroy(() => {
      this.profileStream?.unsubscribe();
      this.detenerTodoAudio();
      this.limpiarObjectUrls();
    });
  }

  private observarActividadUsuario() {
    this.activity?.historial$
      ?.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((rows) => {
        this.historialSesiones = Array.isArray(rows) ? rows : [];
        this.recalcularTelemetria();
      });
    this.activity?.workoutLogs$
      ?.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((logs) => {
        this.workoutLogs = Array.isArray(logs) ? logs : [];
        this.recalcularTelemetria();
      });
  }

  private recalcularTelemetria() {
    this.totalAsistencias = this.historialSesiones.filter(
      (s) => s.estado === "Asistida",
    ).length;
    let totalVolumen = 0;
    let maxPeso = 0;
    let topEjercicio = "";
    for (const log of this.workoutLogs) {
      totalVolumen +=
        Number(log.series || 0) *
        Number(log.repeticiones || 0) *
        Number(log.pesoKg || 0);
      if (Number(log.pesoKg || 0) > maxPeso) {
        maxPeso = Number(log.pesoKg || 0);
        topEjercicio = log.ejercicio;
      }
    }
    this.pesoTotalLevantadoKg = Math.round(totalVolumen * 100) / 100;
    this.pesoMaximoKg = Math.round(maxPeso * 100) / 100;
    this.ejercicioRecord = topEjercicio;
    this.imcActual = calculateBmi(this.perfil.peso, this.perfil.altura);
  }
  private observarMembresia() {
    this.memberships?.membresiaActual$
      ?.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((mem) => {
        this.currentMembership = mem;
        this.membresiaActiva = isMembershipActive(mem);
        this.actualizarEstadoSuscripcion();
      });
  }
  private actualizarEstadoSuscripcion() {
    this.tieneSuscripcion =
      this.usuarioAutenticado &&
      !this.esRecepcionPura &&
      (this.rolConAcceso || this.membresiaActiva);
    if (!isTestEnvironment() && !this.tieneSuscripcion) {
      void this.router?.navigate(["/membresias"]);
    }
  }

  private isPureReceptionUser(
    user: { email?: string | null; role?: string | null } | null,
  ): boolean {
    if (!user) return false;
    const email = (user.email ?? "").toLowerCase().trim();
    const role = (user.role ?? "").toLowerCase().trim();
    if (
      email === "guevara.cardona.yahir@gmail.com" ||
      email === "admin@gymseminario.com" ||
      role === "admin"
    ) {
      return false;
    }
    return (
      role === "reception" ||
      role === "receptionist" ||
      role === "recepcionista" ||
      role === "staff"
    );
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
          this.recalcularTelemetria();
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
    this.cargandoAuth = false;
    const u = readGymUser();
    if (u) {
      this.usuarioAutenticado = true;
      this.usuarioNombre = u.nombre || u.email || "Sesión activa";
      this.esRecepcionPura = this.isPureReceptionUser(u);
      this.rolConAcceso = !this.esRecepcionPura && hasRoleSubscriptionBypass(u);
      this.esEntrenadorOAdmin = !this.esRecepcionPura && isTrainerOrAdminUser(u);
      if (u.nombre) {
        Promise.resolve(this.profiles.actualizarNombre(u.nombre)).catch(() => {
          this.errorMensaje =
            "Tu sesión está activa, pero no pudimos guardar el nombre en el perfil local.";
        });
      }
    } else {
      this.usuarioAutenticado = false;
      this.usuarioNombre = null;
      this.esRecepcionPura = false;
      this.rolConAcceso = false;
      this.esEntrenadorOAdmin = false;
    }
    this.actualizarEstadoSuscripcion();

    if (this.listeningToName) return;
    this.listeningToName = true;
    this.auth.userName$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((name) => {
        const current = readGymUser();
        if (name) {
          if (current || isTestEnvironment()) {
            this.usuarioAutenticado = true;
            this.usuarioNombre = name;
          }
        } else if (!current) {
          this.usuarioAutenticado = false;
          this.usuarioNombre = null;
          this.esRecepcionPura = false;
          this.rolConAcceso = false;
          this.esEntrenadorOAdmin = false;
        }
        this.actualizarEstadoSuscripcion();
      });

    const authWithRole = this.auth as {
      userRole$?: Observable<string | null>;
    };
    authWithRole.userRole$
      ?.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((role) => {
        if (!role) return;
        const candidate = {
          uid: null,
          nombre: null,
          email: readGymUser()?.email ?? null,
          role,
        };
        if (this.isPureReceptionUser(candidate)) {
          this.esRecepcionPura = true;
          this.rolConAcceso = false;
          this.esEntrenadorOAdmin = false;
        } else if (hasRoleSubscriptionBypass(candidate)) {
          this.esRecepcionPura = false;
          this.rolConAcceso = true;
          this.esEntrenadorOAdmin = isTrainerOrAdminUser(candidate);
        }
        this.actualizarEstadoSuscripcion();
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
          if (this.coaches.length && !this.coachActivo) {
            const preferred =
              this.coaches.find((c) => c.id === "temach") ?? this.coaches[0];
            this.seleccionarCoach(preferred);
          }
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

  get coachesPersonalizados(): CoachInfo[] {
    return this.coaches.filter((c) => Boolean(c.personalizado));
  }

  get coachesPersonajes(): CoachInfo[] {
    return this.coaches.filter((c) => !c.personalizado);
  }

  coachTieneVozIntro(coach: CoachInfo | null): boolean {
    return Boolean(coach && coach.hasIntroAudio !== false);
  }

  coachTieneVozChat(coach: CoachInfo | null): boolean {
    return Boolean(
      coach && coach.hasVoice !== false && coach.hasIntroAudio !== false,
    );
  }

  abrirPestanaRutina() {
    this.detenerTodoAudio();
    this.pestanaActiva = "rutina";
  }

  abrirPestanaChat() {
    this.pestanaActiva = "chat";
    if (this.coachActivo && this.coachTieneVozIntro(this.coachActivo)) {
      this.detenerTodoAudio();
      this.reproducirVozCoach(this.coachActivo.id);
    }
  }
  seleccionarCoach(coach: CoachInfo, fromUserClick = false) {
    if (this.enviandoMensaje) return;
    this.detenerTodoAudio();
    this.coachActivo = coach;
    this.mensajes = [];
    this.chatError = "";
    this.failedText = "";
    if (fromUserClick && this.coachTieneVozIntro(coach)) {
      this.reproducirVozCoach(coach.id);
    }
  }

  private audioActual: HTMLAudioElement | null = null;
  reproducirVozCoach(coachId: string) {
    try {
      if (this.reproduciendoSaludo) {
        this.detenerTodoAudio();
        return;
      }
      this.detenerTodoAudio();
      const audioUrl = `audio/coaches/${coachId}.mp3?v=2`;
      const audio = new Audio(audioUrl);
      this.audioActual = audio;
      this.reproduciendoSaludo = true;
      const finalizar = () =>
        this.ngZone.run(() => {
          if (this.audioActual === audio) {
            this.audioActual = null;
          }
          this.reproduciendoSaludo = false;
        });
      audio.onended = finalizar;
      audio.onerror = finalizar;
      audio.play().catch(finalizar);
    } catch {
      this.reproduciendoSaludo = false;
    }
  }

  toggleAutoVoz() {
    this.autoVoz = !this.autoVoz;
    this.routines.guardarPreferenciaAutoVoz?.(this.autoVoz);
    if (!this.autoVoz) {
      this.detenerTodoAudio();
    }
  }

  detenerTodoAudio() {
    if (this.audioActual) {
      this.audioActual.onended = null;
      this.audioActual.onerror = null;
      this.audioActual.pause();
      this.audioActual = null;
    }
    this.reproduciendoSaludo = false;
    for (const msg of this.mensajes) {
      msg.reproduciendo = false;
      msg.cargandoAudio = false;
    }
    if (
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      (window.speechSynthesis.speaking || window.speechSynthesis.pending)
    ) {
      window.speechSynthesis.cancel();
    }
  }

  alternarVozMensaje(message: MensajeChat) {
    if (message.cargandoAudio) return;
    if (message.reproduciendo) {
      this.detenerTodoAudio();
      return;
    }
    this.detenerTodoAudio();

    const coachId = message.coachId || this.coachActivo?.id || "temach";
    if (message.audioSrc) {
      this.reproducirSrcEnMensaje(message, message.audioSrc, coachId);
      return;
    }

    if (!this.routines.sintetizarVozCoach) {
      this.reproducirFallbackWebSpeech(message, coachId);
      return;
    }

    // Preservar gesto de usuario en el elemento Audio antes de la llamada asíncrona HTTP
    const blessedAudio = typeof Audio !== "undefined" ? new Audio() : null;
    if (blessedAudio) {
      blessedAudio.preload = "auto";
      this.audioActual = blessedAudio;
    }

    message.cargandoAudio = true;
    this.routines
      .sintetizarVozCoach(coachId, message.texto)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          message.cargandoAudio = false;
          if (blessedAudio && this.audioActual !== blessedAudio) return;
          if (res?.exito && res.audioBase64) {
            const url = this.decodeBase64ToBlobUrl(
              res.audioBase64,
              res.mimeType || "audio/wav",
            );
            if (url) {
              this.objectUrls.push(url);
              message.audioSrc = url;
              message.audioOrigen = res.origen || "chatterbox";
              this.reproducirSrcEnMensaje(message, url, coachId, blessedAudio);
              return;
            }
          }
          if (this.audioActual === blessedAudio) this.audioActual = null;
          this.reproducirFallbackWebSpeech(message, coachId);
        },
        error: () => {
          message.cargandoAudio = false;
          if (blessedAudio && this.audioActual !== blessedAudio) return;
          if (this.audioActual === blessedAudio) this.audioActual = null;
          this.reproducirFallbackWebSpeech(message, coachId);
        },
      });
  }

  private reproducirSrcEnMensaje(
    message: MensajeChat,
    src: string,
    coachId: string,
    existingAudio?: HTMLAudioElement | null,
  ) {
    try {
      const audio = existingAudio ?? new Audio();
      audio.src = src;
      this.audioActual = audio;
      message.reproduciendo = true;
      const finalizar = () =>
        this.ngZone.run(() => {
          if (this.audioActual === audio) {
            this.audioActual = null;
          }
          message.reproduciendo = false;
        });
      audio.onended = finalizar;
      audio.onerror = finalizar;
      audio.play().catch(() =>
        this.ngZone.run(() => {
          if (this.audioActual === audio) {
            this.audioActual = null;
          }
          message.reproduciendo = false;
          this.reproducirFallbackWebSpeech(message, coachId);
        }),
      );
    } catch {
      message.reproduciendo = false;
      this.reproducirFallbackWebSpeech(message, coachId);
    }
  }

  private reproducirFallbackWebSpeech(message: MensajeChat, coachId: string) {
    if (
      typeof window === "undefined" ||
      typeof SpeechSynthesisUtterance === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      return;
    }
    let cleanText = message.texto
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/^\|.*\|$/gm, " ")
      .replace(/^[\s\-:|]+$/gm, " ")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/[*_`~#>|]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!cleanText) return;

    if (cleanText.length > 480) {
      const sliced = cleanText.slice(0, 480);
      const lastEnd = Math.max(
        sliced.lastIndexOf("."),
        sliced.lastIndexOf("!"),
        sliced.lastIndexOf("?"),
      );
      cleanText =
        lastEnd > 220 ? sliced.slice(0, lastEnd + 1).trim() : `${sliced.trim()}.`;
    }

    const tuning = COACH_SPEECH_TUNING[coachId] || { pitch: 1, rate: 1 };
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "es-MX";
    utterance.pitch = tuning.pitch;
    utterance.rate = tuning.rate;
    const spanishVoice = window.speechSynthesis
      .getVoices()
      .find((v) => v.lang.toLowerCase().startsWith("es"));
    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    message.audioOrigen = "local";
    message.reproduciendo = true;
    const finalizar = () =>
      this.ngZone.run(() => {
        message.reproduciendo = false;
      });
    utterance.onend = finalizar;
    utterance.onerror = finalizar;
    try {
      window.speechSynthesis.speak(utterance);
    } catch {
      message.reproduciendo = false;
    }
  }

  private decodeBase64ToBlobUrl(base64: string, mimeType: string): string | null {
    if (typeof window === "undefined" || typeof URL === "undefined") return null;
    try {
      const cleanB64 = base64.replace(/\s+/g, "");
      const binary = atob(cleanB64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mimeType });
      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  }

  private limpiarObjectUrls() {
    if (typeof URL === "undefined") return;
    for (const url of this.objectUrls) {
      URL.revokeObjectURL(url);
    }
    this.objectUrls = [];
  }
  enviarMensaje(retry = false) {
    if (!this.usuarioAutenticado || !this.tieneSuscripcion) {
      this.chatError =
        "Requiere una membresía activa para conversar con el Coach IA.";
      return;
    }
    if (
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
    const coachIdActual = this.coachActivo.id;
    const historialLimpio: MensajeChat[] = this.mensajes.map(
      ({ remitente, texto, hora }) => ({ remitente, texto, hora }),
    );
    this.routines
      .enviarMensajeChat(
        coachIdActual,
        text,
        historialLimpio,
        this.rutina,
        this.perfil,
        this.buildChatContext(),
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
            const nuevoMensaje: MensajeChat = {
              remitente: "coach",
              texto: response.respuesta,
              hora: this.obtenerHora(),
              coachId: coachIdActual,
              hasVoice: this.coachTieneVozChat(this.coachActivo),
            };
            this.mensajes.push(nuevoMensaje);
            this.failedText = "";
            this.scrollLog();
            if (this.autoVoz && nuevoMensaje.hasVoice !== false) {
              this.alternarVozMensaje(nuevoMensaje);
            }
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
    if (!this.tieneSuscripcion) {
      this.errorMensaje =
        "Necesitas una membresía activa para generar rutinas con IA.";
      return;
    }
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
            this.origenRespuesta = response.origen
              ? response.origen.toLowerCase()
              : "unverified";
            this.persistGeneratedRoutine(response.data);
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
    this.savedRoutineId = null;
    this.editingRoutine = false;
    this.routineFeedback = "";
    this.errorMensaje = null;
    this.origenRespuesta = null;
  }

  cargarRutinaGuardada(targetEmail?: string): void {
    if (!this.routines.getRoutines) return;
    this.routineFeedback = "";
    this.routines
      .getRoutines(targetEmail)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (records) => {
          if (records.length) {
            this.rutina = structuredClone(records[0].rutina);
            this.savedRoutineId = records[0].id;
            this.origenRespuesta = "cache";
            if (targetEmail) {
              this.routineFeedback = `Rutina cargada para ${targetEmail}.`;
            }
          } else if (targetEmail) {
            this.rutina = null;
            this.savedRoutineId = null;
            this.routineFeedback = `No hay rutina guardada para ${targetEmail}. Puedes generar o crear una nueva.`;
          }
        },
        error: () => {
          if (targetEmail) {
            this.routineFeedback = `No se pudo consultar la rutina de ${targetEmail}.`;
          }
        },
      });
  }

  guardarRutinaActual(): void {
    if (!this.rutina || this.routineSaving) return;
    const targetEmail = this.modoEntrenador ? this.clientEmail.trim() : undefined;
    if (this.modoEntrenador && !targetEmail) {
      this.routineFeedback = "Ingresa el correo del socio para asignar la rutina.";
      return;
    }
    const payload = {
      rutina: this.rutina,
      targetEmail,
      assignedBy: readGymUser()?.email || undefined,
    };
    const op$ =
      this.savedRoutineId && this.routines.updateRoutine
        ? this.routines.updateRoutine(this.savedRoutineId, payload)
        : this.routines.saveRoutine?.(payload);
    if (!op$) return;

    this.routineSaving = true;
    this.routineFeedback = "";
    op$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (saved) => {
        this.routineSaving = false;
        this.savedRoutineId = saved.id;
        this.editingRoutine = false;
        this.routineFeedback = targetEmail
          ? `Rutina asignada y guardada para ${targetEmail}.`
          : "Rutina guardada en tu cuenta.";
      },
      error: () => {
        this.routineSaving = false;
        this.routineFeedback = "No se pudo guardar la rutina en el servidor.";
      },
    });
  }

  private persistGeneratedRoutine(rutina: RutinaData): void {
    if (!this.routines.saveRoutine || !readGymUser()) return;
    const targetEmail =
      this.modoEntrenador && this.clientEmail.trim()
        ? this.clientEmail.trim()
        : undefined;
    this.routines
      .saveRoutine({
        rutina,
        targetEmail,
        assignedBy: readGymUser()?.email || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (saved) => {
          this.savedRoutineId = saved.id;
        },
        error: () => undefined,
      });
  }

  private buildChatContext(): CoachChatContext {
    this.recalcularTelemetria();
    const mem = this.currentMembership;
    const membershipSummary = mem
      ? `Plan: ${mem.nombrePlan} (${mem.periodo}), Estado: ${mem.estado}, Vigencia hasta: ${mem.fechaFin}`
      : "Membresía activa verificada";
    const equipmentContext =
      "Equipamiento disponible en espacioGYM GROM 21: área de peso libre (barras olímpicas, mancuernas, rack de sentadillas), poleas y máquinas guiadas, bicicletas de spinning, zona funcional CrossFit, costales de boxeo y tapetes de yoga.";
    const volumenPorGrupoMuscular: Record<string, number> = {};
    const ultimosLevantamientos: CoachWorkoutSummary[] = this.workoutLogs
      .slice(0, 12)
      .map((l) => {
        const vol =
          Math.round(
            Number(l.series || 0) *
              Number(l.repeticiones || 0) *
              Number(l.pesoKg || 0) *
              100,
          ) / 100;
        const grupo = l.grupoMuscular || "General";
        volumenPorGrupoMuscular[grupo] =
          Math.round(((volumenPorGrupoMuscular[grupo] || 0) + vol) * 100) / 100;
        return {
          ejercicio: l.ejercicio,
          grupoMuscular: grupo,
          series: Number(l.series || 0),
          repeticiones: Number(l.repeticiones || 0),
          pesoKg: Number(l.pesoKg || 0),
          volumenKg: vol,
          fecha: l.fecha,
          ...(l.rpe !== undefined ? { rpe: l.rpe } : {}),
        };
      });

    const asistencias = this.historialSesiones.filter(
      (s) => s.estado === "Asistida",
    );
    const reservas = this.historialSesiones.filter(
      (s) => s.estado === "Reservada",
    );

    const userTelemetry: CoachUserTelemetry = {
      asistencia: {
        totalAsistencias: asistencias.length,
        totalReservas: reservas.length,
        asistenciasRecientes: asistencias.slice(0, 10).map((s) => ({
          clase: s.clase,
          fecha: s.fecha,
          turno: s.turno,
          estado: s.estado,
        })),
      },
      recuentoPeso: {
        pesoCorporalKg: Number(this.perfil.peso || 0),
        alturaCm: Number(this.perfil.altura || 0),
        imc: this.imcActual,
        totalRegistrosEntrenamiento: this.workoutLogs.length,
        pesoTotalLevantadoKg: this.pesoTotalLevantadoKg,
        pesoMaximoKg: this.pesoMaximoKg,
        ejercicioRecord: this.ejercicioRecord,
        volumenPorGrupoMuscular,
        ultimosLevantamientos,
      },
    };
    return { membershipSummary, equipmentContext, userTelemetry };
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
