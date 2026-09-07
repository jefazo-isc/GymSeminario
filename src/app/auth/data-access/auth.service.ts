import { inject, Injectable } from '@angular/core';
import { Auth, User as FirebaseUser, onAuthStateChanged } from '@angular/fire/auth';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup, signOut,
  updatePassword,
  getAuth,
  sendEmailVerification
} from 'firebase/auth';
import { BehaviorSubject } from 'rxjs';
import {
  Firestore, doc, setDoc, getDocs, getDoc, updateDoc, collection, query, where, increment,
  serverTimestamp
} from '@angular/fire/firestore';
import { getFirestore, addDoc } from "firebase/firestore";
export interface User {
  email: string;
  password: string;
  nombre: string;
}

export interface LoginData {
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private _auth = inject(Auth);
  roles: string = "user";
  auth = getAuth();


  // ✅ BehaviorSubject para nombre de usuario
  private userNameSubject = new BehaviorSubject<string | null>(null);
  public userName$ = this.userNameSubject.asObservable(); // Exponemos como observable
  private userUidSubject = new BehaviorSubject<string | null>(null);
  public userUid$ = this.userUidSubject.asObservable();

  constructor(private firestore: Firestore) {
    onAuthStateChanged(this._auth, async (user) => {
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
  }



  //////////////admin
  private userRoleSubject = new BehaviorSubject<string | null>(null);
  public userRole$ = this.userRoleSubject.asObservable();

  public async loadUserRole(uid: string, phoneNumber?: string, email?: string) {
    try {
      // 1. Buscar en 'usuarios' por ID del documento
      const userRef = doc(this.firestore, 'usuarios', uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        const role = data?.['role'] || 'user';
        this.userRoleSubject.next(role);
        const nombre = data?.['nombre'];
        if (nombre && nombre.trim() !== '') {
          this.userNameSubject.next(nombre);
        }
        console.log('Rol de usuario cargado (por ID de doc):', role);
        return;
      }

      // 2. Si no se encuentra por doc ID, buscar por campo 'uid'
      const usuariosRef = collection(this.firestore, 'usuarios');
      const qUid = query(usuariosRef, where('uid', '==', uid));
      const snapUid = await getDocs(qUid);

      if (!snapUid.empty) {
        const data = snapUid.docs[0].data();
        const role = data?.['role'] || 'user';
        this.userRoleSubject.next(role);
        const nombre = data?.['nombre'];
        if (nombre && nombre.trim() !== '') {
          this.userNameSubject.next(nombre);
        }
        console.log('Rol de usuario cargado (por campo uid):', role);
        return;
      }

      // 3. Buscar por campo 'email' (por si el usuario admin fue registrado con ID aleatorio en Firestore)
      if (email) {
        const qEmail = query(usuariosRef, where('email', '==', email));
        const snapEmail = await getDocs(qEmail);

        if (!snapEmail.empty) {
          const docSnap = snapEmail.docs[0];
          const data = docSnap.data();
          const role = data?.['role'] || 'user';
          this.userRoleSubject.next(role);
          const nombre = data?.['nombre'];
          if (nombre && nombre.trim() !== '') {
            this.userNameSubject.next(nombre);
          }
          console.log('Rol de usuario cargado (por email):', email, 'Rol:', role);

          // Si el documento no tenía el uid guardado, actualizarlo para que quede vinculado
          if (!data?.['uid']) {
            await updateDoc(docSnap.ref, { uid: uid });
          }
          return;
        }
      }

      // 4. Si viene phoneNumber, buscar en 'numeros'
      if (phoneNumber) {
        const numerosRef = doc(this.firestore, 'numeros', phoneNumber);
        const numerosSnap = await getDoc(numerosRef);

        if (numerosSnap.exists()) {
          const numeroData = numerosSnap.data();
          const nombre = numeroData?.['nombre'] || 'USUARIO';
          this.userNameSubject.next(nombre);
          this.userRoleSubject.next('user');
          return;
        }
      }

      // Si no existe ningún registro, asignar 'user' por defecto
      this.userRoleSubject.next('user');
      console.log('Usuario no registrado previamente, rol asignado: user');
    } catch (err) {
      console.error('Error al cargar rol del usuario:', err);
      this.userRoleSubject.next('user');
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
    const usuariosRef = collection(this.firestore, 'usuarios');

    // 1. Coincidencia exacta
    try {
      const q = query(usuariosRef, where('email', '==', emailNormalizado));
      const snap = await getDocs(q);
      if (!snap.empty) return snap.docs[0];
    } catch (e) {
      console.warn('Error en búsqueda por email exacto:', e);
    }

    // 2. Coincidencia en minúsculas
    if (emailNormalizado !== emailLower) {
      try {
        const qLower = query(usuariosRef, where('email', '==', emailLower));
        const snapLower = await getDocs(qLower);
        if (!snapLower.empty) return snapLower.docs[0];
      } catch (e) {
        console.warn('Error en búsqueda por email minúsculas:', e);
      }
    }

    // 3. Búsqueda exhaustiva insensible a mayúsculas/minúsculas
    try {
      const allUsersSnap = await getDocs(usuariosRef);
      const found = allUsersSnap.docs.find(d => {
        const dEmail = d.data()?.['email'];
        return typeof dEmail === 'string' && dEmail.trim().toLowerCase() === emailLower;
      });
      if (found) return found;
    } catch (e) {
      console.warn('Error en búsqueda exhaustiva de usuario:', e);
    }

    return null;
  }

  /////////////intentos
  async incrementarIntentosPorEmail(email: string): Promise<void> {
    try {
      const docSnap = await this.buscarUsuarioDoc(email);

      if (docSnap) {
        const data = docSnap.data();
        const intentosActuales = data['intentos'] ?? 0;
        const nuevosIntentos = intentosActuales + 1;

        await updateDoc(docSnap.ref, {
          intentos: nuevosIntentos,
          ultimoIntento: serverTimestamp()
        });

        console.log(`Intentos para ${email}: ${nuevosIntentos}`);
      } else {
        console.warn(`No se encontró un usuario con el email: ${email}`);
      }
    } catch (err) {
      console.warn('Error incrementando intentos:', err);
    }
  }
  //////////////////////


  ///////////////cambiar clave

  async cambiarPassword(user: User, nuevoPassword: string): Promise<void> {
    try {
      const email = user.email.trim();
      // 1. Autenticar al usuario con las credenciales actuales
      const credentials = await signInWithEmailAndPassword(
        this._auth,
        email,
        user.password
      );

      // 2. Cambiar la contraseña si el login fue exitoso
      const currentUser = credentials.user;
      await updatePassword(currentUser, nuevoPassword);

      // 3. Resetear intentos en Firestore
      const docSnap = await this.buscarUsuarioDoc(email);
      if (docSnap) {
        await updateDoc(docSnap.ref, { intentos: 0 });
      }

      console.log('Contraseña actualizada correctamente.');
    } catch (error) {
      console.error('Error al cambiar la contraseña:', error);
      throw error;
    }
  }
  ///////////////////////////////////////

  private updateUserName(user: FirebaseUser | null) {
    const name = user?.displayName || user?.email || null;
    this.userNameSubject.next(name);
  }

  async signUp(user: User) {
    const email = user.email.trim();
    const credentials = await createUserWithEmailAndPassword(
      this._auth,
      email,
      user.password
    );
    this.updateUserName(credentials.user);
    await setDoc(doc(this.firestore, 'usuarios', credentials.user.uid), {
      uid: credentials.user.uid,
      email: email,
      nombre: user.nombre.trim(),
      telefono: '',
      intentos: 0,
      role: this.roles || 'user'
    });
    await this.loadUserRole(credentials.user.uid, undefined, email);
    return credentials;
  }

  async signIn(user: LoginData) {
    const email = user.email.trim();
    const usuarioDoc = await this.buscarUsuarioDoc(email);

    if (usuarioDoc) {
      const usuarioData = usuarioDoc.data();
      if ((usuarioData['intentos'] ?? 0) >= 3) {
        throw new Error('Demasiados intentos fallidos. Cambia tu clave para poder ingresar.');
      }
    }

    try {
      const credentials = await signInWithEmailAndPassword(
        this._auth,
        email,
        user.password
      );

      if (usuarioDoc) {
        await updateDoc(usuarioDoc.ref, {
          intentos: 0,
          uid: credentials.user.uid
        });

        const usuarioData = usuarioDoc.data();
        const nombre = usuarioData['nombre'] || credentials.user.displayName || credentials.user.email || null;
        this.userNameSubject.next(nombre);
        this.userRoleSubject.next(usuarioData['role'] || 'user');
      } else {
        await this.loadUserRole(credentials.user.uid, undefined, email);
      }

      return credentials;

    } catch (error: any) {
      if (usuarioDoc) {
        await updateDoc(usuarioDoc.ref, {
          intentos: increment(1),
          ultimoIntento: serverTimestamp()
        });
      }

      console.error('Error en signInWithEmailAndPassword:', error);
      if (error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential' || error?.code === 'auth/user-not-found') {
        throw new Error('Correo o contraseña incorrectos.');
      } else if (error?.code === 'auth/too-many-requests') {
        throw new Error('Demasiados intentos. Por favor espera unos momentos o cambia tu clave.');
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
        telefono: '',
        role: 'user'
      });
      this.userRoleSubject.next('user');
    } else {
      // Si ya existe (ej: admin), recuperamos su rol real y reiniciamos intentos
      const docSnap = querySnapshot.docs[0];
      const data = docSnap.data();
      const existingRole = data?.['role'] || 'user';
      this.userRoleSubject.next(existingRole);
      console.log('Usuario Google existente, rol cargado:', existingRole);

      await updateDoc(docSnap.ref, {
        intentos: 0,
        uid: user.uid
      });
    }

    await this.loadUserRole(user.uid, undefined, user.email || undefined);
    return result;
  }

  cerrarSesion() {
    return signOut(this._auth).then(() => {
      this.userNameSubject.next(null); // ✅ corregido
      console.log('Sesión cerrada correctamente.');
    }).catch((error) => {
      console.error('Error al cerrar sesión:', error);
    });
  }

  getCurrentUser() {
    return new Promise<any>((resolve) => {
      const unsubscribe = this.auth.onAuthStateChanged(user => {
        unsubscribe();
        resolve(user);
      });
    });
  }

}
