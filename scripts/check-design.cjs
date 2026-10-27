// Dependency-free checks for the pre-paint script and semantic color pairs.
const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const bootstrap = fs.readFileSync("public/theme-init.js", "utf8");
for (const [stored, systemDark, blocked, expected] of [
  [null, false, false, "light"],
  [null, true, false, "dark"],
  ["light", true, false, "light"],
  ["dark", false, false, "dark"],
  ["system", true, false, "dark"],
  ["invalid", true, false, "dark"],
  [null, true, true, "dark"],
]) {
  const attributes = {};
  const root = {
    setAttribute: (name, value) => (attributes[name] = value),
    style: {},
  };
  vm.runInNewContext(bootstrap, {
    document: { documentElement: root },
    window: {
      get localStorage() {
        if (blocked) throw Error("Storage blocked");
        return { getItem: () => stored };
      },
      matchMedia: () => ({ matches: systemDark }),
    },
  });
  assert.equal(attributes["data-theme"], expected);
  assert.equal(root.style.colorScheme, expected);
}

const css = fs.readFileSync("src/styles/tokens.css", "utf8");
const block = (selector) =>
  css.match(new RegExp(`${selector}\\s*\\{([^}]+)\\}`))[1];
const colors = (source) =>
  Object.fromEntries(
    [...source.matchAll(/--color-([\w-]+):\s*(#[\da-f]{6})/gi)].map((m) => [
      m[1],
      m[2],
    ]),
  );
const light = colors(block(":root"));
const dark = { ...light, ...colors(block(":root\\[data-theme=['\"]dark['\"]\\]")) };
function luminance(hex) {
  const channels = hex
    .slice(1)
    .match(/../g)
    .map((c) => parseInt(c, 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function ratio(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
const pairs = [
  ...["bg", "surface", "surface-secondary", "surface-raised"].flatMap((bg) =>
    ["text", "text-secondary", "accent"].map((fg) => [fg, bg, 4.5]),
  ),
  ["on-action", "action", 4.5],
  ["on-action", "action-hover", 4.5],
  ["accent", "accent-soft", 4.5],
  ["success", "success-soft", 4.5],
  ["warning", "warning-soft", 4.5],
  ["danger", "danger-soft", 4.5],
  ["focus", "bg", 3],
  ["focus", "surface", 3],
  ...[1, 2, 3, 4, 5].map((i) => [`chart-${i}`, "surface", 3]),
];
for (const [name, palette] of [
  ["Claro", light],
  ["Oscuro", dark],
]) {
  for (const [foreground, background, minimum] of pairs) {
    const value = ratio(palette[foreground], palette[background]);
    assert.ok(
      value >= minimum,
      `${name}: ${foreground}/${background} = ${value.toFixed(2)} < ${minimum}`,
    );
  }
  console.log(
    `${name}: ${pairs.length} combinaciones verificadas. Texto/superficie ${ratio(palette.text, palette.surface).toFixed(2)}:1; secundario/superficie ${ratio(palette["text-secondary"], palette.surface).toFixed(2)}:1; botón ${ratio(palette["on-action"], palette.action).toFixed(2)}:1.`,
  );
}
console.log(
  "Pre-paint: 7 escenarios verificados, incluido almacenamiento bloqueado.",
);
