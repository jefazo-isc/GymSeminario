import { DOCUMENT } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { BehaviorSubject, firstValueFrom, Observable } from "rxjs";
import {
  APP_ENDPOINTS,
  backendBaseUrl,
} from "../../../core/config/app-endpoints";
import { localDate } from "../../../core/date/local-date";
import { BrowserStorage } from "../../../core/storage/browser-storage.service";
import { isList, isRecord } from "../../../core/storage/storage-guards";
import {
  BodyMeasurement,
  calculateBmi,
  createProfileDraft,
  MeasurementInput,
  PerfilSocio,
} from "../models/profile.model";
import { isProfilePatch } from "../models/storage.guard";
import type { ProfileRepository } from "./profile.repository";

const STORAGE_KEY = "gym_perfil_socio";
const MEASUREMENTS_KEY = "gym_medidas_corporales";

type RemoteProfileFields = Partial<PerfilSocio> & {
  dias_disponibles?: number;
  restricciones_medicas?: string;
};

type BackendHealthAlert =
  | string
  | { nivel?: string; codigo?: string; mensaje?: string };

interface BackendProfilePayload extends RemoteProfileFields {
  perfil?: RemoteProfileFields;
  profile?: RemoteProfileFields;
  healthAlerts?: BackendHealthAlert[];
}

interface BackendMeasurementRow {
  id?: string | number;
  peso?: number;
  altura?: number;
  imc?: number;
  cintura?: number | null;
  pecho?: number | null;
  brazo?: number | null;
  grasaCorporal?: number | null;
  grasa_corporal?: number | null;
  restriccionesMedicas?: string;
  restricciones_medicas?: string;
  notas?: string;
  fecha?: string;
  created_at?: string;
  createdAt?: string;
}

const isMeasurementRecord = (v: unknown): v is BodyMeasurement =>
  isRecord(v) && typeof v["peso"] === "number" && typeof v["imc"] === "number";

@Injectable({
  providedIn: "root",
})
export class PerfilSocioService implements ProfileRepository {
  private readonly storage = inject(BrowserStorage);
  private readonly http = inject(HttpClient, { optional: true });
  private readonly endpoints = inject(APP_ENDPOINTS, { optional: true });
  private readonly doc = inject(DOCUMENT, { optional: true });
  private readonly perfilDefault: PerfilSocio = createProfileDraft();

  private readonly perfilSubject = new BehaviorSubject<PerfilSocio>(
    this.cargarPerfilInicial(),
  );
  public readonly perfil$: Observable<PerfilSocio> =
    this.perfilSubject.asObservable();

  private cargarPerfilInicial(): PerfilSocio {
    return {
      ...this.perfilDefault,
      ...this.storage.read(STORAGE_KEY, isProfilePatch, () => ({})),
    };
  }

  getPerfilActual(): PerfilSocio {
    return { ...this.perfilSubject.getValue() };
  }

  guardarPerfil(nuevoPerfil: PerfilSocio): void | Promise<void> {
    this.storage.write(STORAGE_KEY, nuevoPerfil);
    this.perfilSubject.next({ ...nuevoPerfil });
    if (this.http && this.hasAuthToken()) {
      const base = backendBaseUrl(this.endpoints);
      return firstValueFrom(
        this.http.put<{ ok?: boolean }>(
          `${base}/api/profile`,
          {
            ...nuevoPerfil,
            dias_disponibles: nuevoPerfil.diasDisponibles,
            restricciones_medicas: nuevoPerfil.restriccionesMedicas,
          },
        ),
      )
        .then(() => undefined)
        .catch(() => undefined);
    }
    return undefined;
  }

  actualizarNombre(nombre: string): void {
    const actual = this.getPerfilActual();
    if (!actual.nombre || actual.nombre === "Socio") {
      actual.nombre = nombre;
      void this.guardarPerfil(actual);
    }
  }

  getSessionUserInfo(): {
    email: string | null;
    nombre: string | null;
    role: string | null;
  } | null {
    try {
      const raw = this.doc?.defaultView?.localStorage?.getItem("gym_user");
      if (!raw) return null;
      const parsed = JSON.parse(raw) as {
        email?: string;
        nombre?: string;
        role?: string;
      };
      return {
        email: parsed.email || null,
        nombre: parsed.nombre || null,
        role: parsed.role || null,
      };
    } catch {
      return null;
    }
  }

