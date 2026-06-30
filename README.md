# Monthly Budget Tracker

A simple budget tracker — income, fixed expenses, bills, discretionary spending,
savings, debt, and shared roommate expenses. Data is saved in your browser's
local storage, so it persists between visits on the same device/browser.

## Run it locally

```bash
npm install
npm run dev
```

Then open the URL it prints (usually http://localhost:5173).

## Deploy it for free (so you can open it from any device)

1. Create a free GitHub account if you don't have one: https://github.com/signup
2. Create a new repository (e.g. "budget-tracker") and push this folder to it:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/budget-tracker.git
git push -u origin main
```

3. Go to https://vercel.com and sign up with your GitHub account (free).
4. Click "Add New Project", select your `budget-tracker` repo, and click Deploy.
   Vercel auto-detects Vite — no config needed.
5. After a minute you'll get a live URL like `budget-tracker.vercel.app` you can
   open from your phone, bookmark, or add to your home screen.

Note: since data is stored in localStorage, it's tied to one browser. If you
open the site on your phone and your laptop, they won't share data unless you
manually re-enter it on each.
