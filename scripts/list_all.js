const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const projectId = process.env.FIREBASE_PROJECT_ID;
const targetEmail = process.env.TARGET_USER_EMAIL;

if (!projectId) {
  console.error('Define FIREBASE_PROJECT_ID (y opcionalmente TARGET_USER_EMAIL) en variables de entorno.');
  process.exit(1);
}

const app = initializeApp({ projectId });
const db = getFirestore(app);

async function listAll() {
  const q = await getDocs(collection(db, 'usuarios'));
  const emails = q.docs.map((d) => d.data().email).filter(Boolean);
  console.log('Total correos encontrados:', emails.length);
  if (targetEmail) {
    console.log(emails.includes(targetEmail) ? 'Usuario encontrado.' : 'Usuario no encontrado.');
  }
}

listAll();
