import { InjectionToken, inject } from "@angular/core";
import {
  ApplicationVerifier,
  Auth,
  ConfirmationResult,
  User,
  UserCredential,
} from "firebase/auth";
import { Observable } from "rxjs";
import { LoginData, UserRegistration } from "../models/user.model";
import { AuthService } from "./auth.service";
export interface SessionRepository {
  auth: Auth;
  userName$: Observable<string | null>;
  userRole$: Observable<string | null>;
  userUid$: Observable<string | null>;
  getCurrentUser(): Promise<User | null>;
  signIn(data: LoginData): Promise<UserCredential>;
  signUp(data: UserRegistration): Promise<UserCredential>;
  signInWithGoogle(): Promise<UserCredential>;
  cerrarSesion(): Promise<void>;
  loadUserRole(uid: string, phone?: string, email?: string): Promise<void>;
  incrementarIntentosPorEmail(email: string): Promise<void>;
  cambiarPassword(user: LoginData, nuevoPassword: string): Promise<void>;
  sendPhoneCode(
    phone: string,
    verifier: ApplicationVerifier,
  ): Promise<ConfirmationResult>;
  lookupPhone(phone: string): Promise<void>;
}
export const SESSION = new InjectionToken<SessionRepository>(
  "SessionRepository",
  { providedIn: "root", factory: () => inject(AuthService) },
);
