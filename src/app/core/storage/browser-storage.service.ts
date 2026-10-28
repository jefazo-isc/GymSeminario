import { DOCUMENT } from "@angular/common";
import { inject, Injectable, signal } from "@angular/core";

export type StorageIssue = "unavailable" | "invalid" | "future-version";
export type DataGuard<T> = (value: unknown) => value is T;
const VERSIONS = "grom.storage.versions";
/** Keeps the existing payloads and keys intact. The sidecar tracks only schema versions. */
@Injectable({ providedIn: "root" })
export class BrowserStorage {
  private readonly document = inject(DOCUMENT);
  private readonly problems = signal<Record<string, StorageIssue>>({});
  readonly issues = this.problems.asReadonly();
  private readonly blocked = new Set<string>();

  read<T>(key: string, guard: DataGuard<T>, fallback: () => T): T {
    try {
      const raw = this.storage.getItem(key);
      if (raw === null) return fallback();
      const versions = this.versions();
      if ((versions[key] ?? 0) > 1) {
        this.issue(key, "future-version");
        return fallback();
      }
      const value: unknown = JSON.parse(raw);
      if (!guard(value)) {
        this.issue(key, "invalid");
        return fallback();
      }
      // Version 0 (legacy raw JSON) is compatible with v1; do not rewrite on read.
      return value;
    } catch {
      this.issue(key, "unavailable");
      return fallback();
    }
  }

  write<T>(key: string, value: T): void {
    if (this.blocked.has(key))
      throw new Error(
        "Los datos locales existentes no se pueden reemplazar con seguridad. Conservamos el original.",
      );
    this.storage.setItem(key, JSON.stringify(value));
    // Metadata failure must not report a failed operation after its payload was saved.
    try {
      this.storage.setItem(
        VERSIONS,
        JSON.stringify({ ...this.versions(), [key]: 1 }),
      );
    } catch {
      /* Raw v1 remains legacy compatible. */
    }
  }

  readText(key: string): string | null {
    try {
      return this.storage.getItem(key);
    } catch {
      this.issue(key, "unavailable");
      return null;
    }
  }
  writeText(key: string, value: string): void {
    this.storage.setItem(key, value);
  }
  remove(key: string): void {
    this.storage.removeItem(key);
    this.blocked.delete(key);
  }
  private get storage(): Storage {
    const storage = this.document.defaultView?.localStorage;
    if (!storage)
      throw new Error("El almacenamiento del navegador no está disponible.");
    return storage;
  }
  private versions(): Record<string, number> {
    const raw = this.storage.getItem(VERSIONS);
    if (!raw) return {};
    const data: unknown = JSON.parse(raw);
    if (
      !data ||
      typeof data !== "object" ||
      Array.isArray(data) ||
      Object.values(data).some((v) => !Number.isInteger(v) || v < 0)
    )
      throw new Error("Metadatos locales no válidos.");
    return data as Record<string, number>;
  }
  private issue(key: string, issue: StorageIssue): void {
    this.blocked.add(key);
    this.problems.update((current) => ({ ...current, [key]: issue }));
  }
}
