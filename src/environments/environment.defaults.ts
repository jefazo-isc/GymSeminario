// Public browser configuration. Never put private credentials here.
export const environment = {
  production: false,
  services: {
    notifications: "https://gymseminario.onrender.com",
    qr: "https://api-j6b4.onrender.com/api/user-qr",
    statistics: "https://api-j6b4.onrender.com/api/sessions/stats",
    exercises: "https://arl150.github.io/ejercicios-api/ejercicios.json",
    legacyExercises: "https://gym-proyecto.free.beeceptor.com/todos",
    coach: "http://localhost:3000/api",
  },
  firebase: {
    apiKey: "AIzaSyBUIzZqDR_spIfFsRkPVqh3ClnpRqLlsOQ",
    authDomain: "dbgroom-4eba4.firebaseapp.com",
    projectId: "dbgroom-4eba4",
    storageBucket: "dbgroom-4eba4.firebasestorage.app",
    messagingSenderId: "963889664175",
    appId: "1:963889664175:web:cd0fc54b0adea5b28a445a",
  },
  paypal: {
    clientId:
      "AQMkAioK3b4Xhh1FtMYMRJbaeAKv--g9yGzot54i-n9KizKios8n-arYhReRG_0tbWpzgFZkOB7VzhPM",
    currency: "MXN",
  },
} as const;
