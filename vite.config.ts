import basicSsl from '@vitejs/plugin-basic-ssl';
import EnvironmentPlugin from 'vite-plugin-environment';

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from 'fs';


// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 8888,
    //     https: {
    //  key: fs.readFileSync(path.resolve(__dirname, 'certs/localhost+2-key.pem')),
    //  cert: fs.readFileSync(path.resolve(__dirname, 'certs/localhost+2.pem')),
    // }

  },
  plugins: [
    react(),
    EnvironmentPlugin('all'),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@context": path.resolve(__dirname, "./src/context"),
      "@hooks": path.resolve(__dirname, "./src/hooks"),
      "@lib": path.resolve(__dirname, "./src/lib"),
      "@pages": path.resolve(__dirname, "./src/pages"),
    },
  },
});
