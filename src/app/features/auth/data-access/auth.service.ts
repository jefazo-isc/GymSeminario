import { readStoredUser } from "../models/user.guard";
import { DestroyRef, inject, Injectable } from "@angular/core";
import { Auth, onAuthStateChanged } from "@angular/fire/auth";
import {
  collection,
  doc,
  Firestore,
  getDoc,
  getDocs,
  increment,
  query,
  setDoc,
  updateDoc,
  where,
} from "@angular/fire/firestore";
import {
  ApplicationVerifier,
  createUserWithEmailAndPassword,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  updatePassword,
} from "firebase/auth";
import { getFirestore, serverTimestamp } from "firebase/firestore";
import { BehaviorSubject } from "rxjs";
import { LoginData, UserRegistration } from "../models/user.model";
import type { SessionRepository } from "./session.repository";
export type { LoginData, UserRegistration as User } from "../models/user.model";
@Injectable({
  providedIn: "root",
})
export class AuthService implements SessionRepository {
  private _auth = inject(Auth);
  roles: string = "user";
  auth = this._auth;

  // ✅ BehaviorSubject para nombre de usuario
  private userNameSubject = new BehaviorSubject<string | null>(null);
  public userName$ = this.userNameSubject.asObservable(); // Exponemos como observable
  private userUidSubject = new BehaviorSubject<string | null>(null);
  public userUid$ = this.userUidSubject.asObservable();

  constructor(private firestore: Firestore) {
    const unsubscribe = onAuthStateChanged(this._auth, async (user) => {
      if (!user) {
        this.userNameSubject.next(null);
        this.userRoleSubject.next(null);
        this.userUidSubject.next(null);
        return;
      }

      this.userUidSubject.next(user.uid);
      const name = user.displayName || user.email || null;
      this.userNameSubject.next(name);

      // Cargar rol desde Firestore para cualquier método de inicio de sesión (Google, Email, etc.)
      await this.loadUserRole(user.uid, undefined, user.email || undefined);
    });
    inject(DestroyRef).onDestroy(unsubscribe);
  }

  //////////////admin
  private userRoleSubject = new BehaviorSubject<string | null>(null);
  public userRole$ = this.userRoleSubject.asObservable();

  public async loadUserRole(uid: string, phoneNumber?: string, email?: string) {
    try {
      // 1. Buscar en 'usuarios' por ID del documento
      const userRef = doc(this.firestore, "usuarios", uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = readStoredUser(userSnap.data());
        const role = data?.["role"] || "user";
        this.userRoleSubject.next(role);
        const nombre = data?.["nombre"];
        if (nombre && nombre.trim() !== "") {
          this.userNameSubject.next(nombre);
        }
        return;
      }

      // 2. Si no se encuentra por doc ID, buscar por campo 'uid'
      const usuariosRef = collection(this.firestore, "usuarios");
      const qUid = query(usuariosRef, where("uid", "==", uid));
      const snapUid = await getDocs(qUid);

      if (!snapUid.empty) {
        const data = readStoredUser(snapUid.docs[0].data());
        const role = data?.["role"] || "user";
        this.userRoleSubject.next(role);
        const nombre = data?.["nombre"];
        if (nombre && nombre.trim() !== "") {
          this.userNameSubject.next(nombre);
        }
        return;
      }

      // 3. Buscar por campo 'email' (por si el usuario admin fue registrado con ID aleatorio en Firestore)
      if (email) {
        const qEmail = query(usuariosRef, where("email", "==", email));
        const snapEmail = await getDocs(qEmail);

        if (!snapEmail.empty) {
          const docSnap = snapEmail.docs[0];
          const data = readStoredUser(docSnap.data());
          const role = data?.["role"] || "user";
          this.userRoleSubject.next(role);
          const nombre = data?.["nombre"];
          if (nombre && nombre.trim() !== "") {
            this.userNameSubject.next(nombre);
          }

          // Si el documento no tenía el uid guardado, actualizarlo para que quede vinculado
          if (!data?.["uid"]) {
            await updateDoc(docSnap.ref, { uid: uid });
          }
          return;
        }
      }

      // 4. Si viene phoneNumber, buscar en 'numeros'
      if (phoneNumber) {
        const numerosRef = doc(this.firestore, "numeros", phoneNumber);
        const numerosSnap = await getDoc(numerosRef);

        if (numerosSnap.exists()) {
          const numeroData = readStoredUser(numerosSnap.data());
          const nombre = numeroData?.["nombre"] || "USUARIO";
          this.userNameSubject.next(nombre);
          this.userRoleSubject.next("user");
          return;
        }
      }

      // Si no existe ningún registro, asignar 'user' por defecto
      this.userRoleSubject.next("user");
    } catch (err) {
      console.error("Error al cargar rol del usuario:", err);
      this.userRoleSubject.next("user");
    }
  }

