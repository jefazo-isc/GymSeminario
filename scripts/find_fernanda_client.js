const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

const apiKey = process.env.FIREBASE_API_KEY;
const projectId = process.env.FIREBASE_PROJECT_ID;
const email = process.env.TEST_USER_EMAIL;
const password = process.env.TEST_USER_PASSWORD;

if (!apiKey || !projectId || !email || !password) {
  console.error('Define FIREBASE_API_KEY, FIREBASE_PROJECT_ID, TEST_USER_EMAIL y TEST_USER_PASSWORD en variables de entorno.');
  process.exit(1);
}

const app = initializeApp({ projectId, apiKey });
const auth = getAuth(app);

signInWithEmailAndPassword(auth, email, password)
  .then((userCredential) => {
    console.log('LOGIN SUCCESSFUL:', userCredential.user.uid);
  })
  .catch((error) => {
    console.error('LOGIN FAILED:', error.code, error.message);
    process.exit(1);
  });
