import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { Router, RouterModule } from "@angular/router";
import { isPureReceptionUser, readGymUser } from "../../../../core/auth/route.guards";
import { CapacitorNativeService } from "../../../../core/mobile/capacitor-native.service";
import { isMobileVersion } from "../../../../core/mobile/is-mobile";
import { IconComponent } from "../../../../shared/ui/icon/icon.component";

export interface BottomNavItem {
  id: string;
  label: string;
  icon: string;
  path?: string;
  isAction?: boolean;
}

@Component({
  selector: "app-bottom-nav",
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  templateUrl: "./bottom-nav.component.html",
  styleUrl: "./bottom-nav.component.css",
})
export class BottomNavComponent {
  readonly router = inject(Router);
  readonly native = inject(CapacitorNativeService);
  readonly isMobile = isMobileVersion();

  get items(): BottomNavItem[] {
    if (isPureReceptionUser(readGymUser())) {
      return [
        { id: "qr", label: "Mostrar QR", icon: "check", path: "/scanner" },
        { id: "asistencia", label: "Asistencias", icon: "calendar", path: "/editar2" },
        { id: "reservas", label: "Reservas", icon: "clock", path: "/editar1" },
        { id: "cuenta", label: "Clave", icon: "user", path: "/change" },
        { id: "menu", label: "Más", icon: "menu", isAction: true },
      ];
    }
    return [
      { id: "home", label: "Inicio", icon: "monitor", path: "/home" },
      { id: "qr", label: "Acceso QR", icon: "check", path: "/f3" },
      { id: "coach", label: "Coach IA", icon: "spark", path: "/coach-ia" },
      { id: "cuenta", label: "Cuenta", icon: "calendar", path: "/estado-cuenta" },
      { id: "menu", label: "Más", icon: "menu", isAction: true },
    ];
  }

  isActive(path?: string): boolean {
    if (!path) return false;
    const current = this.router.url.split("?")[0];
    if (path === "/home") {
      return current === "/" || current === "/home";
    }
    return current.startsWith(path);
  }

  onItemClick(item: BottomNavItem): void {
    this.native.hapticFeedback("light");
    if (item.isAction && item.id === "menu") {
      this.native.requestOpenDrawer();
    }
  }
}
