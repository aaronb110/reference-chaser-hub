import fs from "fs";
import path from "path";

const files = [
  "lib/supabaseClient",
  "types/models",
  "components/layout/DashboardLayout",
];

for (const p of files) {
  const tsFile = path.resolve("src", p + ".ts");
  const tsxFile = path.resolve("src", p + ".tsx");
  const exists = fs.existsSync(tsFile) || fs.existsSync(tsxFile);
  console.log(`${exists ? "✅ Found:" : "❌ Missing:"} ${p}`);
}
