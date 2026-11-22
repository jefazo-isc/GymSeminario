import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Capacitor } from "@capacitor/core";
import { BehaviorSubject, firstValueFrom } from "rxjs";
import { APP_ENDPOINTS } from "../../../core/config/app-endpoints";
import { NativeGoogleAuth } from "../../../core/mobile/google-auth.plugin";
import { LoginData, UserRegistration } from "../models/user.model";
import type { SessionRepository } from "./session.repository";

export type { LoginData, UserRegistration as User } from "../models/user.model";

interface JwtUser {
  uid: number | string;
  email: string;
  nombre: string;
  role: string;
}

interface AuthResponse {
  token: string;
  user: JwtUser;
}

// Stub mínimo para compatibilidad con CaptchaController (ya no usa Firebase)
const AUTH_STUB = {
  app: null,
  config: {},
  currentUser: null,
  languageCode: null,
  tenantId: null,
  settings: { appVerificationDisabledForTesting: false },
  onAuthStateChanged: () => () => {},
  onIdTokenChanged: () => () => {},
  beforeAuthStateChanged: () => () => {},
  setPersistence: async () => {},
  signOut: async () => {},
  updateCurrentUser: async () => {},
  useDeviceLanguage: () => {},
  name: "[DEFAULT]",
  emulatorConfig: null,
} as unknown;

@Injectable({ providedIn: "root" })
export class AuthService implements SessionRepository {
  private http = inject(HttpClient);
  private apiUrl = inject(APP_ENDPOINTS).notifications; // usa base de render

  // Stub para compatibilidad con componentes que usan service.auth (CaptchaController)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly auth = AUTH_STUB as any;

  private readonly TOKEN_KEY = "gym_jwt";
  private readonly USER_KEY = "gym_user";

  private userNameSubject = new BehaviorSubject<string | null>(null);
  public userName$ = this.userNameSubject.asObservable();

  private userRoleSubject = new BehaviorSubject<string | null>(null);
  public userRole$ = this.userRoleSubject.asObservable();

  private userUidSubject = new BehaviorSubject<string | null>(null);
  public userUid$ = this.userUidSubject.asObservable();

  constructor() {
    this.restoreSession();
  }

  private get backendUrl() {
    // Siempre apunta al backend de Render (notificaciones y auth comparten base)
    return this.apiUrl.replace(/\/api$/, "");
  }

  private restoreSession() {
    const raw = localStorage.getItem(this.USER_KEY);
    if (!raw) return;
    try {
      const user: JwtUser = JSON.parse(raw);
      this.userNameSubject.next(user.nombre);
      this.userRoleSubject.next(user.role);
      this.userUidSubject.next(String(user.uid));
    } catch {
      this.clearSession();
    }
  }

  private saveSession(token: string, user: JwtUser) {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.userNameSubject.next(user.nombre);
    this.userRoleSubject.next(user.role);
    this.userUidSubject.next(String(user.uid));

    // Si es un usuario que no es administrador, garantizar que no tenga suscripción activa previa
    const email = (user.email || "").toLowerCase().trim();
    const esAdmin =
      email === "guevara.cardona.yahir@gmail.com" ||
      email === "admin@gymseminario.com" ||
      user.role === "admin";
    if (!esAdmin) {
      const memRaw = localStorage.getItem("espacio_gym_membresia");
      if (memRaw) {
        try {
          const m = JSON.parse(memRaw);
          if (m.id === "MEM-849201" || m.id === "MEM-ADMIN-01") {
            m.estado = "Vencida";
            m.diasRestantes = 0;
            localStorage.setItem("espacio_gym_membresia", JSON.stringify(m));
          }
        } catch {
          /* noop */
        }
      }
    }
  }

  private clearSession() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    try {
      localStorage.removeItem("espacio_gym_membresia");
    } catch {
      /* noop */
    }
    this.userNameSubject.next(null);
    this.userRoleSubject.next(null);
    this.userUidSubject.next(null);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  upgradeToSubscriber(): void {
    const raw = localStorage.getItem(this.USER_KEY);
    if (!raw) return;
    try {
      const user: JwtUser = JSON.parse(raw);
      if (user.role !== "admin") {
        user.role = "subscriber";
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        this.userRoleSubject.next("subscriber");
      }
    } catch {
      /* noop */
    }
  }

  // ── Métodos públicos ────────────────────────────────────────────────────────

  async signIn(data: LoginData): Promise<unknown> {
    const resp = await firstValueFrom(
      this.http.post<AuthResponse>(`${this.backendUrl}/api/auth/login`, data)
    );
    this.saveSession(resp.token, resp.user);
    return resp;
  }

  async signUp(data: UserRegistration): Promise<unknown> {
    const resp = await firstValueFrom(
      this.http.post<AuthResponse>(`${this.backendUrl}/api/auth/register`, data)
    );
    this.saveSession(resp.token, resp.user);
    return resp;
  }

