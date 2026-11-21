import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import path from "path";

function babelPluginAddDataPath() {
  const projectRoot = path.resolve(__dirname, "..");

  return {
    visitor: {
      JSXOpeningElement(nodePath, state) {
        const { node } = nodePath;
        const tagName = node.name.name;

        // Solo elementi HTML nativi (lowercase)
        if (typeof tagName === "string" && tagName === tagName.toLowerCase()) {
          const filename = state.file.opts.filename;
          const relativePath = path.relative(projectRoot, filename);

          // Verifica se data-path esiste già
          const hasDataPath = node.attributes.some(
            (attr) => attr.name && attr.name.name === "data-path",
          );

          if (!hasDataPath) {
            // Aggiungi l'attributo data-path
            node.attributes.push({
              type: "JSXAttribute",
              name: {
                type: "JSXIdentifier",
                name: "data-path",
              },
              value: {
                type: "StringLiteral",
                value: relativePath,
              },
            });
          }
        }
      },
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [mode === "development" && babelPluginAddDataPath].filter(
          Boolean,
        ),
      },
    }),
  ],
  // @ds alias for the components directory
  resolve: {
    alias: {
      "@components": path.resolve(__dirname, "./src/components"),
      "@images": path.resolve(__dirname, "./src/assets/images"),
      "@constants": path.resolve(__dirname, "./src/constants"),
      "@context": path.resolve(__dirname, "./src/context"),
      "@assets": path.resolve(__dirname, "./src/assets"),
      "@views": path.resolve(__dirname, "./src/views"),
      "@utils": path.resolve(__dirname, "./src/utils"),
      "@ds": path.resolve(__dirname, "./src/ds"),
    },
  },
  server: {
    proxy: {
      // Proxy API requests to the Go backend in development
      "/api": {
        target: "http://localhost:8012",
        changeOrigin: true,
      },
    },
  },
});
