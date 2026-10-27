import { Directive, Input } from "@angular/core";

@Directive({
  selector: "button[appButton], a[appButton]",
  standalone: true,
  host: {
    class: "ui-button",
    "[class.ui-button--primary]": 'variant === "primary"',
    "[class.ui-button--secondary]": 'variant === "secondary"',
    "[class.ui-button--ghost]": 'variant === "ghost"',
  },
})
export class ButtonDirective {
  @Input("appButton") variant: "primary" | "secondary" | "ghost" | "" =
    "primary";
}
