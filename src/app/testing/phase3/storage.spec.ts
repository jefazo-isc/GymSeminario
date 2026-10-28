import { DOCUMENT } from "@angular/common";
import { TestBed } from "@angular/core/testing";
import { BrowserStorage } from "../../core/storage/browser-storage.service";
import { isList, isString } from "../../core/storage/storage-guards";
import { SesionService } from "../../features/activity/data-access/sesion.service";
import { PagoService } from "../../features/billing/data-access/pago.service";
import { MembresiaService } from "../../features/memberships/data-access/membresia.service";
import { PerfilSocioService } from "../../features/profile/data-access/perfil-socio.service";

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  failWrites = false;
  get length() {
    return this.data.size;
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.failWrites) throw new Error("Quota");
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  clear() {
    this.data.clear();
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
}
describe("Local schema compatibility and atomic confirmation", () => {
  let memory: MemoryStorage;
  beforeEach(() => {
    memory = new MemoryStorage();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DOCUMENT,
          useValue: { defaultView: { localStorage: memory } },
        },
      ],
    });
  });
  it("reads raw legacy JSON without rewriting it or its key", () => {
    memory.setItem("legacy", '["saved"]');
    const service = TestBed.inject(BrowserStorage);
    expect(service.read("legacy", isList(isString), () => [])).toEqual([
      "saved",
    ]);
    expect(memory.getItem("legacy")).toBe('["saved"]');
    expect(memory.getItem("grom.storage.versions")).toBeNull();
  });
  it("preserves corrupt data and refuses to overwrite it with defaults", () => {
    memory.setItem("legacy", "{broken");
    const service = TestBed.inject(BrowserStorage);
    expect(service.read("legacy", isList(isString), () => [])).toEqual([]);
    expect(() => service.write("legacy", ["replacement"])).toThrow();
    expect(memory.getItem("legacy")).toBe("{broken");
  });
  it("protects future schema versions and does not silently downgrade them", () => {
    memory.setItem("legacy", '["saved"]');
    memory.setItem("grom.storage.versions", '{"legacy":2}');
    const service = TestBed.inject(BrowserStorage);
    expect(
      service.read("legacy", isList(isString), () => ["fallback"]),
    ).toEqual(["fallback"]);
    expect(service.issues()["legacy"]).toBe("future-version");
    expect(() => service.write("legacy", [])).toThrow();
  });
  it("records version 1 separately while retaining the raw payload shape", () => {
    TestBed.inject(BrowserStorage).write("legacy", ["new"]);
    expect(memory.getItem("legacy")).toBe('["new"]');
    expect(JSON.parse(memory.getItem("grom.storage.versions")!)["legacy"]).toBe(
      1,
    );
  });
  it("merges historical partial profiles in memory without discarding saved values", () => {
    memory.setItem("gym_perfil_socio", '{"nombre":"Saved","edad":31}');
    const service = TestBed.inject(PerfilSocioService);
    expect(service.getPerfilActual().nombre).toBe("Saved");
    expect(service.getPerfilActual().edad).toBe(31);
    expect(service.getPerfilActual().altura).toBe(175);
    expect(memory.getItem("gym_perfil_socio")).toBe(
      '{"nombre":"Saved","edad":31}',
    );
  });
  it("does not update the profile stream when persistence fails", () => {
    const service = TestBed.inject(PerfilSocioService);
    const before = service.getPerfilActual();
    memory.failWrites = true;
    expect(() =>
      service.guardarPerfil({ ...before, nombre: "Unsaved" }),
    ).toThrow();
    expect(service.getPerfilActual()).toEqual(before);
  });
  it("does not mark a local payment as paid before storage confirms it", () => {
    const service = TestBed.inject(PagoService);
    const before = service.getPagos();
    memory.failWrites = true;
    expect(() => service.marcarComoPagado("6", "Efectivo")).toThrow();
    expect(service.getPagos()).toEqual(before);
  });
  it("returns independent membership benefits and activity snapshots", () => {
    const membership = TestBed.inject(MembresiaService);
    const plans = membership.getPlanes();
    plans[0].beneficios.length = 0;
    expect(membership.getPlanes()[0].beneficios.length).toBeGreaterThan(0);
    const activity = TestBed.inject(SesionService);
    const sessions = activity.getHistorial();
    sessions[0].clase = "Changed";
    expect(activity.getHistorial()[0].clase).toBe("Spinning");
  });
  it("does not create demonstration payments when the persisted list is intentionally empty", () => {
    memory.setItem("espacio_gym_pagos", "[]");
    expect(TestBed.inject(PagoService).getResumen().pagos).toEqual([]);
  });
  it("creates calendar dates in the local day and keeps the eighteen-day membership example", () => {
    jasmine.clock().install();
    try {
      jasmine.clock().mockDate(new Date(2026, 9, 27, 23, 30));
      const membership = TestBed.inject(MembresiaService).getMembresiaActual();
      expect(membership.fechaInicio).toBe("2026-10-27");
      expect(membership.fechaFin).toBe("2026-11-14");
      expect(membership.diasRestantes).toBe(18);
      expect(
        TestBed.inject(PagoService)
          .getPagos()
          .find((p) => p.id === "6")?.fecha,
      ).toBe("2026-10-27");
    } finally {
      jasmine.clock().uninstall();
    }
  });
});
