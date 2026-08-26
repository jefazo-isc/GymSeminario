import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { importProvidersFrom, isDevMode } from '@angular/core';
import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { provideServiceWorker } from '@angular/service-worker';


const firebaseConfig = {
  projectId: "gina1-838c7",
  appId: "1:860331012943:web:a6c8105c96dc5a9e4f0b3a",
  databaseURL: "https://gina1-838c7-default-rtdb.firebaseio.com",
  storageBucket: "gina1-838c7.appspot.com", // CORREGIDO: storageBucket estaba mal escrito
  apiKey: "AIzaSyAXOiYtc0W0zfedwKAJaoWNO2CydqGkOo0",
  authDomain: "gina1-838c7.firebaseapp.com",
  messagingSenderId: "860331012943",
  measurementId: "G-NR63G2KPVW"
};

export const appConfig: ApplicationConfig = {
   providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
     importProvidersFrom(HttpClientModule, FormsModule), provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
          })
  ]
};
