declare module 'firebase/auth' {
  export const getAuth: any;
  export const createUserWithEmailAndPassword: any;
  export const signInWithEmailAndPassword: any;
  export const GoogleAuthProvider: any;
  export const signInWithPopup: any;
  export const signOut: any;
  export const updatePassword: any;
  export const sendEmailVerification: any;
  export const onAuthStateChanged: any;
  export const signInWithPhoneNumber: any;
  export type RecaptchaVerifier = any;
  export const RecaptchaVerifier: any;
  export type ConfirmationResult = any;
  export const ConfirmationResult: any;
  export type User = any;
  export const User: any;
}

declare module 'firebase/firestore' {
  export const getFirestore: any;
  export const addDoc: any;
  export const serverTimestamp: any;
  export const doc: any;
  export const getDoc: any;
  export const updateDoc: any;
  export const query: any;
  export const where: any;
  export const getDocs: any;
  export const collection: any;
  export const setDoc: any;
  export const increment: any;
}
