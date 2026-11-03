import { InjectionToken, inject } from "@angular/core";
import { Observable } from "rxjs";
import { LoginData, UserRegistration } from "../models/user.model";
import { AuthService } from "./auth.service";

export interface SessionRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  auth: any; // stub para compatibilidad con CaptchaController
  userName$: Observable<string | null>;
  userRole$: Observable<string | null>;
  userUid$: Observable<string | null>;
  getCurrentUser(): Promise<null>;
  signIn(data: LoginData): Promise<unknown>;
  signUp(data: UserRegistration): Promise<unknown>;
  signInWithGoogle(): Promise<unknown>;
  cerrarSesion(): Promise<void>;
  loadUserRole(uid: string, phone?: string, email?: string): Promise<void>;
  incrementarIntentosPorEmail(email: string): Promise<void>;
  cambiarPassword(user: LoginData, nuevoPassword: string): Promise<void>;
  sendPhoneCode(phone: string, verifier: unknown): Promise<unknown>;
  lookupPhone(phone: string): Promise<void>;
}

export const SESSION = new InjectionToken<SessionRepository>(
  "SessionRepository",
  { providedIn: "root", factory: () => inject(AuthService) },
);
