import { Component, inject } from "@angular/core";
import { Router, RouterOutlet } from "@angular/router";
import { CapacitorNativeService } from "./core/mobile/capacitor-native.service";
import { ThemeService } from "./core/theme/theme.service";
import { FooterComponent } from "./layouts/public/ui/footer/footer.component";
import { NavbarComponent } from "./layouts/public/ui/navbar/navbar.component";
import { BottomNavComponent } from "./layouts/public/ui/bottom-nav/bottom-nav.component";
import { RouteHeadingComponent } from "./shared/ui/route-heading/route-heading.component";
import { StorageNoticeComponent } from "./shared/ui/storage-notice/storage-notice.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    RouterOutlet,
    StorageNoticeComponent,
    NavbarComponent,
    BottomNavComponent,
    FooterComponent,
    RouteHeadingComponent,
  ],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css",
})
export class AppComponent {
  readonly router = inject(Router);
  readonly title = "GROM 21";
  // Initialize the live system listener after theme-init.js has handled first paint.
  readonly theme = inject(ThemeService);
  readonly native = inject(CapacitorNativeService);
}
