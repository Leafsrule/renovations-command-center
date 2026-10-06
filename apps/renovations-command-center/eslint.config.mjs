import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
const config = [{ignores:[".next/**","node_modules/**","out/**","build/**","dist/**","coverage/**","next-env.d.ts"]},...nextVitals,...nextTs];

export default config;
