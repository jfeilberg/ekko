import { defineSandbox } from 'ekko';

// Chromium's runtime shared libraries (NSPR/NSS, X libs, fontconfig deps, …).
// The Vercel Sandbox runs Amazon Linux 2023, which Playwright's own
// `install --with-deps` does NOT support (it only knows apt-get, so it exits
// 127 and the browser fails to launch with "libnspr4.so: cannot open shared
// object file"). We install the libs ourselves via dnf as passwordless root.
const CHROMIUM_LIBS = [
  'nss', 'nspr', 'atk', 'at-spi2-atk', 'at-spi2-core', 'cups-libs', 'libdrm',
  'libxkbcommon', 'libXcomposite', 'libXdamage', 'libXext', 'libXfixes',
  'libXrandr', 'mesa-libgbm', 'pango', 'cairo', 'alsa-lib', 'libX11', 'libxcb',
  'libXrender',
];

export default defineSandbox({
  runtime: 'node22',
  setup: [
    ['npm', ['init', '-y']],
    ['npm', ['install', 'playwright-core']],
    ['npx', ['--yes', 'playwright', 'install', 'chromium-headless-shell']],
    // Install Chromium's system libraries (dnf, not Playwright's apt-only deps).
    ['sudo', ['dnf', 'install', '-y', ...CHROMIUM_LIBS]],
  ],
});
