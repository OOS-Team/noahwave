# Why the live site has no images / face scan

Vercel only has the **code**. Your **gallery, hero images, and face models** (~32MB) are still only on your Mac.

## Fix (5 minutes, free)

### 1. Create a GitHub token
1. Open: https://github.com/settings/tokens
2. **Generate new token (classic)**
3. Name: `noahwave-upload`
4. Expiration: 7 days (or 30)
5. Check: **`repo`**
6. Generate → **copy the token** (starts with `ghp_`)

### 2. Upload everything from your project folder

Open **Terminal** and run:

```bash
cd /Users/noah/programmierung/generative-art
export GITHUB_TOKEN=ghp_paste_your_token_here
node scripts/push-assets.mjs
```

Or use the helper script (it asks for the token):

```bash
cd /Users/noah/programmierung/generative-art
./UPLOAD_MEDIA.sh
```

### 3. Wait for Vercel
- Vercel auto-redeploys when GitHub updates
- Wait 1–2 minutes
- Hard-refresh the site (Cmd+Shift+R)

### What you get after upload
| Feature | Needs |
|---------|--------|
| Gallery pics & videos | `public/gallery/*` |
| Hero background art | `public/images/hero/*` |
| Face MATRIX (jack in) | `public/models/*` + full VisionLab code |

### Security
- Don’t commit the token
- Don’t paste the token in chat
- You can delete the token after upload
