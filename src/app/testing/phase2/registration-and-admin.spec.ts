import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { Firestore } from "@angular/fire/firestore";
import { of } from "rxjs";
import { AuthService } from "../../auth/data-access/auth.service";
import { Formulario2Component } from "../../components/formulario2/formulario2.component";
import { Formulario3Component } from "../../components/formulario3/formulario3.component";
import { Editar1Component } from "../../components/editar1/editar1.component";
import { Editar2Component } from "../../components/editar2/editar2.component";
import { Dialog } from "@angular/cdk/dialog";
import Swal from "sweetalert2";

describe("Connected registration safeguards", () => {
  let auth: any;
  beforeEach(() => {
    auth = {
      getCurrentUser: jasmine.createSpy().and.resolveTo(null),
      userName$: of(null),
      userUid$: of(null),
    };
    TestBed.configureTestingModule({
      imports: [Formulario2Component, Formulario3Component],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Firestore, useValue: {} },
        { provide: AuthService, useValue: auth },
      ],
    });
  });
  it("rejects a past booking before starting a request and leaves the submit state available", async () => {
    const fixture = TestBed.createComponent(Formulario2Component);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.formulario.setValue({
      entrenamiento: "Pesas",
      fecha: "2000-01-01",
      turno: "Mañana",
    });
    await component.enviarFormulario();
    expect(component.loading()).toBeFalse();
    expect(component.enviado).toBeFalse();
    expect(component.error).toContain("posterior");
  });
  it("does not write to Firestore for a visitor and releases the busy state", async () => {
    const fixture = TestBed.createComponent(Formulario2Component);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.formulario.setValue({
      entrenamiento: "Pesas",
      fecha: "2099-01-01",
      turno: "Tarde",
    });
    await component.enviarFormulario();
    expect(component.loading()).toBeFalse();
    expect(component.error).toContain("Inicia sesión");
    expect(component.recordId).toBe("");
  });
  it("does not re-submit an already confirmed registration when a notification failed", async () => {
    const fixture = TestBed.createComponent(Formulario2Component);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.enviado = true;
    component.notificationError = true;
    auth.getCurrentUser.calls.reset();
    await component.enviarFormulario();
    expect(auth.getCurrentUser).not.toHaveBeenCalled();
    expect(component.loading()).toBeFalse();
  });
  it("blocks attendance with incomplete fields instead of sending a partial record", async () => {
    const fixture = TestBed.createComponent(Formulario3Component);
    fixture.detectChanges();
    await fixture.componentInstance.guardar();
    expect(fixture.componentInstance.error).toContain("Completa");
    expect(fixture.componentInstance.recordId).toBe("");
    expect(fixture.componentInstance.loading()).toBeFalse();
  });
});

describe("Administrative editing", () => {
  beforeEach(() => {
    spyOn(Editar1Component.prototype, "load").and.stub();
    spyOn(Editar2Component.prototype, "load").and.stub();
    TestBed.configureTestingModule({
      imports: [Editar1Component, Editar2Component],
      providers: [provideRouter([]), { provide: Firestore, useValue: {} }],
    });
  });
  afterEach(() => TestBed.inject(Dialog).closeAll());
  it("combines text and activity filters on actual record fields", () => {
    const fixture = TestBed.createComponent(Editar1Component);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.registros = [
      {
        id: "one",
        nombre: "Unit Alpha",
        entrenamiento: "Yoga",
        fecha: "2026-10-28",
        turno: "Mañana",
      },
      {
        id: "two",
        nombre: "Unit Beta",
        entrenamiento: "Pesas",
        fecha: "2026-10-29",
        turno: "Tarde",
      },
    ];
    component.query = "alpha";
    component.selectedClass = "Yoga";
    expect(component.filtered.map((item) => item.id)).toEqual(["one"]);
    component.selectedClass = "Pesas";
    expect(component.filtered.length).toBe(0);
  });
  it("edits a clone and discards it on cancel without changing the displayed record", () => {
    const fixture = TestBed.createComponent(Editar1Component);
    const component = fixture.componentInstance;
    const record = {
      id: "one",
      nombre: "Unit Alpha",
      entrenamiento: "Pesas",
      fecha: "2026-10-28",
      turno: "Mañana",
    };
    component.registros = [record];
    fixture.detectChanges();
    fixture.nativeElement
      .querySelector('button[aria-label^="Editar registro"]')
      .click();
    fixture.detectChanges();
    component.editing.entrenamiento = "Yoga";
    component.closeEditor();
    fixture.detectChanges();
    expect(record.entrenamiento).toBe("Pesas");
  });
  it("asks for confirmation before deleting an attendance record and preserves it on cancel", async () => {
    const fixture = TestBed.createComponent(Editar2Component);
    fixture.detectChanges();
    const record = {
      id: "unit",
      alumno: "Unit Alpha",
      clase: "Box",
      fecha: "2026-10-28",
      hora: "10:00",
    };
    fixture.componentInstance.registros = [record];
    const confirm = spyOn(Swal, "fire").and.resolveTo({
      isConfirmed: false,
      isDenied: false,
      isDismissed: true,
    });
    await fixture.componentInstance.borrar(record);
    expect(confirm).toHaveBeenCalled();
    expect((confirm.calls.mostRecent().args[0] as any).text).toContain(
      "Firestore",
    );
    expect(fixture.componentInstance.registros.length).toBe(1);
  });
});