  async syncProfileFromServer(): Promise<{
    perfil: PerfilSocio;
    healthAlerts: string[];
    synced: boolean;
  }> {
    const fallback = this.getPerfilActual();
    if (!this.http || !this.hasAuthToken()) {
      return {
        perfil: fallback,
        healthAlerts: this.deriveLocalAlerts(fallback),
        synced: false,
      };
    }

    const base = backendBaseUrl(this.endpoints);
    try {
      const resp = await firstValueFrom(
        this.http.get<BackendProfilePayload>(`${base}/api/profile`),
      );
      const raw = resp?.perfil || resp?.profile || resp;
      const merged: PerfilSocio = {
        ...fallback,
        ...(raw?.nombre ? { nombre: String(raw.nombre) } : {}),
        ...(typeof raw?.edad === "number" ? { edad: raw.edad } : {}),
        ...(typeof raw?.peso === "number" ? { peso: raw.peso } : {}),
        ...(typeof raw?.altura === "number" ? { altura: raw.altura } : {}),
        ...(raw?.genero ? { genero: String(raw.genero) } : {}),
        ...(raw?.objetivo ? { objetivo: String(raw.objetivo) } : {}),
        ...(typeof (raw?.diasDisponibles ?? raw?.dias_disponibles) === "number"
          ? { diasDisponibles: Number(raw.diasDisponibles ?? raw.dias_disponibles) }
          : {}),
        ...(raw?.nivel ? { nivel: String(raw.nivel) } : {}),
        ...(raw?.restriccionesMedicas !== undefined ||
        raw?.restricciones_medicas !== undefined
          ? {
              restriccionesMedicas: String(
                raw.restriccionesMedicas ?? raw.restricciones_medicas ?? "Ninguna",
              ),
            }
          : {}),
      };
      this.storage.write(STORAGE_KEY, merged);
      this.perfilSubject.next(merged);
      const alerts = Array.isArray(resp?.healthAlerts)
        ? this.normalizeHealthAlerts(resp.healthAlerts, this.deriveLocalAlerts(merged))
        : this.deriveLocalAlerts(merged);
      return { perfil: merged, healthAlerts: alerts, synced: true };
    } catch {
      return {
        perfil: fallback,
        healthAlerts: this.deriveLocalAlerts(fallback),
        synced: false,
      };
    }
  }

  async loadMeasurements(): Promise<{
    measurements: BodyMeasurement[];
    healthAlerts: string[];
  }> {
    const cached = this.storage.read(
      MEASUREMENTS_KEY,
      isList(isMeasurementRecord),
      () => [],
    );
    if (!this.http || !this.hasAuthToken()) {
      return {
        measurements: cached,
        healthAlerts: this.deriveLocalAlerts(this.getPerfilActual()),
      };
    }

    const base = backendBaseUrl(this.endpoints);
    try {
      const resp = await firstValueFrom(
        this.http.get<
          | BackendMeasurementRow[]
          | {
              measurements?: BackendMeasurementRow[];
              data?: BackendMeasurementRow[];
              healthAlerts?: BackendHealthAlert[];
            }
        >(`${base}/api/profile/measurements`),
      );
      const rows = Array.isArray(resp)
        ? resp
        : resp?.measurements || resp?.data || [];
      const mapped = rows.map((r) => this.mapMeasurement(r));
      this.storage.write(MEASUREMENTS_KEY, mapped);
      const alerts =
        !Array.isArray(resp) && Array.isArray(resp?.healthAlerts)
          ? this.normalizeHealthAlerts(
              resp.healthAlerts,
              this.deriveLocalAlerts(this.getPerfilActual()),
            )
          : this.deriveLocalAlerts(this.getPerfilActual());
      return { measurements: mapped, healthAlerts: alerts };
    } catch {
      return {
        measurements: cached,
        healthAlerts: this.deriveLocalAlerts(this.getPerfilActual()),
      };
    }
  }

