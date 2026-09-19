import os
import json
import re
import io
import subprocess
import tempfile
import shutil
import pathlib
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="InstaPage API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = AsyncOpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1",
)
MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
CLOUDFLARE_PROJECT_NAME = os.getenv("CLOUDFLARE_PROJECT_NAME", "instapage-app")


# ============================================
# INPUT MODELS
# ============================================
class PageData(BaseModel):
    name: str = Field(..., min_length=1, max_length=40)
    bio: Optional[str] = Field(None, max_length=200)
    age: Optional[str] = Field(None, max_length=3)
    hobbies: List[str] = Field(default_factory=list)
    music: Optional[dict] = None
    theme: Optional[str] = "soft-gradient"

    @field_validator("name")
    @classmethod
    def sanitize_name(cls, v):
        v = re.sub(r"[<>&\"']", "", v)
        return v.strip()

    @field_validator("bio")
    @classmethod
    def sanitize_bio(cls, v):
        if v is None:
            return v
        v = re.sub(r"[<>&\"']", "", v)
        return v.strip()


class DeployRequest(BaseModel):
    html: str
    username: Optional[str] = "user"


# ============================================
# AI STYLE PROMPT
# ============================================
STYLE_PROMPT = """You are a top 1% UI designer. Generate a UNIQUE premium style config for a personal page.

USER:
- Name: {name}
- Raw bio: {bio}
- Interests: {hobbies}
- Music: {music}
- Theme preference: {theme}

Return ONLY valid JSON (no markdown):

{{
  "tagline": "Rewritten bio — max 12 words, PUNCHY with attitude, use • separators. Example: 'Mumbai-made • Coffee addict • Building tomorrow'",
  "palette": {{
    "bgStart": "#hex (dark, deep)",
    "bgEnd": "#hex (dark, deep - subtle shift)",
    "accent": "#hex (bright, vibrant)",
    "accent2": "#hex (secondary, complement)",
    "text": "#hex (white or near-white)",
    "textMuted": "#hex (60% opacity equivalent)"
  }},
  "fontDisplay": "Google Font for name (e.g. 'Playfair Display', 'Space Grotesk', 'Syne', 'Unbounded')",
  "fontBody": "Google Font for body (e.g. 'Inter', 'DM Sans', 'Manrope')",
  "vibe": "one word: elegant | bold | playful | minimal | cyberpunk | editorial",
  "backgroundStyle": "gradient | mesh | particles"
}}

RULES:
- Colors MUST be dark background + bright accent
- NEVER use white/cream as background
- Tagline MUST have attitude and separators (•)
- Palette should reflect the person's interests
- Respond with JSON only."""


# ============================================
# GENERATE STYLE
# ============================================
@app.post("/api/generate-style")
async def generate_style(data: PageData):
    hobbies_str = ", ".join(data.hobbies) if data.hobbies else "none"
    music_str = "none"
    if data.music and data.music.get("song"):
        music_str = f"{data.music['song']} by {data.music.get('artist', 'unknown')}"

    prompt = STYLE_PROMPT.format(
        name=data.name,
        bio=data.bio or "no bio — create tagline from name + hobbies",
        hobbies=hobbies_str,
        music=music_str,
        theme=data.theme,
    )

    try:
        resp = await client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": "You are a UI designer. Return ONLY valid JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.95,
            response_format={"type": "json_object"},
            timeout=30.0,
        )
        config = json.loads(resp.choices[0].message.content)
        return {"success": True, "config": config}
    except Exception as e:
        print(f"[ERROR] Style generation failed: {e}")
        return {
            "success": True,
            "config": {
                "tagline": f"{data.name} • Est. now • Building something",
                "palette": {
                    "bgStart": "#0f0c29",
                    "bgEnd": "#1a1440",
                    "accent": "#a78bfa",
                    "accent2": "#f093fb",
                    "text": "#ffffff",
                    "textMuted": "rgba(255,255,255,0.65)"
                },
                "fontDisplay": "Space Grotesk",
                "fontBody": "Inter",
                "vibe": "bold",
                "backgroundStyle": "mesh"
            }
        }


# ============================================
# SPOTIFY OEMBED PROXY
# ============================================
@app.get("/api/spotify-oembed")
async def spotify_oembed(url: str):
    if not url.startswith("https://open.spotify.com/"):
        raise HTTPException(status_code=400, detail="Invalid Spotify URL")
    try:
        async with httpx.AsyncClient(timeout=10.0) as http:
            r = await http.get("https://open.spotify.com/oembed", params={"url": url})
            r.raise_for_status()
            return r.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# DEPLOY TO CLOUDFLARE PAGES (with frontend files)
# ============================================
@app.post("/api/deploy")
async def deploy_page(req: DeployRequest):
    if not req.html or len(req.html) < 100:
        raise HTTPException(status_code=400, detail="Invalid HTML")

    # Username clean karo
    username = (req.username or "user").lower()
    username = re.sub(r'[^a-z0-9_-]', '', username)[:30]
    if not username:
        username = "user"

    temp_dir = None
    try:
        # preview.css padho
        css_path = pathlib.Path(__file__).parent.parent / "frontend" / "preview.css"
        css_content = ""
        if css_path.exists():
            css_content = css_path.read_text(encoding="utf-8")
            print(f"[INFO] Loaded preview.css: {len(css_content)} chars")

        # CSS inline karo
        if css_content and "</head>" in req.html:
            html_with_css = req.html.replace(
                "</head>",
                f"<style>\n{css_content}\n</style>\n</head>",
                1
            )
        else:
            html_with_css = req.html

        # Temp folder banao
        temp_dir = tempfile.mkdtemp()
        temp_path = pathlib.Path(temp_dir)

        # Frontend files copy karo (landing page, CSS, JS)
        frontend_src = pathlib.Path(__file__).parent.parent / "frontend"
        if frontend_src.exists():
            for item in frontend_src.iterdir():
                if item.name in ["node_modules", ".git"]:
                    continue
                if item.is_file():
                    shutil.copy2(item, temp_path / item.name)
                elif item.is_dir():
                    shutil.copytree(item, temp_path / item.name, dirs_exist_ok=True)
            print(f"[INFO] Copied frontend files")

        # User ka folder + index.html banao
        user_dir = temp_path / username
        user_dir.mkdir(parents=True, exist_ok=True)
        (user_dir / "index.html").write_text(html_with_css, encoding="utf-8")
        print(f"[INFO] Created {username}/index.html")

        # Wrangler deploy
        result = subprocess.run(
            [
                "wrangler", "pages", "deploy",
                str(temp_path),
                f"--project-name={CLOUDFLARE_PROJECT_NAME}",
                "--branch=main",
                "--commit-dirty=true",
            ],
            capture_output=True,
            text=True,
            timeout=180,
        )

        if result.returncode != 0:
            print(f"[WRANGLER ERROR] {result.stderr}")
            raise HTTPException(
                status_code=500,
                detail=f"Wrangler failed: {result.stderr[:300]}"
            )

        print(f"[WRANGLER OUTPUT] {result.stdout[-500:]}")

        # User URL
        user_url = f"https://{CLOUDFLARE_PROJECT_NAME}.pages.dev/{username}/"

        return {
            "success": True,
            "url": user_url,
            "path": username,
        }

    except HTTPException:
        raise
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="Deploy timed out")
    except Exception as e:
        print(f"[ERROR] Deploy failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_dir:
            shutil.rmtree(temp_dir, ignore_errors=True)


# ============================================
# MOUNT FRONTEND (for local dev)
# ============================================
app.mount("/", StaticFiles(directory="../frontend", html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)