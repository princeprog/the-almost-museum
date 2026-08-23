import { FlatCompat } from "@eslint/eslintrc";
import { globalIgnores } from "eslint/config";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  globalIgnores(["next-env.d.ts", ".next/**", ".worktrees/**", "out/**", "public/sw*.js", "public/swe-worker-*.js"]),
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
