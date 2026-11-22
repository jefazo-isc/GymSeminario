import { Dialog } from "@angular/cdk/dialog";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { Firestore } from "@angular/fire/firestore";
import { provideRouter } from "@angular/router";
import { of } from "rxjs";
import Swal from "sweetalert2";
import { Editar1Component } from "../../features/admin/pages/editar1/editar1.component";
import { Editar2Component } from "../../features/admin/pages/editar2/editar2.component";
import { AuthService } from "../../features/auth/data-access/auth.service";
import { MEMBERSHIPS } from "../../features/memberships/data-access/membership.repository";
import { Membresia } from "../../features/memberships/models/membresia.model";
import { TRAINING } from "../../features/training/data-access/training.repository";
import { Formulario2Component } from "../../features/training/pages/formulario2/formulario2.component";
import { Formulario3Component } from "../../features/training/pages/formulario3/formulario3.component";

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
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Firestore, useValue: {} },
      ],
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

describe("Role and subscription view hardening", () => {
  const inactiveMembership: Membresia = {
    id: "MEM-INACTIVA",
    nombrePlan: "Básico",
    precio: 0,
    periodo: "Mensual",
    fechaInicio: "2026-01-01",
    fechaFin: "2026-01-01",
    estado: "Vencida",
    diasRestantes: 0,
    beneficios: [],
  };

  afterEach(() => {
    localStorage.removeItem("gym_user");
    TestBed.inject(Dialog).closeAll();
  });

  it("blocks Editar1Component and Editar2Component views and mutations for non-admin/non-reception users", async () => {
    localStorage.setItem(
      "gym_user",
      JSON.stringify({
        uid: "u-sub",
        nombre: "Socio",
        email: "socio@example.com",
        role: "subscriber",
      }),
    );
    const trainingSpy = {
      bookings: jasmine.createSpy().and.returnValue(of([])),
      attendances: jasmine.createSpy().and.returnValue(of([])),
      updateBooking: jasmine.createSpy().and.resolveTo(),
      deleteBooking: jasmine.createSpy().and.resolveTo(),
      updateAttendance: jasmine.createSpy().and.resolveTo(),
      deleteAttendance: jasmine.createSpy().and.resolveTo(),
    };
    TestBed.configureTestingModule({
      imports: [Editar1Component, Editar2Component],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Firestore, useValue: {} },
        { provide: TRAINING, useValue: trainingSpy },
      ],
    });

    const fixture1 = TestBed.createComponent(Editar1Component);
    fixture1.detectChanges();
    const comp1 = fixture1.componentInstance;
    expect(comp1.esAdminORecepcion).toBeFalse();
    expect(trainingSpy.bookings).not.toHaveBeenCalled();
    expect(fixture1.nativeElement.querySelector("table.data-table")).toBeNull();
    expect(fixture1.nativeElement.textContent).toContain("Acceso denegado");
    await comp1.actualizar({
      id: "1",
      entrenamiento: "Yoga",
      fecha: "2099-01-01",
      turno: "Mañana",
      nombre: "Socio",
    });
    await comp1.borrar({
      id: "1",
      entrenamiento: "Yoga",
      fecha: "2099-01-01",
      turno: "Mañana",
      nombre: "Socio",
    });
    expect(trainingSpy.updateBooking).not.toHaveBeenCalled();
    expect(trainingSpy.deleteBooking).not.toHaveBeenCalled();

    const fixture2 = TestBed.createComponent(Editar2Component);
    fixture2.detectChanges();
    const comp2 = fixture2.componentInstance;
    expect(comp2.esAdminORecepcion).toBeFalse();
    expect(trainingSpy.attendances).not.toHaveBeenCalled();
    expect(fixture2.nativeElement.querySelector("table.data-table")).toBeNull();
    expect(fixture2.nativeElement.textContent).toContain("Acceso denegado");
    await comp2.actualizar({
      id: "1",
      clase: "Box",
      fecha: "2099-01-01",
      hora: "10:00",
      alumno: "Socio",
    });
    await comp2.borrar({
      id: "1",
      clase: "Box",
      fecha: "2099-01-01",
      hora: "10:00",
      alumno: "Socio",
    });
    expect(trainingSpy.updateAttendance).not.toHaveBeenCalled();
    expect(trainingSpy.deleteAttendance).not.toHaveBeenCalled();
  });

  it("allows receptionist sessions in Editar1Component and Editar2Component", () => {
    localStorage.setItem(
      "gym_user",
      JSON.stringify({
        uid: "u-rec",
        nombre: "Recepción",
        email: "recep@example.com",
        role: "receptionist",
      }),
    );
    const trainingSpy = {
      bookings: jasmine.createSpy().and.returnValue(of([])),
      attendances: jasmine.createSpy().and.returnValue(of([])),
    };
    TestBed.configureTestingModule({
      imports: [Editar1Component, Editar2Component],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Firestore, useValue: {} },
        { provide: TRAINING, useValue: trainingSpy },
      ],
    });

    const fixture1 = TestBed.createComponent(Editar1Component);
    fixture1.detectChanges();
    expect(fixture1.componentInstance.esAdminORecepcion).toBeTrue();
    expect(trainingSpy.bookings).toHaveBeenCalled();
    expect(fixture1.nativeElement.textContent).not.toContain("Acceso denegado");

    const fixture2 = TestBed.createComponent(Editar2Component);
    fixture2.detectChanges();
    expect(fixture2.componentInstance.esAdminORecepcion).toBeTrue();
    expect(trainingSpy.attendances).toHaveBeenCalled();
    expect(fixture2.nativeElement.textContent).not.toContain("Acceso denegado");
  });

  it("blocks Formulario2Component and Formulario3Component submissions when authenticated without an active subscription", async () => {
    localStorage.setItem(
      "gym_user",
      JSON.stringify({
        uid: "u-free",
        nombre: "Usuario Gratis",
        email: "free@example.com",
        role: "user",
      }),
    );
    const trainingSpy = {
      createBooking: jasmine.createSpy().and.resolveTo({ id: "b-1" }),
      createAttendance: jasmine.createSpy().and.resolveTo({ id: "a-1" }),
    };
    TestBed.configureTestingModule({
      imports: [Formulario2Component, Formulario3Component],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Firestore, useValue: {} },
        { provide: TRAINING, useValue: trainingSpy },
        {
          provide: MEMBERSHIPS,
          useValue: { membresiaActual$: of(inactiveMembership) },
        },
        {
          provide: AuthService,
          useValue: {
            getCurrentUser: jasmine.createSpy().and.resolveTo(null),
            userName$: of("Usuario Gratis"),
            userUid$: of("u-free"),
          },
        },
      ],
    });

    const fixture2 = TestBed.createComponent(Formulario2Component);
    fixture2.detectChanges();
    const comp2 = fixture2.componentInstance;
    comp2.formulario.setValue({
      entrenamiento: "Pesas",
      fecha: "2099-01-01",
      turno: "Mañana",
    });
    await comp2.enviarFormulario();
    expect(trainingSpy.createBooking).not.toHaveBeenCalled();
    expect(comp2.error).toContain("membresía activa");

    const fixture3 = TestBed.createComponent(Formulario3Component);
    fixture3.detectChanges();
    const comp3 = fixture3.componentInstance;
    comp3.nuevo = {
      clase: "Box",
      fecha: "2099-01-01",
      hora: "10:00",
      alumno: "",
    };
    await comp3.guardar();
    expect(trainingSpy.createAttendance).not.toHaveBeenCalled();
    expect(comp3.error).toContain("membresía activa");
  });

  it("treats empty gym_user payloads as unauthenticated in Formulario2Component and Formulario3Component", () => {
    localStorage.setItem("gym_user", JSON.stringify({}));
    TestBed.configureTestingModule({
      imports: [Formulario2Component, Formulario3Component],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Firestore, useValue: {} },
        {
          provide: AuthService,
          useValue: {
            getCurrentUser: jasmine.createSpy().and.resolveTo(null),
            userName$: of(null),
            userUid$: of(null),
          },
        },
      ],
    });

    const fixture2 = TestBed.createComponent(Formulario2Component);
    fixture2.detectChanges();
    expect(fixture2.componentInstance.authenticated).toBeFalse();

    const fixture3 = TestBed.createComponent(Formulario3Component);
    fixture3.detectChanges();
    expect(fixture3.componentInstance.authenticated).toBeFalse();
  });
});
