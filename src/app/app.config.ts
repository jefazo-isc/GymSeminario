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
  apiKey: "AIzaSyBUIzZqDR_spIfFsRkPVqh3ClnpRqLlsOQ",
  authDomain: "dbgroom-4eba4.firebaseapp.com",
  projectId: "dbgroom-4eba4",
  storageBucket: "dbgroom-4eba4.firebasestorage.app",
  messagingSenderId: "963889664175",
  appId: "1:963889664175:web:cd0fc54b0adea5b28a445a"
};

export const appConfig: ApplicationConfig = {
   providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
     importProvidersFrom(HttpClientModule, FormsModule),
     provideServiceWorker('ngsw-worker.js', {
       enabled: false
     })
  ]
};
