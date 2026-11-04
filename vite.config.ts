import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { checkGuide } from './scripts/check-public-data.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const guidePath = join(root, 'src/data/guide.json');
const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/** Fill the page title and link-preview text from the guide's settings. */
function guideMeta(): Plugin {
  return {
    name: 'guide-meta',
    transformIndexHtml(html) {
      const { settings } = JSON.parse(readFileSync(guidePath, 'utf8'));
      return html
        .replaceAll('%GUIDE_TITLE%', escapeHtml(settings.title))
        .replaceAll('%GUIDE_INTRO%', escapeHtml(settings.intro));
    },
  };
}

/**
 * Preview on this computer only (npm run dev): the editor's Save button writes
 * src/data/guide.json and new photos here, after the same privacy check as the build.
 * Not part of the published site.
 */
function localSave(): Plugin {
  const photoPath = /^public\/images\/(?:thumbnails\/)?places\/[A-Za-z0-9_-]+\.jpg$/;
  return {
    name: 'guide-local-save',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__guide/save', async (req, res) => {
        const reply = (status: number, text: string) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(text);
        };
        // Only the editor on this same address may save.
        const origin = req.headers.origin;
        if (req.method !== 'POST' || req.headers['x-guide-editor'] !== '1' || (origin && new URL(origin).host !== req.headers.host)) {
          return reply(403, 'Not allowed.');
        }
        let body = '';
        for await (const chunk of req) {
          body += chunk;
          if (body.length > 40_000_000) return reply(413, 'That is too big to save.');
        }
        try {
          const { guide, files } = JSON.parse(body) as { guide: string; files: { path: string; base64: string }[] };
          if (files.some((file) => !photoPath.test(file.path))) return reply(400, 'A photo had an unexpected file name.');
          for (const file of files) {
            mkdirSync(dirname(join(root, file.path)), { recursive: true });
            writeFileSync(join(root, file.path), Buffer.from(file.base64, 'base64'));
          }
          const problems = checkGuide(JSON.parse(guide), root);
          if (problems.length) return reply(400, problems.join('\n'));
          writeFileSync(guidePath, guide);
          reply(200, 'Saved');
        } catch (error) {
          reply(400, `Could not save: ${error instanceof Error ? error.message : 'unknown error'}`);
        }
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), guideMeta(), localSave()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { host: '127.0.0.1' },
  build: {
    rolldownOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        editor: fileURLToPath(new URL('./editor.html', import.meta.url)),
        preview: fileURLToPath(new URL('./preview.html', import.meta.url)),
      },
    },
  },
});
