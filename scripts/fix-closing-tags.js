import { glob } from "glob";
import fs from "fs";

const files = await glob("src/**/*.tsx");

let fixedCount = 0;
for (const f of files) {
  let text = fs.readFileSync(f, "utf8");
  const newText = text.replace(/<\/button\s*>/g, "</Button>");
  if (newText !== text) {
    fs.writeFileSync(f, newText, "utf8");
    console.log("Fixed:", f);
    fixedCount++;
  }
}
console.log(`Done. Fixed ${fixedCount} files.`);
