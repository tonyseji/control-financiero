import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: {
    outDir: 'dist',
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
  },
  server: {
    port: 3000,
    open: true,
  }
})