  async saveMeasurement(input: MeasurementInput): Promise<{
    measurement: BodyMeasurement;
    healthAlerts: string[];
  }> {
    const imc = calculateBmi(input.peso, input.altura);
    const localEntry: BodyMeasurement = {
      id: `loc-${Date.now()}`,
      peso: input.peso,
      altura: input.altura,
      imc,
      cintura: input.cintura ?? null,
      pecho: input.pecho ?? null,
      brazo: input.brazo ?? null,
      grasaCorporal: input.grasaCorporal ?? null,
      restriccionesMedicas: input.restriccionesMedicas,
      notas: input.notas,
      fecha: localDate(new Date()),
    };

    if (this.http && this.hasAuthToken()) {
      const base = backendBaseUrl(this.endpoints);
      const resp = await firstValueFrom(
        this.http.post<{
          measurement?: BackendMeasurementRow;
          imc?: number;
          healthAlerts?: BackendHealthAlert[];
        }>(`${base}/api/profile/measurements`, {
          peso: input.peso,
          altura: input.altura,
          cintura: input.cintura ?? null,
          pecho: input.pecho ?? null,
          brazo: input.brazo ?? null,
          grasa_corporal: input.grasaCorporal ?? null,
          grasaCorporal: input.grasaCorporal ?? null,
          restricciones_medicas: input.restriccionesMedicas || "Ninguna",
          restriccionesMedicas: input.restriccionesMedicas || "Ninguna",
          notas: input.notas || "",
        }),
      );
      const saved = resp?.measurement
        ? this.mapMeasurement(resp.measurement)
        : { ...localEntry, imc: resp?.imc ?? imc };
      const prev = this.storage.read(
        MEASUREMENTS_KEY,
        isList(isMeasurementRecord),
        () => [],
      );
      this.storage.write(MEASUREMENTS_KEY, [saved, ...prev]);
      return {
        measurement: saved,
        healthAlerts: Array.isArray(resp?.healthAlerts)
          ? this.normalizeHealthAlerts(
              resp.healthAlerts,
              this.deriveLocalAlerts(this.getPerfilActual(), saved.imc),
            )
          : this.deriveLocalAlerts(this.getPerfilActual(), saved.imc),
      };
    }

    const prev = this.storage.read(
      MEASUREMENTS_KEY,
      isList(isMeasurementRecord),
      () => [],
    );
    this.storage.write(MEASUREMENTS_KEY, [localEntry, ...prev]);
    return {
      measurement: localEntry,
      healthAlerts: this.deriveLocalAlerts(this.getPerfilActual(), imc),
    };
  }

  private mapMeasurement(row: BackendMeasurementRow): BodyMeasurement {
    const peso = Number(row.peso ?? 0);
    const altura = Number(row.altura ?? 170);
    const imc =
      typeof row.imc === "number" && Number.isFinite(row.imc)
        ? Number(row.imc.toFixed(1))
        : calculateBmi(peso, altura);
    const rawDate = String(
      row.fecha || row.createdAt || row.created_at || "",
    ).slice(0, 10);
    return {
      id: row.id,
      peso,
      altura,
      imc,
      cintura: row.cintura ?? null,
      pecho: row.pecho ?? null,
      brazo: row.brazo ?? null,
      grasaCorporal: row.grasaCorporal ?? row.grasa_corporal ?? null,
      restriccionesMedicas:
        row.restriccionesMedicas ?? row.restricciones_medicas,
      notas: row.notas,
      fecha: /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
        ? rawDate
        : localDate(new Date()),
    };
  }

  private normalizeHealthAlerts(
    raw: BackendHealthAlert[],
    fallback: string[],
  ): string[] {
    const messages = raw
      .map((item) =>
        typeof item === "string"
          ? item.trim()
          : typeof item?.mensaje === "string"
            ? item.mensaje.trim()
            : "",
      )
      .filter((msg) => msg.length > 0);
    return messages.length ? messages : fallback;
  }

  private deriveLocalAlerts(perfil: PerfilSocio, customImc?: number): string[] {
    const alerts: string[] = [];
    const restr = (perfil.restriccionesMedicas || "").trim();
    if (
      restr &&
      !["ninguna", "ninguno", "sin restricciones", "n/a", "no"].includes(
        restr.toLowerCase(),
      )
    ) {
      alerts.push(`Restricción médica activa: ${restr}`);
    }
    const imc = customImc ?? calculateBmi(perfil.peso, perfil.altura);
    if (imc >= 30) {
      alerts.push(
        `IMC ${imc}: recomienda supervisión y progresión de bajo impacto articular.`,
      );
    } else if (imc > 0 && imc < 18.5) {
      alerts.push(
        `IMC ${imc}: se recomienda seguimiento nutricional y carga moderada.`,
      );
    }
    return alerts;
  }

  private hasAuthToken(): boolean {
    try {
      const storage = this.doc?.defaultView?.localStorage;
      return Boolean(storage?.getItem("gym_jwt"));
    } catch {
      return false;
    }
  }
}
