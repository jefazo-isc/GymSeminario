import { Component, inject } from "@angular/core";
import { Router, RouterOutlet } from "@angular/router";
import { NavbarComponent } from "./components/navbar/navbar.component";
import { FooterComponent } from "./components/footer/footer.component";
import { ThemeService } from "./core/theme/theme.service";
import { RouteHeadingComponent } from "./shared/ui/route-heading/route-heading.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    RouterOutlet,
    NavbarComponent,
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
}
