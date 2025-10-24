const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

let dotenv;
try {
  dotenv = require('dotenv');
} catch (primaryError) {
  try {
    const servicePackageJson = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(servicePackageJson)) {
      const serviceRequire = createRequire(servicePackageJson);
      dotenv = serviceRequire('dotenv');
    } else {
      throw primaryError;
    }
  } catch (_serviceError) {
    throw primaryError;
  }
}

const projectRoot = path.resolve(__dirname, '../../..');
const envFiles = [
  path.join(projectRoot, 'config/container-images.env'),
  path.join(projectRoot, 'config/.env.defaults'),
  path.join(projectRoot, '.env'),
  path.join(projectRoot, '.env.local'),
];

function loadEnvironment() {
  envFiles.forEach((file, index) => {
    if (fs.existsSync(file)) {
      dotenv.config({ path: file, override: index >= 2 });
    }
  });
}

loadEnvironment();

module.exports = loadEnvironment;
