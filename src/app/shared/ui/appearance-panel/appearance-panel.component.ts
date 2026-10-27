import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { DialogRef } from "@angular/cdk/dialog";
import {
  ThemePreference,
  ThemeService,
} from "../../../core/theme/theme.service";
import { AccessibilityService } from "../../../core/accessibility/accessibility.service";
import { IconComponent } from "../icon/icon.component";
import { ButtonDirective } from "../button.directive";

@Component({
  selector: "app-appearance-panel",
  standalone: true,
  imports: [CommonModule, IconComponent, ButtonDirective],
  templateUrl: "./appearance-panel.component.html",
  styleUrl: "./appearance-panel.component.css",
})
export class AppearancePanelComponent {
  readonly dialog = inject(DialogRef);
  readonly theme = inject(ThemeService);
  readonly accessibility = inject(AccessibilityService);
  readonly themes: { value: ThemePreference; label: string; icon: string }[] = [
    { value: "light", label: "Claro", icon: "sun" },
    { value: "dark", label: "Oscuro", icon: "moon" },
    { value: "system", label: "Sistema", icon: "monitor" },
  ];
}
