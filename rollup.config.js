import svelte from "rollup-plugin-svelte";
import resolve from "@rollup/plugin-node-resolve";

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const pkg = require("./package.json");

export default {
    input: "src/ImageSlider.svelte",
    output: [
        { file: pkg.module, format: "es" },
        { file: pkg.main, format: "umd", name: "Name" },
    ],
    plugins: [svelte({
        emitCss: false,
    }), resolve({
        browser: true,
        exportConditions: ["svelte"],
        extensions: [".mjs", ".js", ".svelte"],
    })],
};