const admin = require('firebase-admin');
const path = require('path');

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credPath) {
  console.error('Define GOOGLE_APPLICATION_CREDENTIALS con la ruta al JSON de servicio.');
  process.exit(1);
}

const serviceAccount = require(path.resolve(credPath));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function findUsers() {
  const query = (process.env.TARGET_QUERY || '').toLowerCase();
  const listUsersResult = await admin.auth().listUsers(1000);
  console.log('Total usuarios:', listUsersResult.users.length);
  if (query) {
    const matches = listUsersResult.users.filter(
      (u) =>
        (u.email && u.email.toLowerCase().includes(query)) ||
        (u.displayName && u.displayName.toLowerCase().includes(query)),
    );
    console.log('Coincidencias:', matches.map((m) => ({ uid: m.uid, email: m.email })));
  }
}

findUsers().catch((err) => {
  console.error('Error listando usuarios:', err.message);
  process.exit(1);
});
