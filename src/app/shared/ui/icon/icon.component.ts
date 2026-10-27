import { Component, Input } from "@angular/core";

const PATHS: Record<string, string> = {
  arrow: "M5 12h14m-6-6 6 6-6 6",
  external: "M7 17 17 7M7 7h10v10",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5",
  moon: "M20.4 13A8.5 8.5 0 0 1 11 3.6 8.5 8.5 0 1 0 20.4 13Z",
  monitor: "M4 4h16v12H4zM8 21h8m-4-5v5",
  search: "M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Zm5.5 13 5 5",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "m6 6 12 12M6 18 18 6",
  chevron: "m6 9 6 6 6-6",
  user: "M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM4 21v-2a8 8 0 0 1 16 0v2",
  accessibility:
    "M12 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM4 8l8 2 8-2m-8 2v5m0 0-4 7m4-7 4 7",
  check: "m5 12 4 4L19 6",
  plus: "M5 12h14M12 5v14",
  minus: "M5 12h14",
  play: "m8 4 12 8-12 8V4Z",
  pause: "M8 4v16M16 4v16",
  stop: "M5 5h14v14H5z",
  pin: "M12 22s8-8 8-13a8 8 0 1 0-16 0c0 5 8 13 8 13Zm0-16a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2",
  calendar: "M4 5h16v16H4zM8 2v6m8-6v6M4 10h16",
  mail: "M3 5h18v14H3zM3 5l9 7 9-7",
  logout: "M9 4H4v16h5m4-12 4 4-4 4m-5-4h13",
  spark: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
};

@Component({
  selector: "app-icon",
  standalone: true,
  template:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path [attr.d]="path"></path></svg>',
  styles: [
    ":host{display:inline-flex;flex:0 0 auto;width:1.25em;height:1.25em;vertical-align:middle}svg{width:100%;height:100%}",
  ],
})
export class IconComponent {
  @Input() name = "arrow";
  get path(): string {
    return PATHS[this.name] || PATHS["arrow"];
  }
}
