import { inject, Injectable } from '@angular/core';
import { Auth, User as FirebaseUser, onAuthStateChanged } from '@angular/fire/auth';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,signOut,
  updatePassword,
  getAuth,
  sendEmailVerification
} from 'firebase/auth';
import { BehaviorSubject } from 'rxjs';
import { Firestore, doc, setDoc,getDocs, getDoc, updateDoc, collection, query, where, increment,
  serverTimestamp } from '@angular/fire/firestore';
import { getFirestore,addDoc } from "firebase/firestore";
export interface User {
  email: string;
  password: string;
  nombre: string;
}

export interface LoginData{
  email:string;
  password:string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private _auth = inject(Auth);
  roles:string="user";
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

    const uid = user.uid;
    let name: string | null = null;
     this.userUidSubject.next(user.uid); // 👈 importante

    // Si viene de Google, usa displayName
    if (user.providerData[0]?.providerId === 'google.com') {
      name = user.displayName || user.email || null;
    } else {
      // Si es login manual, carga el nombre desde Firestore
      const userRef = doc(this.firestore, 'usuarios', uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        name = data?.['nombre'] || user.email || null;
        // También puedes cargar el rol aquí si quieres
        this.userRoleSubject.next(data?.['role'] || 'user');
      }
    }

    this.userNameSubject.next(name);
  });
}



  //////////////admin
  private userRoleSubject = new BehaviorSubject<string | null>(null);
public userRole$ = this.userRoleSubject.asObservable();

public async loadUserRole(uid: string, phoneNumber?: string) {
  const userRef = doc(this.firestore, 'usuarios', uid);
  const userSnap = await getDoc(userRef);
  const data = userSnap.data();

  if (data) {
    // Usuario existe en 'usuarios'
    this.userRoleSubject.next(data?.['role'] || 'user');
    const nombre = data?.['nombre'];
    this.userNameSubject.next(nombre && nombre.trim() !== '' ? nombre : 'USUARIO');
    console.log('Usuario encontrado en usuarios:', uid, nombre);
  } else if (phoneNumber) {
    // Usuario no existe en 'usuarios', buscar en 'numeros' por teléfono
    const numerosRef = doc(this.firestore, 'numeros', phoneNumber);
    const numerosSnap = await getDoc(numerosRef);

    if (numerosSnap.exists()) {
      const numeroData = numerosSnap.data();
      const nombre = numeroData?.['nombre'] || 'USUARIO';

      this.userNameSubject.next(nombre);
      this.userRoleSubject.next('user'); // rol por defecto

      console.log('Nombre encontrado en numeros:', nombre);

      // Opcional: Crear usuario en 'usuarios' con info mínima
      await setDoc(userRef, {
        nombre: nombre,
        role: 'user',
        telefono: phoneNumber,
        creadoEn: new Date()
      });

    } else {
      // No encontrado en numeros: crear nuevo doc con nombre "USUARIOW"
      await setDoc(numerosRef, {
        telefono: phoneNumber,
        nombre: 'USUARIOW',
        creadoEn: new Date()
      });

      this.userNameSubject.next('USUARIOW');
      this.userRoleSubject.next('user');

      // También creamos el usuario en usuarios
      await setDoc(userRef, {
        nombre: 'USUARIOW',
        role: 'user',
        telefono: phoneNumber,
        creadoEn: new Date()
      });

      console.log('Nuevo documento creado en numeros con nombre USUARIOW');
    }
  } else {
    // No user data and no phone provided
    //this.userNameSubject.next('USUARIO');
    //this.userRoleSubject.next('user');
    //console.log('No user data ni telefono');
  }
}



  ///////////

  /////////////intentos
 async incrementarIntentosPorEmail(email: string): Promise<void> {
  const usuariosRef = collection(this.firestore, 'usuarios');
  const q = query(usuariosRef, where('email', '==', email));
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    const docSnap = querySnapshot.docs[0];
    const uid = docSnap.id;
    const data = docSnap.data();
    const intentosActuales = data['intentos'] ?? 0;
    const nuevosIntentos = intentosActuales + 1;

    await updateDoc(doc(this.firestore, 'usuarios', uid), {
      intentos: nuevosIntentos,
    });

    console.log(`Intentos para ${email}: ${nuevosIntentos}`);

    if (nuevosIntentos >= 3) {
      alert('¡Este usuario ha superado el límite de intentos!');
    }
  } else {
    console.warn(`No se encontró un usuario con el email: ${email}`);
  }
}
//////////////////////


///////////////cambiar clave

async cambiarPassword(user: User, nuevoPassword: string): Promise<void> {
  try {
    // 1. Autenticar al usuario con las credenciales actuales
    const credentials = await signInWithEmailAndPassword(
      this._auth,
      user.email,
      user.password
    );

    // 2. Cambiar la contraseña si el login fue exitoso
    const currentUser = credentials.user;
    await updatePassword(currentUser, nuevoPassword);

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
    const credentials = await createUserWithEmailAndPassword(
      this._auth,
      user.email,
      user.password
    );
    this.updateUserName(credentials.user);
    await setDoc(doc(this.firestore, 'usuarios', credentials.user.uid), {
    email: user.email,
    nombre:user.nombre,
    telefono: '',
    intentos:0,
    role: this.roles || 'user'  // Si en tu formulario incluyes el rol
  });
  await this.loadUserRole(credentials.user.uid); // en signUp y signIn
    return credentials;
  }

async signIn(user: LoginData) {
  const usuariosRef = collection(this.firestore, 'usuarios');
  const q = query(usuariosRef, where('email', '==', user.email));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    throw new Error('Usuario no encontrado');
  }

  const usuarioDoc = querySnapshot.docs[0];
  const usuarioData = usuarioDoc.data();

  if (usuarioData['intentos'] >= 3) {
    alert("Demasiados intentos, cambia tu clave para poder ingresar");
    throw new Error('Demasiados intentos fallidos. Intenta más tarde.');
  }

  try {
    const credentials = await signInWithEmailAndPassword(
      this._auth,
      user.email,
      user.password
    );

    await updateDoc(usuarioDoc.ref, { intentos: 0 });

    // ✅ Actualizar nombre y rol manualmente sin esperar a onAuthStateChanged
    const nombre = usuarioData['nombre'] || credentials.user.email || null;
    this.userNameSubject.next(nombre);
    this.userRoleSubject.next(usuarioData['role'] || 'user');

    return credentials;

  } catch (error) {
    await updateDoc(usuarioDoc.ref, {
      intentos: increment(1),
      ultimoIntento: serverTimestamp()
    });

    alert("datos incorrectos");
    throw new Error('Correo o contraseña incorrectos');
  }
}


  async signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(this._auth, provider);
  const user = result.user;

  this.updateUserName(user);
  await this.loadUserRole(user.uid);

  const db = getFirestore();
  const usuariosRef = collection(db, "usuarios");

  // Buscar si ya existe un usuario con ese email
  const q = query(usuariosRef, where("email", "==", user.email));
  const querySnapshot = await getDocs(q);

  // Si no existe, lo creamos
  if (querySnapshot.empty) {
    await addDoc(usuariosRef, {
      uid: user.uid,
      email: user.email,
      nombre: user.displayName || "", // o lo que quieras guardar
      intentos:0,
      telefono:'',
      role: 'user'
    });
  }else {
    // Si ya existe, reiniciamos el campo 'intentos' a 0
    querySnapshot.forEach(async (docSnap) => {
      const docRef = doc(db, "usuarios", docSnap.id);
      await updateDoc(docRef, { intentos: 0 });
    });
  }

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
