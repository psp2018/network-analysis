# Network Analysis: Mac Setup For Claude

This guide helps you run the Network Analysis project on a Mac and work on it with Claude. You do not need VS Code unless you personally prefer it.

## What This Project Is

Network Analysis is a small local app that simulates network telemetry, shows technical anomalies, and maps them to customer/SLA business impact.

You will be able to:

- Start a local dashboard.
- Simulate network events.
- View anomalies.
- See which customer and SLA tier may be impacted.
- Export telemetry to CSV.

## 1. Install The Basics

Install these two tools:

1. **GitHub Desktop for Mac**  
   Download from: `https://desktop.github.com/`

2. **Node.js LTS**  
   Download from: `https://nodejs.org/`  
   Choose the **LTS** version.

Optional:

- **VS Code**  
  Only install this if you want a code editor. It is not required for the basic workflow.

After installing Node.js, restart your Mac or fully close and reopen Terminal.

## 2. Get The Project From GitHub

Open **GitHub Desktop**.

1. Sign in to GitHub.
2. Choose **File > Clone Repository**.
3. Select the `network-analysis` repository.
4. Choose a local folder, for example:

```text
Documents/GitHub/network-analysis
```

5. Click **Clone**.

## 3. Open Terminal In The Project Folder

In GitHub Desktop:

1. Make sure `network-analysis` is selected.
2. Go to **Repository > Open in Terminal**.

A Terminal window should open inside the project folder.

## 4. Start The Dashboard

In Terminal, run:

```bash
node server.js
```

You should see:

```text
Network Analysis UI running at http://localhost:3000
```

Leave that Terminal window open.

Open this in your browser:

```text
http://localhost:3000
```

## 5. Use The Dashboard

In the browser:

1. Choose a scenario, such as **Port scan**.
2. Click **Start**.
3. Watch the topology and telemetry.
4. Open the **Anomalies** tab to see technical issues.
5. Open the **Care Desk** tab to see customer/SLA impact.
6. Use **Export CSV** if you want to save the session.
7. Use **Clear** to reset events and anomalies.

## 6. Stop The Dashboard

Go back to Terminal and press:

```text
Control + C
```

## 7. Working With Claude Only

You can make code changes with Claude only, as long as your Claude setup can access the project files or the GitHub repository.

Recommended simple workflow:

```text
GitHub Desktop = sync the project
Claude = make code changes
Terminal = run the app
Browser = test the dashboard
```

VS Code is optional. It can be helpful for viewing files, but it is not required.

If Claude cannot directly edit your local files, use one of these options:

- Use Claude Code or a Claude setup with local folder access.
- Ask Claude for the exact file changes and paste them into GitHub's web editor.
- Ask Claude for a patch and apply it manually.

## 8. Connecting Claude To Git

Claude should not receive your GitHub password or personal access token in chat. Use GitHub Desktop or your Claude tool's built-in GitHub connection instead.

### Option A: Claude Edits Local Files

Use this if Claude can open a local project folder.

1. Clone the project with GitHub Desktop.
2. Open the `network-analysis` folder in Claude.
3. Ask Claude to make a specific change.
4. Run the app locally:

```bash
node server.js
```

5. Test in the browser:

```text
http://localhost:3000
```

6. Go back to GitHub Desktop.
7. Review the changed files.
8. Commit and push.

In this setup:

```text
Claude edits files
GitHub Desktop commits and pushes
```

### Option B: Claude Connects To GitHub

Use this if your Claude product has a GitHub connector.

1. In Claude, connect the GitHub account using Claude's official GitHub connection flow.
2. Select the `network-analysis` repository.
3. Ask Claude to work on a branch, not directly on `main`.
4. Ask Claude to open a pull request when the change is ready.

Good prompt:

```text
Use the network-analysis GitHub repo.
Create a branch called feature/care-dashboard-summary.
Improve the Care Desk tab so Platinum SLA risks are sorted first.
Open a pull request when done.
```

### Option C: Claude Gives Instructions Only

Use this if Claude cannot directly edit files or connect to GitHub.

1. Ask Claude for exact file changes.
2. Apply the changes manually in GitHub's web editor or a local editor.
3. Use GitHub Desktop to commit and push.

### Important Git Rules

- Pull before starting work.
- Work on a branch for bigger changes.
- Do not share passwords or tokens with Claude in chat.
- Commit small, understandable changes.
- Push changes so the rest of the team can see them.
- Use pull requests before merging bigger changes.

## 9. Prompting Claude

Good prompt:

```text
In the network-analysis project, improve the Care Desk tab so Platinum SLA customers appear first.
You may edit ui/app.js and ui/styles.css.
Please explain what changed and how to test it.
```

Another good prompt:

```text
Add a new scenario called outage that creates high latency and customer impact.
Update the UI dropdown and explain how to test it.
```

Avoid vague prompts like:

```text
Make the dashboard better.
```

## 10. Saving And Sharing Changes

After Claude or you make changes:

1. Open GitHub Desktop.
2. Review the changed files.
3. Write a short summary, for example:

```text
Improve Care Desk SLA dashboard
```

4. Click **Commit to main** or commit to your branch.
5. Click **Push origin**.

If someone else changed the project first, click **Fetch origin** or **Pull origin** before starting new work.

## Common Problems

### `node` command not found

Install Node.js LTS from `https://nodejs.org/`, then reopen Terminal.

### Browser does not show the latest version

Hard refresh the page:

```text
Command + Shift + R
```

### Port 3000 is already in use

Close the old Terminal window running the app, or press:

```text
Control + C
```

Then run again:

```bash
node server.js
```

## Quick Start Summary

```bash
cd Documents/GitHub/network-analysis
node server.js
```

Then open:

```text
http://localhost:3000
```
