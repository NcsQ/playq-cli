import path from "path";
import fs from "fs";
import https from "https";
import os from "os";
import readline from "readline";
import { URL } from "url";
import AdmZip from "adm-zip";
import { spinner, log } from "../utils/logger.js";

const BASE_REPO = "https://github.com/NcsQ/playq-base-project";
const DEFAULT_DIR = ".";

export default function (program) {
  // Main install command with default action (installs base)
  const install = program
    .command("install [component]")
    .description("Install PlayQ frameworks and components (default: base)")
    .option("--dir <name>", "target directory name", DEFAULT_DIR)
    .option("--release <version>", "PlayQ version or release to install", "latest")
    .option("--offline <path>", "Path to local PlayQ zip file")
    .option("--list-releases", "List all available releases")
    .action(async (component, opts) => {
      // Default to 'base' if no component specified
      const targetComponent = component || 'base';
      
      // Currently only 'base' is implemented
      if (targetComponent !== 'base') {
        log.error(`❌ Component '${targetComponent}' is not yet available.`);
        log.info("Currently supported: base");
        log.info("Coming soon: core, examples, patterniq, smartai\n");
        process.exit(1);
      }

      await installBase(opts);
    });
}

async function installBase(opts) {
  try {
    // Handle list-releases option
    if (opts.listReleases) {
      await listAvailableReleases();
      return;
    }

        // --- 🔹 Confirmation prompt ---
        const cwd = process.cwd();
        if (cwd.includes("playq-cli")) {
          log.error(
            "⚠️  You are running the CLI inside the playq-cli source directory."
          );
          log.info(
            'Please run "playq install base" from your project root or workspace instead.\n'
          );
          return;
        }
        
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const confirm = await new Promise((resolve) => {
          rl.question(
            `⚠️  You are about to install PlayQ Base in:\n${cwd}\nAre you running this command from your project root? (y/n): `,
            (answer) => {
              rl.close();
              resolve(answer.trim().toLowerCase());
            }
          );
        });

        if (confirm !== "y" && confirm !== "yes") {
          log.warn("❌ Cancelled by user.\n");
          return;
        }
        // --------------------------------

        const targetDir = path.resolve(cwd, opts.dir);
        
        // Only check if target exists when it's not current directory
        if (opts.dir !== "." && fs.existsSync(targetDir)) {
          log.error(`Target folder already exists: ${targetDir}`);
          process.exit(1);
        }
        
        // If extracting to current directory, check if it's empty
        if (opts.dir === ".") {
          const currentDirContents = fs.readdirSync(cwd).filter(item => 
            !item.startsWith('.') && item !== 'node_modules'
          );
          if (currentDirContents.length > 0) {
            log.error(`Current directory is not empty. Please run from an empty directory or specify --dir <folder>`);
            process.exit(1);
          }
        }

        let zipPath;
        let version = opts.release;

        if (opts.offline) {
          // Check if offline zip file exists
          if (!fs.existsSync(opts.offline)) {
            log.error(`Offline zip file not found: ${opts.offline}`);
            process.exit(1);
          }
          zipPath = opts.offline;
          spinner.start(`Installing PlayQ Base from offline package${opts.dir === "." ? " to current directory" : ` → ${opts.dir}`}`);
        } else {
          // Handle online download
          if (version === "latest") {
            spinner.start("Fetching latest version information...");
            version = await getLatestVersion();
            spinner.succeed(`Latest version found: ${version}`);
          }

          let zipUrl;
          zipPath = path.join(os.tmpdir(), `playq-base-${version}.zip`);

          // Try raw file download first, fall back to source download
          zipUrl = `https://raw.githubusercontent.com/NcsQ/playq-base-project/refs/heads/main/releases/download/playq-base-project-v${version}.zip`;
          
          spinner.start(`Downloading PlayQ Base v${version}...`);
          
          try {
            await downloadFile(zipUrl, zipPath);
            spinner.succeed("Download completed from raw file");
          } catch (error) {
            // If raw file download fails, try source download
            spinner.text = "Raw file not found, downloading from source...";
            zipUrl = `${BASE_REPO}/archive/refs/heads/main.zip`;
            zipPath = path.join(os.tmpdir(), `playq-base-main.zip`);
            await downloadFile(zipUrl, zipPath);
            spinner.succeed("Download completed from source");
          }

          spinner.start(`Installing PlayQ Base${opts.dir === "." ? " to current directory" : ` → ${opts.dir}`}`);
        }

        // Extract the zip file
        const zip = new AdmZip(zipPath);
        const zipEntries = zip.getEntries();
        
        // Check if this is a GitHub source download (all files under a single root folder)
        // vs a direct zip file (files at root level)
        const rootLevelFiles = zipEntries.filter(entry => !entry.entryName.includes('/'));
        const hasFilesAtRoot = rootLevelFiles.length > 0;
        
        if (hasFilesAtRoot) {
          // Direct zip file - extract directly
          if (opts.dir !== ".") {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          zip.extractAllTo(targetDir, true);
        } else {
          // GitHub source download - extract and move contents from subfolder
          const tempDir = path.join(os.tmpdir(), 'playq-extract-temp');
          if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true });
          }
          
          zip.extractAllTo(tempDir, true);
          
          // Find the extracted folder (usually playq-base-project-main)
          const extractedContents = fs.readdirSync(tempDir);
          const sourceFolder = extractedContents.find(item => 
            fs.statSync(path.join(tempDir, item)).isDirectory()
          );
          
          if (sourceFolder) {
            const sourcePath = path.join(tempDir, sourceFolder);
            
            // Create target directory only if it's not current directory
            if (opts.dir !== ".") {
              fs.mkdirSync(targetDir, { recursive: true });
            }
            
            // Copy all contents from source folder to target
            const items = fs.readdirSync(sourcePath);
            for (const item of items) {
              const srcPath = path.join(sourcePath, item);
              const destPath = path.join(targetDir, item);
              fs.cpSync(srcPath, destPath, { recursive: true });
            }
            
            // Clean up temp directory
            fs.rmSync(tempDir, { recursive: true });
          } else {
            throw new Error('Could not find extracted folder in source download');
          }
        }
        
        // Clean up temporary file if it was downloaded
        if (!opts.offline && fs.existsSync(zipPath)) {
          fs.unlinkSync(zipPath);
        }

        spinner.succeed("PlayQ Base installed successfully");

        // Check and display version information
        const versionJsonPath = path.join(targetDir, "version.json");
        if (fs.existsSync(versionJsonPath)) {
          const info = JSON.parse(fs.readFileSync(versionJsonPath, "utf8"));
          log.info(`✅ Installed PlayQ Base v${info.version} (${info.build})`);
          log.info(`Branch: ${info.branch}, Commit: ${info.commit}`);
          log.info(`Released: ${info.released}`);
        }
        
        log.ok("\nDone.\n");
  } catch (e) {
    spinner.stop();
    log.error(e.message);
    process.exit(1);
  }
}