  ///////////

  /**
   * Busca un documento en la colección 'usuarios' ignorando mayúsculas, minúsculas y espacios.
   */
  async buscarUsuarioDoc(email: string) {
    if (!email) return null;
    const emailNormalizado = email.trim();
    const emailLower = emailNormalizado.toLowerCase();
    const usuariosRef = collection(this.firestore, "usuarios");

    // 1. Coincidencia exacta
    try {
      const q = query(usuariosRef, where("email", "==", emailNormalizado));
      const snap = await getDocs(q);
      if (!snap.empty) return snap.docs[0];
    } catch (e) {
      console.warn("Error en búsqueda por email exacto:", e);
    }

    // 2. Coincidencia en minúsculas
    if (emailNormalizado !== emailLower) {
      try {
        const qLower = query(usuariosRef, where("email", "==", emailLower));
        const snapLower = await getDocs(qLower);
        if (!snapLower.empty) return snapLower.docs[0];
      } catch (e) {
        console.warn("Error en búsqueda por email minúsculas:", e);
      }
    }

    // 3. Búsqueda exhaustiva insensible a mayúsculas/minúsculas
    try {
      const allUsersSnap = await getDocs(usuariosRef);
      const found = allUsersSnap.docs.find((d) => {
        const dEmail = d.data()?.["email"];
        return (
          typeof dEmail === "string" &&
          dEmail.trim().toLowerCase() === emailLower
        );
      });
      if (found) return found;
    } catch (e) {
      console.warn("Error en búsqueda exhaustiva de usuario:", e);
    }

    return null;
  }

  /////////////intentos
  async incrementarIntentosPorEmail(email: string): Promise<void> {
    try {
      const docSnap = await this.buscarUsuarioDoc(email);

      if (docSnap) {
        const data = readStoredUser(docSnap.data());
        const intentosActuales = data["intentos"] ?? 0;
        const nuevosIntentos = intentosActuales + 1;

        await updateDoc(docSnap.ref, {
          intentos: nuevosIntentos,
          ultimoIntento: serverTimestamp(),
        });
      } else {
        console.warn(`No se encontró un usuario con el email: ${email}`);
      }
    } catch (err) {
      console.warn("Error incrementando intentos:", err);
    }
  }
  //////////////////////

  ///////////////cambiar clave

  async cambiarPassword(user: LoginData, nuevoPassword: string): Promise<void> {
    try {
      const email = user.email.trim();
      // 1. Autenticar al usuario con las credenciales actuales
      const credentials = await signInWithEmailAndPassword(
        this._auth,
        email,
        user.password,
      );

      // 2. Cambiar la contraseña si el login fue exitoso
      const currentUser = credentials.user;
      await updatePassword(currentUser, nuevoPassword);

      // 3. Resetear intentos en Firestore
      const docSnap = await this.buscarUsuarioDoc(email);
      if (docSnap) {
        await updateDoc(docSnap.ref, { intentos: 0 });
      }
    } catch (error) {
      console.error("Error al cambiar la contraseña:", error);
      throw error;
    }
  }
  ///////////////////////////////////////

  private updateUserName(user: FirebaseUser | null) {
    const name = user?.displayName || user?.email || null;
    this.userNameSubject.next(name);
  }

