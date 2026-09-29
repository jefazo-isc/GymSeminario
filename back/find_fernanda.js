const admin = require('firebase-admin');
const serviceAccount = require('./gym-grom-firebase-adminsdk-y1p6j-677a83d3b7.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function findUsers() {
  try {
    const listUsersResult = await admin.auth().listUsers(1000);
    console.log("Total usuarios en Firebase Auth:", listUsersResult.users.length);
    
    const fernandas = listUsersResult.users.filter(u => 
      (u.email && u.email.toLowerCase().includes('fernanda')) || 
      (u.displayName && u.displayName.toLowerCase().includes('fernanda'))
    );
    
    console.log("Usuarios que coinciden con 'fernanda':");
    console.log(JSON.stringify(fernandas, null, 2));
    
  } catch (error) {
    console.error('Error listando usuarios:', error);
  }
}

findUsers();
