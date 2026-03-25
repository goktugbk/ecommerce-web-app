// scripts/codemods/button-codemod.ts
import { Project, SyntaxKind, JsxOpeningElement, QuoteKind } from "ts-morph";
import { glob } from "glob";
import fs from "fs";

const BTN_IMPORT = "@/components/ui/Button";

// ---- CLI flags ----
const WRITE = process.argv.includes("--write"); // --write vermezseniz sadece raporlar
const VERBOSE = process.argv.includes("--verbose");

// ---- Dosyaları topla ----
const files = glob.sync("src/**/*.{ts,tsx}", { nodir: true });
if (files.length === 0) {
  console.log("No TS/TSX files found under src/");
  process.exit(0);
}

// ---- Proje oluştur ----
const project = new Project({
  // tsconfig’e bağımlı olmayalım; dosyaları kendimiz ekleyeceğiz
  manipulationSettings: { quoteKind: QuoteKind.Double },
});
files.forEach((f) => {
  const text = fs.readFileSync(f, "utf8");
  project.createSourceFile(f, text, { overwrite: true });
});

function ensureButtonImport(sf: import("ts-morph").SourceFile) {
  const imports = sf.getImportDeclarations().filter((d) => d.getModuleSpecifierValue() === BTN_IMPORT);
  if (imports.length === 0) {
    sf.addImportDeclaration({ moduleSpecifier: BTN_IMPORT, namedImports: [{ name: "Button" }] });
  } else {
    const imp = imports[0];
    const has = imp.getNamedImports().some((n) => n.getName() === "Button");
    if (!has) imp.addNamedImport({ name: "Button" });
  }
}

function pickVariant(className: string | undefined) {
  if (!className) return undefined;
  if (/\bbg-(black|primary)\b/.test(className) || /\btext-white\b/.test(className)) return "default";
  if (/\bbg-red|text-red|destructive\b/.test(className)) return "destructive";
  if (/\bborder\b/.test(className)) return "outline";
  if (/\bbg-gray|text-gray|secondary\b/.test(className)) return "secondary";
  if (/\bunderline\b/.test(className)) return "link";
  return undefined;
}

function pickSize(className: string | undefined) {
  if (!className) return undefined;
  if (/\bh-10\b|\bpx-6\b|\bpy-3\b/.test(className)) return "lg";
  if (/\bh-8\b|\bpx-3\b|\bpy-1\b/.test(className)) return "sm";
  return undefined;
}

let filesChanged = 0;
let buttonsChanged = 0;

for (const sf of project.getSourceFiles()) {
  let changedInFile = 0;

  const buttons = sf.getDescendantsOfKind(SyntaxKind.JsxOpeningElement)
    .filter((n: JsxOpeningElement) => n.getTagNameNode().getText() === "button");

  if (buttons.length === 0) continue;

  buttons.forEach((open) => {
    // <button> -> <Button>
    open.getTagNameNode().replaceWithText("Button");

    // className değerini çıkar
    let className: string | undefined;
    const classAttr = open.getAttribute("className");
    if (classAttr && classAttr.getKind() === SyntaxKind.JsxAttribute) {
      const lit = classAttr.getFirstDescendantByKind(SyntaxKind.StringLiteral);
      if (lit) className = lit.getLiteralText();
    }

    // variant/size tahmin et; yoksa ekle
    const variant = pickVariant(className);
    const size = pickSize(className);
    if (variant && !open.getAttribute("variant")) open.addAttribute({ name: "variant", initializer: `"${variant}"` });
    if (size && !open.getAttribute("size")) open.addAttribute({ name: "size", initializer: `"${size}"` });

    changedInFile++;
    buttonsChanged++;
  });

  if (changedInFile > 0) {
    ensureButtonImport(sf);
    filesChanged++;
    if (VERBOSE) console.log(`Updated ${changedInFile} button(s) in ${sf.getFilePath()}`);
  }
}

if (filesChanged === 0) {
  console.log("No <button> tags found to transform.");
} else {
  console.log(`Would update ${buttonsChanged} button(s) across ${filesChanged} file(s).`);
}

if (WRITE) {
  project.saveSync();
  console.log("Changes written. Run prettier/eslint to format.");
} else {
  console.log("Dry run: add --write to apply changes.");
}
