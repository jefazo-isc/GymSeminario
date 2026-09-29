const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
  apiKey: "AIzaSyBUIzZqDR_spIfFsRkPVqh3ClnpRqLlsOQ",
  authDomain: "dbgroom-4eba4.firebaseapp.com",
  projectId: "dbgroom-4eba4",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

signInWithEmailAndPassword(auth, 'fernanda@gmail.com', 'FernandaPrueba')
  .then((userCredential) => {
    console.log("¡ÉXITO! LOGIN FUNCIONA EN LA NUEVA BASE DE DATOS:", userCredential.user.email);
  })
  .catch((error) => {
    console.error("Fallo:", error.code, error.message);
  });
