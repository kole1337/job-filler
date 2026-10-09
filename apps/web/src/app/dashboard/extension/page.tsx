import { existsSync } from 'node:fs';
import path from 'node:path';
import { InstallGuide } from '@/components/InstallGuide';

// Checks the build output on disk on every request, so building the extension
// and refreshing is enough to update the steps.
export const dynamic = 'force-dynamic';

// The portal runs from apps/web (`npm run dev:web` / `npm start`), and WXT
// builds into packages/extension/.output.
const OUTPUT_DIR = path.resolve(process.cwd(), '../../packages/extension/.output');

export default function ExtensionPage() {
  const chromeDir = path.join(OUTPUT_DIR, 'chrome-mv3');
  const firefoxManifest = path.join(OUTPUT_DIR, 'firefox-mv2', 'manifest.json');

  return (
    <div>
      <h1 className="text-2xl font-bold">Install the browser extension</h1>
      <p className="mb-6 mt-1 text-sm text-gray-600 dark:text-gray-400">
        The extension reads the profile you saved here and fills it into Workday, Greenhouse, Lever and Ashby
        applications. It isn’t in the browser stores yet, so it’s installed from the copy built on this computer.
      </p>
      <InstallGuide
        build={{
          chromeDir,
          chromeBuilt: existsSync(path.join(chromeDir, 'manifest.json')),
          firefoxManifest,
          firefoxBuilt: existsSync(firefoxManifest),
        }}
      />
    </div>
  );
}
