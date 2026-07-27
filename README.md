# Relay Board — Step 1

This is the starter scaffold: the project skeleton, your full org chart as
real data (`lib/orgChart.ts`), and a login page that matches your existing
PlayOn tools. Nothing is wired to a real database yet — that's Step 2/3.

## What's in here

- `app/page.tsx` — the login screen (name dropdown + password)
- `app/layout.tsx` — wraps every page, loads fonts
- `lib/orgChart.ts` — all 55 people, their roles, and who they report to
- `tailwind.config.js` — brand colors pulled from your logo

## Do this next (in order)

### 1. Create the GitHub repo
1. Go to https://github.com/new
2. Name it `relay-board` (or whatever you'd like)
3. Leave it **empty** — don't check "Add a README" (we already have one)
4. Click **Create repository** and keep that page open — it'll show you
   commands, but use the ones below instead so nothing gets mixed up.

### 2. Push this code to it
Open a terminal on your computer, and in the folder containing this project:

```bash
git init
git add .
git commit -m "Step 1: project scaffold, org chart, login page"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/relay-board.git
git push -u origin main
```

(Replace `YOUR-USERNAME` with your actual GitHub username or org name.)

### 3. Connect it to Vercel
1. Go to https://vercel.com/new
2. Import the `relay-board` repo you just pushed
3. Leave all settings as default and click **Deploy**
4. In about a minute you'll have a live URL — try selecting your name on
   the login page. (Clicking "Continue" will just show a placeholder alert
   for now — that's expected, real login comes in Step 3.)

### 4. Come back here
Once you've got a live Vercel URL and can see the login page, tell me and
we'll move to **Step 2: setting up the database** so we can start storing
real people, passwords, announcements, and ideas.

## Don't do yet
- Don't worry about the database
- Don't worry about Slack
- Don't try to actually log in — it's not functional yet on purpose
