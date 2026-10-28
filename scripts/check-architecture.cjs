const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const walk = (directory) =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
const files = walk("src/app");
const errors = [];
let pages = 0;
for (const file of files.filter(
  (name) =>
    name.endsWith(".ts") &&
    !name.endsWith(".spec.ts") &&
    !name.includes(`${path.sep}testing${path.sep}`),
)) {
  const source = fs.readFileSync(file, "utf8");
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const visit = (node) => {
    if (node.kind === ts.SyntaxKind.AnyKeyword)
      errors.push(`${file}: explicit any at a production boundary`);
    if (
      ts.isPropertyAssignment(node) &&
      ts.isIdentifier(node.name) &&
      ["templateUrl", "styleUrl"].includes(node.name.text) &&
      ts.isStringLiteral(node.initializer)
    ) {
      if (
        !fs.existsSync(path.resolve(path.dirname(file), node.initializer.text))
      )
        errors.push(`${file}: missing ${node.initializer.text}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  if (
    file.includes(`${path.sep}pages${path.sep}`) &&
    file.endsWith(".component.ts")
  ) {
    pages++;
    if (
      /\blocalStorage\b|\bHttpClient\b|from\s+['"](?:@angular\/fire\/firestore|firebase\/firestore)['"]/.test(
        source,
      )
    )
      errors.push(`${file}: page bypasses its data adapter`);
  }
}
if (
  /declare\s+module\s+['"]firebase\//.test(
    fs.readFileSync("src/types.d.ts", "utf8"),
  )
)
  errors.push("Firebase SDK types are shadowed");
if (/component\s*:/.test(fs.readFileSync("src/app/app.routes.ts", "utf8")))
  errors.push("A route eagerly imports its feature");
for (const library of [
  "font-awesome",
  "bootstrap",
  "boxicons",
  "paypal.com/sdk",
]) {
  if (fs.readFileSync("src/index.html", "utf8").includes(library))
    errors.push(`index.html eagerly loads retired/lazy resource: ${library}`);
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `Architecture OK: ${pages} pages use data boundaries; production sources have no explicit any; SDK types, resources and lazy routes checked.`,
  );
