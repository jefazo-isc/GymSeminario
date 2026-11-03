import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { BehaviorSubject, firstValueFrom } from "rxjs";
import { APP_ENDPOINTS } from "../../../core/config/app-endpoints";
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
  }

  private clearSession() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.userNameSubject.next(null);
    this.userRoleSubject.next(null);
    this.userUidSubject.next(null);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
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

  /** Google sign-in usando Google Identity Services (GIS) */
  async signInWithGoogle(): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const win = window as unknown as {
        google?: { accounts: { id: { initialize: (c: object) => void; prompt: () => void } } };
      };
      if (!win.google?.accounts?.id) {
        reject(new Error('Google Sign-In no disponible. Recarga la página.'));
        return;
      }
      win.google.accounts.id.initialize({
        client_id: '366321485374-143tbv091m8a3r6ajps5jsodpj9aeah0.apps.googleusercontent.com',
        callback: async (response: { credential: string }) => {
          try {
            const result = await this.signInWithGoogleCredential(response.credential);
            resolve(result);
          } catch (e) { reject(e); }
        },
        cancel_on_tap_outside: true,
      });
      win.google.accounts.id.prompt();
    });
  }

  async signInWithGoogleCredential(credential: string): Promise<unknown> {
    const resp = await firstValueFrom(
      this.http.post<AuthResponse>(`${this.backendUrl}/api/auth/google`, { credential })
    );
    this.saveSession(resp.token, resp.user);
    return resp;
  }

  /** Phone sign-in — envía código al backend (demo: usa 123456) */
  async sendPhoneCode(phone: string, _verifier: unknown): Promise<unknown> {
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
  async loadUserRole(_uid: string, _phone?: string, _email?: string): Promise<void> {
    const raw = localStorage.getItem(this.USER_KEY);
    if (!raw) return;
    try {
      const user: JwtUser = JSON.parse(raw);
      this.userRoleSubject.next(user.role);
    } catch { /* noop */ }
  }

  /** No aplica en JWT */
  async incrementarIntentosPorEmail(_email: string): Promise<void> { /* noop */ }

  async cambiarPassword(_user: LoginData, _nuevoPassword: string): Promise<void> {
    throw new Error("Cambia tu contraseña desde el panel de administración.");
  }

  /** No aplica en JWT — se reemplazó por verifyPhoneCode */
  async lookupPhone(_phone: string): Promise<void> { /* noop */ }

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
