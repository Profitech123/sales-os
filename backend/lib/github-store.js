// Persists second-brain files as real commits to the GitHub repo via the
// Contents API. This exists because the backend runs as stateless Vercel
// serverless functions — there is no shared, persistent disk between
// invocations, let alone between the backend and frontend deployments — so
// git itself is the durable store. Used only when GITHUB_TOKEN + GITHUB_REPO
// are set; local dev and CI fall back to plain fs writes (see paths.js).
const GITHUB_API = "https://api.github.com";

function config() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO; // "owner/repo"
  const branch = process.env.GITHUB_BRANCH || "main";
  return { token, repo, branch };
}

export function isGitHubStoreConfigured() {
  const { token, repo } = config();
  return Boolean(token && repo);
}

function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

/**
 * Create or update a file at `repoRelativePath` (e.g.
 * "second-brain/deals/2026-07-20-acme.md") with `content`, committed
 * directly to the configured branch.
 */
export async function commitFile(repoRelativePath, content, commitMessage) {
  const { token, repo, branch } = config();
  if (!token || !repo) {
    throw new Error("GitHub store is not configured (GITHUB_TOKEN/GITHUB_REPO missing).");
  }

  const url = `${GITHUB_API}/repos/${repo}/contents/${repoRelativePath}`;

  // Updating an existing file requires its current blob sha.
  let sha;
  const existing = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, {
    headers: ghHeaders(token),
  });
  if (existing.ok) {
    const json = await existing.json();
    sha = json.sha;
  }

  const response = await fetch(url, {
    method: "PUT",
    headers: { ...ghHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: commitMessage,
      content: Buffer.from(content, "utf8").toString("base64"),
      branch,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`GitHub commit failed (${response.status}): ${errorBody}`);
  }

  return repoRelativePath;
}
