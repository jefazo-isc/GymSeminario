import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";

@Component({
  selector: "app-brand",
  standalone: true,
  imports: [RouterLink],
  template:
    '<a class="brand" routerLink="/home" aria-label="GROM 21, ir al inicio"><span class="brand-mark"><img src="img/Responsables/logo.png" width="112" height="42" alt=""></span><span class="brand-copy">Fitness center<span>Aguascalientes</span></span></a>',
  styles: [
    ":host{display:inline-flex}.brand{display:flex;align-items:center;gap:14px;color:var(--color-text);text-decoration:none}.brand-mark{display:block;background:#000;border-radius:5px;overflow:hidden;flex:0 0 auto;width:112px;height:42px}.brand-mark img{width:112px;height:42px;object-fit:cover;display:block}.brand-copy{font-size:.75rem;font-weight:500;line-height:1.5;letter-spacing:.01em;white-space:nowrap}.brand-copy>span{display:block;font-size:.625rem;color:var(--color-text-secondary);font-weight:400}@media(max-width:420px){.brand-mark,.brand-mark img{width:94px;height:38px}.brand-copy{display:none}}",
  ],
})
export class BrandComponent {}
