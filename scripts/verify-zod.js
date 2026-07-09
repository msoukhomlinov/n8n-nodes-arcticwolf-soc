'use strict';

/*
 * Postinstall integrity check for the nested `zod` dependency.
 *
 * This does NOT prevent corruption. Its job is to make a corrupted/truncated
 * zod install self-diagnosing: instead of n8n failing at startup with a cryptic
 * `Cannot find module '.../zod/index.cjs'` deep in Node's resolver, `npm install`
 * fails loudly here with a clear "zod is corrupted, reinstall" message.
 *
 * Must run standalone from the published npm tarball (no TypeScript, no dist/,
 * no dependencies beyond Node stdlib and `zod` itself).
 */

const path = require('path');

const packageRoot = path.resolve(__dirname, '..');

function fail(reason) {
  process.stderr.write(
    [
      '',
      'n8n-nodes-arcticwolf-soc: nested zod dependency is missing or corrupted.',
      '',
      `  What broke: ${reason}`,
      '',
      '  Why this happens: in shared/queue-mode n8n deployments (multiple workers',
      '  sharing one .n8n/nodes volume), a concurrent or interrupted npm install can',
      '  leave the nested node_modules/zod partially extracted or corrupted. n8n does',
      '  not re-run npm install for packages it considers already present, so the',
      '  broken install persists across restarts.',
      '',
      '  How to fix: repair the nested zod install from this package directory:',
      '',
      `    cd ${packageRoot}`,
      '    rm -rf node_modules/zod',
      '    npm install --no-save --legacy-peer-deps zod@3.25.76',
      '',
      '  Then restart n8n (and all workers, if running queue mode).',
      '',
    ].join('\n') + '\n',
  );
  process.exitCode = 1;
}

try {
  const zod = require('zod');
  if (typeof zod.z !== 'object' || zod.z === null || typeof zod.z.object !== 'function') {
    fail(
      'require("zod") resolved but does not export the expected `z` object (z.object is not a function).',
    );
  }
} catch (err) {
  fail(err && err.message ? err.message : String(err));
}