async function listAvailableReleases() {
  try {
    spinner.start("Fetching available releases...");
    
    const options = {
      hostname: 'api.github.com',
      path: '/repos/NcsQ/playq-base-project/contents/releases/download',
      headers: {
        'User-Agent': 'playq-cli'
      }
    };

    const releases = await new Promise((resolve, reject) => {
      const req = https.get(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const contents = JSON.parse(data);
            resolve(contents);
          } catch (err) {
            reject(new Error('Failed to parse GitHub API response'));
          }
        });
      }).on('error', (err) => {
        reject(new Error(`Failed to fetch releases: ${err.message}`));
      });

      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout while fetching releases'));
      });
    });

    // Filter for zip files and extract version info
    const zipFiles = releases
      .filter(file => file.name.endsWith('.zip') && file.name.startsWith('playq-base-project-v'))
      .map(file => {
        const versionMatch = file.name.match(/playq-base-project-v(\d+\.\d+\.\d+)\.zip/);
        return {
          version: versionMatch ? versionMatch[1] : 'unknown',
          filename: file.name,
          size: formatFileSize(file.size),
          downloadUrl: file.download_url
        };
      })
      .sort((a, b) => compareVersions(b.version, a.version)); // Sort newest first

    spinner.succeed("Available releases fetched");

    if (zipFiles.length === 0) {
      log.warn("No releases found in the repository.");
      return;
    }

    // Get the latest version from version.json
    let latestVersion;
    try {
      latestVersion = await getLatestVersion();
    } catch (err) {
      latestVersion = zipFiles[0].version; // Fallback to newest zip file
    }

    log.info("\nAvailable PlayQ Base releases:\n");
    
    zipFiles.forEach(release => {
      const isLatest = release.version === latestVersion;
      const marker = isLatest ? " (latest)" : "";
      const icon = isLatest ? "🔥" : "📦";
      
      console.log(`  ${icon} v${release.version}${marker} (${release.size})`);
    });

    log.info(`\nUsage:`);
    log.info(`  playq install                      # Install latest base (v${latestVersion})`);
    log.info(`  playq install base                 # Install latest base explicitly`);
    log.info(`  playq install --release 1.0.0      # Install specific version`);
    log.info(`  playq install core                 # Install core (coming soon)`);
    log.info(`  playq install examples             # Install examples (coming soon)\n`);

  } catch (error) {
    spinner.stop();
    log.error(`Failed to list releases: ${error.message}`);
    process.exit(1);
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function compareVersions(a, b) {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);
  
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aPart = aParts[i] || 0;
    const bPart = bParts[i] || 0;
    
    if (aPart > bPart) return 1;
    if (aPart < bPart) return -1;
  }
  
  return 0;
}

async function getLatestVersion() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'raw.githubusercontent.com',
      path: '/NcsQ/playq-base-project/main/version.json',
      headers: {
        'User-Agent': 'playq-cli'
      }
    };

    const req = https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const versionInfo = JSON.parse(data);
          resolve(versionInfo.version);
        } catch (err) {
          reject(new Error('Failed to parse version.json from repository'));
        }
      });
    }).on('error', (err) => {
      reject(new Error(`Failed to fetch version info: ${err.message}`));
    });

    // Set timeout manually
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout while fetching version info'));
    });
  });
}

async function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    
    const makeRequest = (requestUrl) => {
      // Parse URL to handle different domains in redirects
      const urlObj = new URL(requestUrl);
      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        headers: {
          'User-Agent': 'playq-cli'
        }
      };
      
      https.get(options, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Handle redirect by making a new request to the redirect location
          file.close();
          fs.unlink(outputPath, () => {}); // Clean up the file
          return makeRequest(response.headers.location);
        }
        
        if (response.statusCode !== 200) {
          file.close();
          fs.unlink(outputPath, () => {}); // Clean up the file
          reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
          return;
        }

        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          resolve();
        });
        
        file.on('error', (err) => {
          fs.unlink(outputPath, () => {}); // Delete the file on error
          reject(err);
        });
      }).on('error', (err) => {
        file.close();
        fs.unlink(outputPath, () => {}); // Clean up the file
        reject(new Error(`Download failed: ${err.message}`));
      });
    };
    
    makeRequest(url);
  });
}
