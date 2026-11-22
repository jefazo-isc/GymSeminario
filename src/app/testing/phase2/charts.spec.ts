import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { GraficosComponent } from "../../features/admin/pages/graficos/graficos.component";

describe("Statistics integrity", () => {
  const url = "https://gymseminario.onrender.com/api/sessions/stats";
  beforeEach(() => {
    localStorage.removeItem("gym_user");
    TestBed.configureTestingModule({
      imports: [GraficosComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
  });
  afterEach(() => {
    localStorage.removeItem("gym_user");
    TestBed.inject(HttpTestingController).verify();
  });
  it("does not turn missing API values into invented zeroes", () => {
    const fixture = TestBed.createComponent(GraficosComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne(url).flush({ Boxeo: 2 });
    expect(fixture.componentInstance.barChartData.datasets[0].data).toEqual([
      2,
      null,
      null,
      null,
      null,
    ]);
    expect(fixture.componentInstance.totalSessions).toBe(2);
  });
  it("keeps the last real data and timestamp when a later refresh fails", () => {
    const fixture = TestBed.createComponent(GraficosComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(url).flush({ Boxeo: 2 });
    const date = fixture.componentInstance.lastUpdate;
    fixture.componentInstance.load();
    http.expectOne(url).flush(null, { status: 503, statusText: "Unavailable" });
    expect(fixture.componentInstance.hasData).toBeTrue();
    expect(fixture.componentInstance.error).toBeTrue();
    expect(fixture.componentInstance.lastUpdate).toBe(date);
    expect(fixture.componentInstance.totalSessions).toBe(2);
  });

  it("loads live floor, forecast, RBAC users, and expiring alerts for authenticated admins", () => {
    localStorage.setItem(
      "gym_user",
      JSON.stringify({
        uid: "admin-1",
        nombre: "Admin",
        email: "admin@gymseminario.com",
        role: "admin",
      }),
    );

    const fixture = TestBed.createComponent(GraficosComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);

    http.expectOne(url).flush({
      Boxeo: 4,
      Crossfit: 6,
      attendancesByDiscipline: { Boxeo: 3, Crossfit: 5 },
      hourlyOccupancy: { Matutino: 4, Vespertino: 6, Nocturno: 0 },
      totalBookings: 10,
      totalAttendances: 8,
      activeMemberships: 15,
      totalRevenue: 9500,
    });
    http
      .expectOne("https://gymseminario.onrender.com/api/sessions/live")
      .flush({
        liveOccupancy: 1,
        attendances: [
          {
            id: "att-1",
            clase: "Crossfit",
            nombre: "Socio Vivo",
            hora: "18:10",
            fecha: "2026-11-22",
            plan: "Pro Fitness",
          },
        ],
      });
    http
      .expectOne("https://gymseminario.onrender.com/api/analytics/forecast")
      .flush({
        peakShift: "Vespertino",
        peakHourWindow: "17:00 - 20:00",
        topDiscipline: "Crossfit",
        shiftDistribution: { Matutino: 4, Vespertino: 6, Nocturno: 0 },
        staffingRecommendation: "2 entrenadores en piso",
        cleaningRecommendation: "Sanitizar rack a las 17:30",
        source: "deterministic-analytics",
      });
    http
      .expectOne("https://gymseminario.onrender.com/api/auth/users")
      .flush([
        {
          id: 2,
          nombre: "Socio Uno",
          email: "socio1@example.com",
          role: "subscriber",
        },
      ]);
    http
      .expectOne(
        "https://gymseminario.onrender.com/api/admin/expiring-memberships",
      )
      .flush([
        {
          id: "MEM-1",
          userEmail: "socio1@example.com",
          nombrePlan: "Pro Fitness",
          fechaFin: "2026-11-25",
          diasRestantes: 3,
          estado: "Por vencer",
        },
      ]);

    const comp = fixture.componentInstance;
    expect(comp.totalBookings).toBe(10);
    expect(comp.totalAttendances).toBe(8);
    expect(comp.activeMembers).toBe(15);
    expect(comp.totalRevenue).toBe(9500);
    expect(comp.hourlyOccupancy.length).toBe(3);
    expect(comp.liveFloor?.activeCount).toBe(1);
    expect(comp.forecast?.peakHour).toBe("17:00 - 20:00");
    expect(comp.forecast?.windows.length).toBe(3);
    expect(comp.users.length).toBe(1);
    expect(comp.expiringMemberships.length).toBe(1);

    comp.changeUserRole(comp.users[0], "trainer");
    const roleReq = http.expectOne(
      "https://gymseminario.onrender.com/api/auth/set-role",
    );
    expect(roleReq.request.body).toEqual({ userId: 2, role: "trainer" });
    roleReq.flush({ ok: true });
    expect(comp.users[0].role).toBe("trainer");

    comp.notifyExpiring();
    const notifyReq = http.expectOne(
      "https://gymseminario.onrender.com/api/admin/notify-expiring",
    );
    notifyReq.flush({ ok: true, notifiedCount: 1, results: [{}] });
    expect(comp.adminFeedback).toContain("1 socio");

    comp.setUserPlan(comp.users[0], "Cortesía VIP");
    comp.setUserPeriod(comp.users[0], "Anual");
    comp.assignMembershipToUser(comp.users[0], "assign");
    const assignReq = http.expectOne(
      "https://gymseminario.onrender.com/api/admin/memberships/assign",
    );
    expect(assignReq.request.body).toEqual({
      userEmail: "socio1@example.com",
      email: "socio1@example.com",
      planNombre: "Cortesía VIP",
      periodo: "Anual",
      action: "assign",
      precio: 0,
    });
    assignReq.flush({
      ok: true,
      mensaje: "Membresía Cortesía VIP activada",
      membresia: {
        planNombre: "Cortesía VIP",
        estado: "Activa",
        fechaFin: "2027-11-22",
      },
    });
    http
      .expectOne("https://gymseminario.onrender.com/api/auth/users")
      .flush([
        {
          id: 2,
          nombre: "Socio Uno",
          email: "socio1@example.com",
          role: "subscriber",
          membresia: {
            plan_nombre: "Cortesía VIP",
            estado: "Activa",
            fecha_fin: "2027-11-22",
          },
        },
      ]);
    expect(comp.adminFeedback).toContain("Cortesía VIP");
    expect(comp.users[0].membresia?.planNombre).toBe("Cortesía VIP");
    expect(comp.users[0].membresia?.estado).toBe("Activa");
  });
});
