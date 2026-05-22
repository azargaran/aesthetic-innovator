# The Aesthetic Innovator

A strategic simulation of running a UK aesthetics practice.
Designed by A. Zargaran. © 2026.

---

## How to deploy this to a live URL (15 minutes, free)

You don't need to install anything on your computer. You don't need to use a terminal. You don't need to know what npm or git is.

### Step 1: Create a Vercel account (3 minutes)

1. Go to **vercel.com**
2. Click **Sign Up** in the top right
3. Choose **Continue with Email** (or Continue with GitHub if you already have one — slightly easier later, but not required)
4. Verify your email if asked
5. When asked about a plan, choose **Hobby (Free)**
6. When it asks "What would you like to do?" you can skip / close any onboarding prompts

You should now see the Vercel dashboard.

### Step 2: Deploy your project (5 minutes)

You should still be on the Vercel dashboard.

1. Click the **Add New...** button in the top right, then choose **Project**
2. You'll see two options. Click the **Deploy** button under the option labelled **"Clone a template"** — but actually look for a section labelled **"Import Third-Party Git Repository"** OR a panel that says **"or browse all templates"** with a small text link nearby that says **"deploy from a folder"** or similar drag-and-drop area.

   ⚠️ Vercel's UI changes occasionally. If you can't find a drag-and-drop area on the project import page, do this instead:
   - Go to **vercel.com/new/clone**, or
   - Just drag the **unzipped project folder** directly onto the Vercel dashboard homepage at vercel.com. A drop zone usually appears automatically.

3. **Drag your unzipped `aesthetic-innovator` folder** onto the drop zone. Vercel will recognise it as a Vite + React project automatically.

4. Vercel will show you a screen with:
   - Project Name (leave as default or change it)
   - Framework Preset: should auto-detect as **Vite**. If not, choose Vite from the dropdown.
   - Build Settings: leave everything as default
   - Environment Variables: skip / leave empty

5. Click **Deploy** at the bottom.

6. Wait about 60-90 seconds. You'll see a "Congratulations" screen with a screenshot of your live app and a URL like `aesthetic-innovator-xyz.vercel.app`.

**You now have a live website.** Click the URL to open it. Share it with anyone.

### Step 3 (optional): Custom domain (£8/year)

If you want a proper domain like `aestheticinnovator.com`:

1. Go to **cloudflare.com/products/registrar** and sign up
2. Search for the domain you want — most `.com` domains cost about £8/year
3. After buying, go back to Vercel → your project → **Settings** → **Domains**
4. Type your domain in, and follow Vercel's instructions to point Cloudflare's DNS at Vercel (Vercel will give you two DNS records to copy across)
5. Wait 5-30 minutes for DNS to propagate

Done. Your game is now at `yourdomain.com`.

---

## Updating the game later

When you want to change something:

1. Edit `src/App.jsx` (the only file you'll ever touch)
2. Drag the folder back onto Vercel (it'll create a new deployment)

That's it. Or, if you set up GitHub during Step 1, just push your changes there and Vercel auto-deploys.

---

## Troubleshooting

**"Vercel says my build failed."**
Click the failed deployment → **Build Logs**. Almost always the error message tells you the exact problem. Copy the error and paste it into the Claude chat. I'll diagnose it.

**"The drag-and-drop area isn't showing up."**
Try the GitHub route instead: create a free GitHub account, drag the folder into a new repository on github.com (GitHub also supports drag-and-drop upload), then in Vercel choose "Import Git Repository" and pick the repo. Same end result.

**"The app loads but looks broken."**
Hard refresh (Ctrl+Shift+R or Cmd+Shift+R). Vercel caches aggressively.

**"My phone shows it weird."**
The game is designed for portrait mobile and desktop. If it looks weird in a specific environment, screenshot it and send it to me.

---

## What's in this folder

```
aesthetic-innovator/
├── index.html              ← Web page entry point
├── package.json            ← Tells Vercel what dependencies to install
├── vite.config.js          ← Build tool config
├── .gitignore              ← Files to skip during deployment
├── public/
│   └── favicon.svg         ← Browser tab icon
└── src/
    ├── main.jsx            ← Loads React + your App
    └── App.jsx             ← THE GAME (7,146 lines)
```

The only file you should ever edit is **src/App.jsx**.
