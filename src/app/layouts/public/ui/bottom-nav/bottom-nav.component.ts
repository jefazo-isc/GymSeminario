import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { Router, RouterModule } from "@angular/router";
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

  readonly items: BottomNavItem[] = [
    { id: "home", label: "Inicio", icon: "monitor", path: "/home" },
    { id: "actividad", label: "Actividad", icon: "play", path: "/ejercicios" },
    { id: "coach", label: "Coach IA", icon: "spark", path: "/coach-ia" },
    { id: "cuenta", label: "Cuenta", icon: "calendar", path: "/estado-cuenta" },
    { id: "menu", label: "Más", icon: "menu", isAction: true },
  ];

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
