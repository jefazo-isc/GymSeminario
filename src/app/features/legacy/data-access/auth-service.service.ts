import { inject, Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { BrowserStorage } from "../../../core/storage/browser-storage.service";

@Injectable({
  providedIn: "root",
})
export class AuthServiceService {
  private storage = inject(BrowserStorage);

  private usuarioActualSubject = new BehaviorSubject<string | null>(
    this.storage.readText("usuarioActual"),
  );

  usuarioActual$ = this.usuarioActualSubject.asObservable();

  constructor() {}

  login(usuario: string) {
    this.storage.writeText("usuarioActual", usuario);
    this.usuarioActualSubject.next(usuario);
  }

  logout() {
    this.storage.remove("usuarioActual");
    this.usuarioActualSubject.next(null);
  }
}
