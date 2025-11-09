import path from "path";
import fs from "fs";
import https from "https";
import os from "os";
import readline from "readline";
import { URL } from "url";
import AdmZip from "adm-zip";
import { spinner, log } from "../utils/logger.js";

const BASE_REPO = "https://github.com/NcsQ/playq-base-project";

export default function (program) {
  program
    .command("update")
    .description("Update PlayQ Base to the latest version")
    .option("--to <version>", "Update to specific version instead of latest")
    .option("--force", "Force update even if versions are the same")
    .option("--backup", "Create backup before updating")
    .action(async (opts) => {
      try {
        const cwd = process.cwd();
        
        // Check if we're in a PlayQ project
        const versionJsonPath = path.join(cwd, "version.json");
        if (!fs.existsSync(versionJsonPath)) {
          log.error("❌ Not a PlayQ Base project. No version.json found.");
          log.info("Run this command from a PlayQ Base project directory.\n");
          process.exit(1);
        }

        // Get current version
        const currentVersionInfo = JSON.parse(fs.readFileSync(versionJsonPath, "utf8"));
        const currentVersion = currentVersionInfo.version;
        
        log.info(`📦 Current version: v${currentVersion}`);

        // Get target version (latest or specified)
        let targetVersion = opts.to || "latest";
        
        if (targetVersion === "latest") {
          spinner.start("Fetching latest version...");
          targetVersion = await getLatestVersion();
          spinner.succeed(`Latest version found: v${targetVersion}`);
        }

        // Check if update is needed
        if (currentVersion === targetVersion && !opts.force) {
          log.info(`✅ Already on version v${targetVersion}. No update needed.`);
          log.info("Use --force to reinstall the same version.\n");
          return;
        }

        // Confirm update
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const confirm = await new Promise((resolve) => {
          const action = currentVersion === targetVersion ? "reinstall" : "update";
          rl.question(
            `⚠️  About to ${action} PlayQ Base from v${currentVersion} to v${targetVersion}\nContinue? (y/n): `,
            (answer) => {
              rl.close();
              resolve(answer.trim().toLowerCase());
            }
          );
        });

        if (confirm !== "y" && confirm !== "yes") {
          log.warn("❌ Update cancelled by user.\n");
          return;
        }

        // Create backup if requested
        if (opts.backup) {
          spinner.start("Creating backup...");
          const backupDir = path.join(cwd, `backup-v${currentVersion}-${Date.now()}`);
          fs.mkdirSync(backupDir);
          
          // Copy important files/folders to backup
          const itemsToBackup = [
            "version.json", "resources/config.ts", "environments", 
            "test", "test-data", ".vscode"
          ];
          
          for (const item of itemsToBackup) {
            const srcPath = path.join(cwd, item);
            const destPath = path.join(backupDir, item);
            
            if (fs.existsSync(srcPath)) {
              if (fs.statSync(srcPath).isDirectory()) {
                fs.mkdirSync(path.dirname(destPath), { recursive: true });
                fs.cpSync(srcPath, destPath, { recursive: true });
              } else {
                fs.mkdirSync(path.dirname(destPath), { recursive: true });
                fs.cpSync(srcPath, destPath);
              }
            }
          }
          
          spinner.succeed(`Backup created at: ${backupDir}`);
        }

        // Download and extract new version
        spinner.start(`Downloading PlayQ Base v${targetVersion}...`);
        
        const zipPath = path.join(os.tmpdir(), `playq-base-update-${targetVersion}.zip`);
        const zipUrl = `https://raw.githubusercontent.com/NcsQ/playq-base-project/refs/heads/main/releases/download/playq-base-project-v${targetVersion}.zip`;
        
        try {
          await downloadFile(zipUrl, zipPath);
          spinner.succeed("Download completed");
        } catch (error) {
          spinner.fail("Download failed");
          log.error(`Failed to download v${targetVersion}: ${error.message}`);
          process.exit(1);
        }

        // Extract with selective overwrite
        spinner.start("Updating files...");
        
        const zip = new AdmZip(zipPath);
        const zipEntries = zip.getEntries();
        
        // Framework files that can be safely updated (whitelist approach)
        const safeToUpdateFiles = [
          "version.json", 
          ".gitignore",
          ".vscode/settings.json",
          ".vscode/extensions.json"
        ];
        
        // Framework folders that can be safely updated (whitelist approach)
        const safeToUpdateFolders = [
          "releases/",
          "extend/", 
          "playwright-tests/",
          "resources/api/",
          "resources/locators/",
          "resources/run-configs/",
          "test/steps/_step_group/"
        ];
        
        // Specific files that can be updated (documentation files)
        const safeToUpdatePatterns = [
          /.*\/folder_info\.txt$/,  // Any folder_info.txt file
          /test\/.*\/folder_info\.txt$/  // folder_info.txt in test subdirectories
        ];

        let updatedCount = 0;
        let skippedCount = 0;

        for (const entry of zipEntries) {
          if (entry.isDirectory) continue; // Skip directory entries
          
          const filePath = entry.entryName;
          const targetPath = path.join(cwd, filePath);
          
          // Check if this file is safe to update
          const isSafeFile = safeToUpdateFiles.includes(filePath);
          const isSafeFolder = safeToUpdateFolders.some(folder => filePath.startsWith(folder));
          const matchesPattern = safeToUpdatePatterns.some(pattern => pattern.test(filePath));
          
          const isSafeToUpdate = isSafeFile || isSafeFolder || matchesPattern;
          
          if (isSafeToUpdate) {
            // Create directory structure if needed
            fs.mkdirSync(path.dirname(targetPath), { recursive: true });
            
            // Write the file
            fs.writeFileSync(targetPath, entry.getData());
            updatedCount++;
          } else {
            // Skip this file to preserve user content
            skippedCount++;
          }
        }

        // Clean up
        if (fs.existsSync(zipPath)) {
          fs.unlinkSync(zipPath);
        }

        spinner.succeed("Update completed");

        // Show update summary
        const newVersionInfo = JSON.parse(fs.readFileSync(versionJsonPath, "utf8"));
        
        log.info(`✅ Updated PlayQ Base to v${newVersionInfo.version} (${newVersionInfo.build})`);
        log.info(`📁 Updated ${updatedCount} framework files`);
        log.info(`🔒 Skipped ${skippedCount} files to preserve user content`);
        
        if (opts.backup) {
          log.info(`💾 Backup available in backup-v${currentVersion}-* folder`);
        }
        
        log.warn(`⚠️  Note: Only framework files were updated. Your custom folders and files are preserved.`);
        log.ok("\nUpdate completed successfully!\n");

      } catch (e) {
        spinner.stop();
        log.error(e.message);
        process.exit(1);
      }
    });
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
          file.close();
          fs.unlink(outputPath, () => {});
          return makeRequest(response.headers.location);
        }
        
        if (response.statusCode !== 200) {
          file.close();
          fs.unlink(outputPath, () => {});
          reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
          return;
        }

        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          resolve();
        });
        
        file.on('error', (err) => {
          fs.unlink(outputPath, () => {});
          reject(err);
        });
      }).on('error', (err) => {
        file.close();
        fs.unlink(outputPath, () => {});
        reject(new Error(`Download failed: ${err.message}`));
      });
    };
    
    makeRequest(url);
  });
}