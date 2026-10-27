import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";

@Injectable({ providedIn: "root" })
export class QrService {
  private apiUrl = "https://api-j6b4.onrender.com/api/user-qr"; // endpoint correcto

  constructor(private http: HttpClient) {}

  getQrData(uid: string) {
    // Propagate transport failures. A fabricated string is not a valid access code.
    return this.http.get<{ data: string }>(`${this.apiUrl}/${uid}`);
  }
}
