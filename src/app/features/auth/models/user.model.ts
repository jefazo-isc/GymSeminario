export interface UserRegistration {
  email: string;
  password: string;
  nombre: string;
}
export interface LoginData {
  email: string;
  password: string;
}
export interface SessionUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  phoneNumber: string | null;
}
export interface StoredUser {
  uid?: string;
  email?: string;
  nombre?: string;
  telefono?: string;
  role?: string;
  intentos?: number;
}
