const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
  projectId: "gina1-838c7",
  apiKey: "AIzaSyAXOiYtc0W0zfedwKAJaoWNO2CydqGkOo0" // Taken from the user's logs
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

signInWithEmailAndPassword(auth, 'fernanda@gmail.com', 'FernandaPrueba')
  .then((userCredential) => {
    console.log("LOGIN SUCCESSFUL:", userCredential.user.uid);
  })
  .catch((error) => {
    console.error("LOGIN FAILED:", error.code, error.message);
  });
