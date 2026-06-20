# Network Analysis: Mac Setup For Claude

This guide helps you run the Network Analysis project on a Mac and work on it with Claude.

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

## 7. Working With Claude

Use Claude for focused changes. Give it a specific goal and tell it which files to edit.

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

## 8. Saving And Sharing Changes

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
