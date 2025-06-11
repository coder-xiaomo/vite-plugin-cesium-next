import { defineConfig } from 'vite';
import cesium from 'vite-plugin-cesium-next';

export default defineConfig({
  plugins: [cesium()]
});
