import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { AngularFireAuth } from "@angular/fire/compat/auth";
import { AngularFirestore } from "@angular/fire/compat/firestore";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { provideRouter } from "@angular/router";
import { of } from "rxjs";
import { SESSION } from "../features/auth/data-access/session.repository";
import { TRAINING } from "../features/training/data-access/training.repository";

/** Only for historical construction specs. Behavior/contract specs configure their own adapters. */
export function smokeDependencies() {
  return [
    provideRouter([]),
    provideHttpClient(),
    provideHttpClientTesting(),
    provideNoopAnimations(),
    {
      provide: SESSION,
      useValue: {
        auth: {},
        userName$: of(null),
        userUid$: of(null),
        userRole$: of(null),
        getCurrentUser: () => Promise.resolve(null),
      },
    },
    {
      provide: TRAINING,
      useValue: { bookings: () => of([]), attendances: () => of([]) },
    },
    { provide: AngularFireAuth, useValue: { authState: of(null) } },
    {
      provide: AngularFirestore,
      useValue: { doc: () => ({ valueChanges: () => of(null) }) },
    },
  ];
}
