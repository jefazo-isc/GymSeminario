import { Component, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { Dialog, DialogModule } from "@angular/cdk/dialog";
import { BrandComponent } from "../../shared/ui/brand/brand.component";
import { IconComponent } from "../../shared/ui/icon/icon.component";
import { ButtonDirective } from "../../shared/ui/button.directive";
import { AppearancePanelComponent } from "../../shared/ui/appearance-panel/appearance-panel.component";

@Component({
  selector: "app-footer",
  standalone: true,
  imports: [
    RouterLink,
    DialogModule,
    BrandComponent,
    IconComponent,
    ButtonDirective,
  ],
  templateUrl: "./footer.component.html",
  styleUrl: "./footer.component.css",
})
export class FooterComponent {
  readonly date = new Date().getFullYear();
  readonly email = "gromfitnesscenter@gmail.com";
  private readonly dialog = inject(Dialog);
  openPreferences(): void {
    this.dialog.open(AppearancePanelComponent, {
      width: "440px",
      maxWidth: "calc(100vw - 24px)",
      panelClass: "grom-dialog",
      backdropClass: "grom-backdrop",
      ariaLabelledBy: "appearance-title",
      autoFocus: ".settings-close",
      restoreFocus: true,
    });
  }
}