  /** Google sign-in: nativo en Capacitor Android o Google Identity Services (GIS) en web */
  async signInWithGoogle(): Promise<unknown> {
    if (Capacitor.isNativePlatform()) {
      const user = await NativeGoogleAuth.signIn();
      const idToken = user.authentication?.idToken || user.idToken;
      if (!idToken && !user.email) {
        throw new Error("No se pudo obtener la cuenta de Google.");
      }
      if (idToken) {
        try {
          return await this.signInWithGoogleCredential(idToken);
        } catch (backendError) {
          console.warn("Backend auth failed, using Google native verified session:", backendError);
        }
      }
      if (user.email) {
        const email = user.email.toLowerCase().trim();
        const esAdmin = email === "guevara.cardona.yahir@gmail.com" || email === "admin@gymseminario.com";
        const fallbackUser: JwtUser = {
          uid: user.id || "google-" + Date.now(),
          email,
          nombre: user.displayName || email.split("@")[0],
          role: esAdmin ? "admin" : "user",
        };
        this.saveSession("native-google-" + Date.now(), fallbackUser);
        return { token: "native-google", user: fallbackUser };
      }
    }

    return new Promise((resolve, reject) => {
      const win = window as unknown as {
        google?: {
          accounts: {
            id: {
              initialize: (c: object) => void;
              prompt: (
                cb?: (notification: {
                  isNotDisplayed?: () => boolean;
                  isSkippedMoment?: () => boolean;
                  isDismissedMoment?: () => boolean;
                }) => void
              ) => void;
            };
          };
        };
      };
      if (!win.google?.accounts?.id) {
        reject(new Error('Google Sign-In no disponible. Recarga la página.'));
        return;
      }
      let settled = false;
      win.google.accounts.id.initialize({
        client_id: '284503632870-hup11ff07or46r457spa5bj42nr26rdt.apps.googleusercontent.com',
        callback: async (response: { credential: string }) => {
          settled = true;
          try {
            const result = await this.signInWithGoogleCredential(response.credential);
            resolve(result);
          } catch (e) { reject(e); }
        },
        cancel_on_tap_outside: true,
      });
      win.google.accounts.id.prompt((notification) => {
        if (
          !settled &&
          (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.())
        ) {
          settled = true;
          reject(
            new Error(
              'El navegador bloqueó la ventana emergente de Google. Usa el botón de Google en la página de Ingresar o entra con tu correo.'
            )
          );
        }
      });
    });
  }

  async signInWithGoogleCredential(credential: string): Promise<unknown> {
    try {
      const resp = await firstValueFrom(
        this.http.post<AuthResponse>(`${this.backendUrl}/api/auth/google`, {
          credential,
        }),
      );
      const email = resp.user?.email?.toLowerCase().trim();
      const esAdmin =
        email === "guevara.cardona.yahir@gmail.com" ||
        email === "admin@gymseminario.com";
      if (!esAdmin && resp.user) {
        resp.user.role = "user";
      }
      this.saveSession(resp.token, resp.user);
      return resp;
    } catch {
      // Decodificación directa del token JWT de Google si el backend está en reposo o offline
      const payload = JSON.parse(
        decodeURIComponent(
          atob(credential.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join(""),
        ),
      );
      const email = (payload.email || "").toLowerCase().trim();
      const esAdmin =
        email === "guevara.cardona.yahir@gmail.com" ||
        email === "admin@gymseminario.com";
      const fallbackUser: JwtUser = {
        uid: payload.sub || "google-" + Date.now(),
        email,
        nombre: payload.name || email.split("@")[0],
        role: esAdmin ? "admin" : "user",
      };
      const token = "google-web-" + Date.now();
      this.saveSession(token, fallbackUser);
      return { token, user: fallbackUser };
    }
  }

  /** Phone sign-in — envía código al backend (demo: usa 123456) */
  async sendPhoneCode(phone: string, ..._unused: unknown[]): Promise<unknown> {
    void _unused;
    return firstValueFrom(
      this.http.post<{ ok: boolean; mensaje: string }>(`${this.backendUrl}/api/auth/phone`, { phone })
    );
  }

  async verifyPhoneCode(phone: string, code: string): Promise<unknown> {
    const resp = await firstValueFrom(
      this.http.post<AuthResponse>(`${this.backendUrl}/api/auth/phone`, { phone, code })
    );
    this.saveSession(resp.token, resp.user);
    return resp;
  }

  async cerrarSesion(): Promise<void> {
    this.clearSession();
  }

  async getCurrentUser(): Promise<null> {
    return null;
  }

  /** No aplica en JWT — mantiene compatibilidad de interfaz */
  async loadUserRole(..._args: unknown[]): Promise<void> {
    void _args;
    const raw = localStorage.getItem(this.USER_KEY);
    if (!raw) return;
    try {
      const user: JwtUser = JSON.parse(raw);
      this.userRoleSubject.next(user.role);
    } catch { /* noop */ }
  }

  /** No aplica en JWT */
  async incrementarIntentosPorEmail(..._args: unknown[]): Promise<void> {
    void _args;
  }

  async cambiarPassword(..._args: unknown[]): Promise<void> {
    void _args;
    throw new Error("Cambia tu contraseña desde el panel de administración.");
  }

  /** No aplica en JWT — se reemplazó por verifyPhoneCode */
  async lookupPhone(..._args: unknown[]): Promise<void> {
    void _args;
  }

  // ── Admin helpers ───────────────────────────────────────────────────────────

  async listarUsuarios(): Promise<JwtUser[]> {
    const token = this.getToken();
    return firstValueFrom(
      this.http.get<JwtUser[]>(`${this.backendUrl}/api/auth/users`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    );
  }

  async setRol(userId: string | number, role: string): Promise<void> {
    const token = this.getToken();
    await firstValueFrom(
      this.http.post(`${this.backendUrl}/api/auth/set-role`, { userId, role }, {
        headers: { Authorization: `Bearer ${token}` },
      })
    );
  }
}
