import { HttpClient } from "@angular/common/http";
import { inject, Injectable, InjectionToken } from "@angular/core";
import { map, Observable, timeout } from "rxjs";
import { APP_ENDPOINTS } from "../../../core/config/app-endpoints";
import { isFiniteNumber, isRecord } from "../../../core/storage/storage-guards";
export interface StatisticsRepository {
  getStatistics(): Observable<Record<string, number>>;
}
@Injectable({ providedIn: "root" })
export class HttpStatisticsAdapter implements StatisticsRepository {
  private http = inject(HttpClient);
  private endpoints = inject(APP_ENDPOINTS);
  getStatistics() {
    return this.http.get<unknown>(this.endpoints.statistics).pipe(
      timeout(15000),
      map((data) => {
        if (
          !isRecord(data) ||
          !Object.values(data).every((v) => isFiniteNumber(v) && v >= 0)
        )
          throw new Error("Estadísticas no válidas.");
        return data as Record<string, number>;
      }),
    );
  }
}
export const STATISTICS = new InjectionToken<StatisticsRepository>(
  "StatisticsRepository",
  { providedIn: "root", factory: () => inject(HttpStatisticsAdapter) },
);
