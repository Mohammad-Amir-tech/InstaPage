import os
import json
import re
import io
import zipfile
import pathlib
import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
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
NETLIFY_TOKEN = os.getenv("NETLIFY_TOKEN")


# ============================================
# INPUT VALIDATION
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
# DEPLOY TO NETLIFY (CSS INLINED + _HEADERS)
# ============================================
# ============================================
# DEPLOY WITH PATH-BASED ROUTING
# ============================================
MAIN_SITE_ID = os.getenv("NETLIFY_MAIN_SITE_ID")  # ⭐ Tumhari main site ka ID

@app.post("/api/deploy")
async def deploy_page(req: DeployRequest):
    if not NETLIFY_TOKEN:
        raise HTTPException(status_code=500, detail="NETLIFY_TOKEN not configured")
    if not req.html or len(req.html) < 100:
        raise HTTPException(status_code=400, detail="Invalid HTML")

    # ⭐ Username clean karo (path ke liye)
    username = (req.username or "user").lower()
    username = re.sub(r'[^a-z0-9_-]', '', username)[:30]
    if not username:
        username = "user"

    try:
        # Read preview.css
        css_path = pathlib.Path(__file__).parent.parent / "frontend" / "preview.css"
        css_content = ""
        if css_path.exists():
            css_content = css_path.read_text(encoding="utf-8")

        # Inject CSS into <head>
        if css_content and "</head>" in req.html:
            html_with_css = req.html.replace(
                "</head>",
                f"<style>\n{css_content}\n</style>\n</head>",
                1
            )
        else:
            html_with_css = req.html

        # ⭐ Path: username/index.html
        file_path = f"{username}/index.html"

        # ⭐ Deploy to MAIN SITE (not new site)
        headers = {
            "Authorization": f"Bearer {NETLIFY_TOKEN}",
            "Content-Type": "application/zip",
        }

        # Create ZIP with folder structure
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr(file_path, html_with_css)
            zf.writestr(
                "_headers",
                "/*\n  Content-Type: text/html; charset=utf-8\n"
            )
        zip_buffer.seek(0)

        async with httpx.AsyncClient(timeout=60.0) as http:
            # ⭐ Deploy to existing site (main site ID)
            resp = await http.post(
                f"https://api.netlify.com/api/v1/sites/{MAIN_SITE_ID}/deploys",
                headers=headers,
                content=zip_buffer.getvalue(),
            )

            if resp.status_code not in (200, 201):
                print(f"[NETLIFY ERROR] {resp.status_code}: {resp.text}")
                raise HTTPException(status_code=500, detail=f"Netlify error: {resp.text[:200]}")

            data = resp.json()
            # ⭐ URL = main site + username path
            site_url = data.get("ssl_url") or data.get("url")
            user_url = f"{site_url}/{username}"

        return {
            "success": True,
            "url": user_url,
            "path": username,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Deploy failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# MOUNT FRONTEND
# ============================================
app.mount("/", StaticFiles(directory="../frontend", html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)