  async signUp(user: UserRegistration) {
    const email = user.email.trim();
    const credentials = await createUserWithEmailAndPassword(
      this._auth,
      email,
      user.password,
    );
    this.updateUserName(credentials.user);
    await setDoc(doc(this.firestore, "usuarios", credentials.user.uid), {
      uid: credentials.user.uid,
      email: email,
      nombre: user.nombre.trim(),
      telefono: "",
      intentos: 0,
      role: this.roles || "user",
    });
    await this.loadUserRole(credentials.user.uid, undefined, email);
    return credentials;
  }

  async signIn(user: LoginData) {
    const email = user.email.trim();
    const usuarioDoc = await this.buscarUsuarioDoc(email);

    if (usuarioDoc) {
      const usuarioData = readStoredUser(usuarioDoc.data());
      if ((usuarioData["intentos"] ?? 0) >= 3) {
        throw new Error(
          "Demasiados intentos fallidos. Cambia tu clave para poder ingresar.",
        );
      }
    }

    try {
      const credentials = await signInWithEmailAndPassword(
        this._auth,
        email,
        user.password,
      );

      if (usuarioDoc) {
        await updateDoc(usuarioDoc.ref, {
          intentos: 0,
          uid: credentials.user.uid,
        });

        const usuarioData = readStoredUser(usuarioDoc.data());
        const nombre =
          usuarioData["nombre"] ||
          credentials.user.displayName ||
          credentials.user.email ||
          null;
        this.userNameSubject.next(nombre);
        this.userRoleSubject.next(usuarioData["role"] || "user");
      } else {
        await this.loadUserRole(credentials.user.uid, undefined, email);
      }

      return credentials;
    } catch (error: unknown) {
      if (usuarioDoc) {
        await updateDoc(usuarioDoc.ref, {
          intentos: increment(1),
          ultimoIntento: serverTimestamp(),
        });
      }

      console.error("Error en signInWithEmailAndPassword:", error);
      const code =
        error && typeof error === "object" && "code" in error ? error.code : "";
      if (
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential" ||
        code === "auth/user-not-found"
      ) {
        throw new Error("Correo o contraseña incorrectos.");
      } else if (code === "auth/too-many-requests") {
        throw new Error(
          "Demasiados intentos. Por favor espera unos momentos o cambia tu clave.",
        );
      }
      throw error;
    }
  }

  async signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(this._auth, provider);
    const user = result.user;

    this.updateUserName(user);

    const db = getFirestore();
    const usuariosRef = collection(db, "usuarios");

    // Buscar si ya existe un usuario con ese email
    const q = query(usuariosRef, where("email", "==", user.email));
    const querySnapshot = await getDocs(q);

    // Si no existe, lo creamos vinculando user.uid como ID del documento
    if (querySnapshot.empty) {
      await setDoc(doc(db, "usuarios", user.uid), {
        uid: user.uid,
        email: user.email,
        nombre: user.displayName || "",
        intentos: 0,
        telefono: "",
        role: "user",
      });
      this.userRoleSubject.next("user");
    } else {
      // Si ya existe (ej: admin), recuperamos su rol real y reiniciamos intentos
      const docSnap = querySnapshot.docs[0];
      const data = readStoredUser(docSnap.data());
      const existingRole = data?.["role"] || "user";
      this.userRoleSubject.next(existingRole);

      await updateDoc(docSnap.ref, {
        intentos: 0,
        uid: user.uid,
      });
    }

    await this.loadUserRole(user.uid, undefined, user.email || undefined);
    return result;
  }

  cerrarSesion() {
    return signOut(this._auth)
      .then(() => {
        this.userNameSubject.next(null); // ✅ corregido
      })
      .catch((error) => {
        console.error("Error al cerrar sesión:", error);
      });
  }

  async getCurrentUser(): Promise<FirebaseUser | null> {
    await this.auth.authStateReady();
    return this.auth.currentUser;
  }

  sendPhoneCode(phone: string, verifier: ApplicationVerifier) {
    return signInWithPhoneNumber(this._auth, phone, verifier);
  }
  async lookupPhone(phone: string): Promise<void> {
    await getDocs(
      query(
        collection(this.firestore, "usuarios"),
        where("telefono", "==", phone),
      ),
    );
  }
}
