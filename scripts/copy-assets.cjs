/**
 * Copy Assets Script
 * Copies built files and assets to the dist directory for loading in Chrome
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

// Ensure dist directory exists
if (!fs.existsSync(DIST)) {
  fs.mkdirSync(DIST, { recursive: true });
}

/**
 * Copy directory recursively
 */
function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`Source not found: ${src}`);
    return false;
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }

  return true;
}

/**
 * Copy file
 */
function copyFile(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`File not found: ${src}`);
    return false;
  }

  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  fs.copyFileSync(src, dest);
  return true;
}

console.log('Copying assets...\n');

// Angular app is built directly to dist/app by angular.json
// Check if it exists (ng build should have created it)
const angularBuildDir = path.join(DIST, 'app', 'browser');
if (fs.existsSync(angularBuildDir)) {
  // Move contents from dist/app/browser to dist/app
  const entries = fs.readdirSync(angularBuildDir);
  for (const entry of entries) {
    const src = path.join(angularBuildDir, entry);
    const dest = path.join(DIST, 'app', entry);
    if (fs.statSync(src).isDirectory()) {
      copyDir(src, dest);
    } else {
      fs.copyFileSync(src, dest);
    }
  }
  // Remove the browser subdirectory
  fs.rmSync(angularBuildDir, { recursive: true });
  console.log('✓ Angular app flattened in dist/app');
} else if (fs.existsSync(path.join(DIST, 'app', 'index.html'))) {
  console.log('✓ Angular app already in dist/app');
} else {
  console.log('⚠ Angular build not found. Run: npm run build:angular');
}

// Content and background scripts are built directly to dist/ by esbuild
if (fs.existsSync(path.join(DIST, 'content', 'content-script.js'))) {
  console.log('✓ Content scripts present');
} else {
  console.log('⚠ Content scripts not found. Run: npm run build:content');
}

if (fs.existsSync(path.join(DIST, 'background', 'service-worker.js'))) {
  console.log('✓ Background scripts present');
} else {
  console.log('⚠ Background scripts not found. Run: npm run build:background');
}

// Copy icons from root
const iconsSrc = path.join(ROOT, 'icons');
const iconsDest = path.join(DIST, 'icons');
if (copyDir(iconsSrc, iconsDest)) {
  console.log('✓ Icons copied');
}

// Copy manifest from root
const manifestSrc = path.join(ROOT, 'manifest.json');
const manifestDest = path.join(DIST, 'manifest.json');
if (copyFile(manifestSrc, manifestDest)) {
  console.log('✓ Manifest copied');
}

// Copy page injector (for web_accessible_resources)
const injectorSrc = path.join(ROOT, 'src', 'chrome', 'content', 'page-injector.js');
const injectorDest = path.join(DIST, 'content', 'page-injector.js');
if (copyFile(injectorSrc, injectorDest)) {
  console.log('✓ Page injector copied');
}

// Copy content styles
const stylesSrc = path.join(ROOT, 'src', 'chrome', 'content', 'content-styles.css');
const stylesDest = path.join(DIST, 'content', 'content-styles.css');
if (copyFile(stylesSrc, stylesDest)) {
  console.log('✓ Content styles copied');
}

// Copy reading styles
const readingStylesSrc = path.join(ROOT, 'src', 'chrome', 'content', 'reading-styles.css');
const readingStylesDest = path.join(DIST, 'content', 'reading-styles.css');
if (copyFile(readingStylesSrc, readingStylesDest)) {
  console.log('✓ Reading styles copied');
}

// Check reading content script
if (fs.existsSync(path.join(DIST, 'content', 'reading-content-script.js'))) {
  console.log('✓ Reading content script present');
} else {
  console.log('⚠ Reading content script not found. Run: npm run build:reading');
}

// Copy PDF.js library
const libsSrc = path.join(ROOT, 'libs');
const libsDest = path.join(DIST, 'libs');
if (copyDir(libsSrc, libsDest)) {
  console.log('✓ PDF.js library copied');
} else {
  console.log('⚠ PDF.js library not found in libs/');
}

console.log('\n✓ Done! Extension ready to load in Chrome.');
console.log('  Load the "dist" folder at chrome://extensions');
