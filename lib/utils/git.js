import { spawnSync } from 'child_process';

export function ensureGit() {
  const r = spawnSync('git', ['--version'], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('Git is not installed or not on PATH.');
}

export function cloneRepo(repoUrl, targetDir, branch = 'main') {
  const args = ['clone', '--depth', '1', '--branch', branch, repoUrl, targetDir];
  const res = spawnSync('git', args, { stdio: 'inherit' });
  if (res.status !== 0) throw new Error(`git clone failed (${repoUrl}@${branch})`);
}