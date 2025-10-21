// scripts/generate-projects.js
//
// This script uses the GitHub REST API to discover repositories under a user
// account that have GitHub Pages enabled, and then writes the relevant
// details into a JSON file (`projects.json`).
//
// Features:
// - Filters out forks and archived repositories by default.
// - Obtains the real GitHub Pages URL via the /pages API endpoint (so
//   custom domains and exact paths are respected).
// - Reads the repository topics and includes them as an array in the
//   generated data.
// - Uses the repository description for the project description.
// - Writes the updated_at timestamp to allow sorting on the frontend.
// - Accepts environment variables:
//     GITHUB_USER   (required) – the username or org whose repos to scan
//     GITHUB_TOKEN  (required) – a token with repo read scope

import fs from 'fs/promises';
import path from 'path';
import { Octokit } from '@octokit/rest';

async function main() {
  const owner = process.env.GITHUB_USER;
  const token = process.env.GITHUB_TOKEN;
  if (!owner) {
    console.error('环境变量 GITHUB_USER 未设置');
    process.exit(1);
  }
  if (!token) {
    console.error('环境变量 GITHUB_TOKEN 未设置');
    process.exit(1);
  }
  const octokit = new Octokit({ auth: token });
  // Fetch all repositories for the owner
  const repos = await octokit.paginate(octokit.rest.repos.listForUser, {
    username: owner,
    per_page: 100,
  });
  const projects = [];
  for (const repo of repos) {
    // Skip forked or archived repos
    if (repo.fork || repo.archived) continue;
    // Try to fetch pages configuration; if 404 then pages not enabled
    let pagesConfig;
    try {
      const res = await octokit.request('GET /repos/{owner}/{repo}/pages', {
        owner,
        repo: repo.name,
      });
      pagesConfig = res.data;
    } catch (err) {
      // Only skip if 404; other errors should be logged
      if (err.status === 404) continue;
      console.warn(`获取仓库 ${repo.name} pages 配置失败: ${err.message}`);
      continue;
    }
    const pageUrl = pagesConfig.html_url;
    // Fetch topics for the repository
    let topics = [];
    try {
      const topicsRes = await octokit.rest.repos.getAllTopics({ owner, repo: repo.name });
      topics = topicsRes.data.names;
    } catch (err) {
      console.warn(`获取仓库 ${repo.name} topics 失败: ${err.message}`);
    }
    projects.push({
      name: repo.name,
      repo: repo.name,
      url: pageUrl,
      description: repo.description || '',
      topics,
      date: repo.updated_at,
      screenshot: '',
    });
  }
  // Sort projects by updated_at descending (latest first) before writing
  projects.sort((a, b) => new Date(b.date) - new Date(a.date));
  // Write to projects.json
  const outputPath = path.resolve('projects.json');
  await fs.writeFile(outputPath, JSON.stringify(projects, null, 2), 'utf8');
  console.log(`已生成 ${projects.length} 个项目并写入 ${outputPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
