# IRIS — The Ultimate CasaOS Deployment Guide

This guide provides a foolproof, step-by-step process for deploying IRIS to a CasaOS Linux server, ensuring it is accessible anywhere via Tailscale, has a dedicated dashboard icon, and supports seamless updates from a dedicated development machine.

---

## Phase 1: The "Scorched Earth" Fresh Install
*Run these commands via SSH or the CasaOS terminal on your server.*

If you have tried installing IRIS before and ran into issues, we need to completely wipe the slate clean to ensure a perfect build.

**1. Navigate to the installation directory:**
```bash
cd /opt/iris
```
*(If the folder doesn't exist yet, run `cd /opt && git clone <your-repo-url> iris && cd iris`)*

**2. Stop and delete existing broken containers:**
```bash
docker compose down
```

**3. Delete the bad Docker image so it cannot be reused:**
```bash
docker rmi iris-iris -f
```

**4. Pull the latest verified code from GitHub:**
```bash
git pull
```

**5. Create placeholder configuration files:**
Docker requires these files to exist *before* it can mount them as volumes.
```bash
touch .env
mkdir -p .agent && touch .agent/persona.md
```

**6. Force a complete rebuild from scratch:**
This command tells Docker to ignore all previous caches, install Python, build the Vite frontend, and compile the TypeScript backend. This will take 3-5 minutes.
```bash
docker compose build --no-cache
```

**7. Launch the pristine container:**
```bash
docker compose up -d
```

**8. Verify it started successfully:**
```bash
docker compose logs iris
```
You should see output indicating the health check server is running on port 3000.

---

## Phase 2: Configuration & Remote Access

Now that the container is running securely in the background, we will configure it using its own web interface constraint-free.

**1. Access the Dashboard:**
Open a web browser on your Windows machine.
Because you have Tailscale installed on the server, you can use its global Tailscale IP. Note that we expose IRIS on port `3010` to avoid conflicting with CasaOS itself.
```text
http://<your-server-tailscale-ip>:3010
```

**2. Enter API Keys:**
*   The dashboard will likely say "Offline".
*   Click the **⚙️ Settings** icon in the sidebar.
*   Paste your API keys (`TELEGRAM_BOT_TOKEN`, `OPENROUTER_API_KEY`, `PINECONE_API_KEY`, etc.).
*   Click **Save**.

**3. Define Persona:**
*   Click the **🎭 Persona** icon and write the instructions for IRIS.
*   Click **Save**.

**4. Boot the Agent:**
*   Click the **Offline/Online** toggle at the top of the screen to reboot the internal agent with your newly saved keys.

---

## Phase 3: Creating the CasaOS Dashboard Icon

We do **not** use the CasaOS "Manual App Install" feature, as it tries to enforce strict container management rules that conflict with our developer workflow. Instead, we create an elegant shortcut.

1.  Open your main **CasaOS Dashboard**.
2.  Click the **"+"** icon (App Store block).
3.  Select **"Add external link"**.
4.  Fill in the details exactly as follows:
    *   **Title**: `IRIS`
    *   **URL**: `http://<your-server-tailscale-ip>:3010`
    *   **Icon URL**: `https://icon.casaos.io/main/all/IRIS.png` (or a custom icon URL of your choice).
5.  Click **Submit / Add**.

You now have a beautiful, single-click icon on your CasaOS dashboard that launches IRIS instantly, while leaving container management safely in the hands of `docker-compose`.

---

## Phase 4: The Developer Update Workflow (CI/CD)

The core philosophy of this setup is that your **Windows machine is for Development**, and your **CasaOS server is for Production**.

When you make changes to the code on Windows, follow these steps to update the server seamlessly:

**1. On your Windows Machine:**
Test your changes locally using `npm run dev`. When you are satisfied:
```bash
git add .
git commit -m "Describe your awesome new feature"
git push
```

**2. On your CasaOS Server:**
Open the terminal and run:
```bash
cd /opt/iris
git pull
docker compose up -d --build
```

**Why this works perfectly:** You do **not** need to run `docker compose down` during an update. Running `up -d --build` tells Docker to pull the new code, build a new image quietly in the background, and then instantly hot-swap the old container for the new one, resulting in zero downtime for your agent!
