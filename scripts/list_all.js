const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = { projectId: "gina1-838c7" };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function listAll() {
  const q = await getDocs(collection(db, 'usuarios'));
  const emails = q.docs.map(d => d.data().email).filter(e => e);
  console.log("Correos en Firestore:");
  console.log(emails);
  if(emails.includes('fernanda@gmail.com')) {
    console.log("¡SÍ ESTÁ EN FIRESTORE!");
  } else {
    console.log("NO está en Firestore");
  }
}
listAll();
