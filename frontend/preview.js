// ============================================
// LOAD DATA
// ============================================
const data = JSON.parse(localStorage.getItem('instapage_data') || '{}');

if (!data.name) {
    window.location.href = 'index.html';
}

let accentRGB = [167, 139, 250];

// ============================================
// AI STYLE
// ============================================
async function applyStyle() {
    try {
        const resp = await fetch('/api/generate-style', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: data.name,
                bio: data.bio || '',
                age: data.age || '',
                hobbies: data.hobbies || [],
                music: data.music || {},
                theme: data.theme || 'soft-gradient',
            }),
        });
        const result = await resp.json();
        if (!result.success) throw new Error('AI failed');

        const cfg = result.config;
        const root = document.documentElement;

        root.style.setProperty('--bg-start', cfg.palette.bgStart);
        root.style.setProperty('--bg-end', cfg.palette.bgEnd);
        root.style.setProperty('--accent', cfg.palette.accent);
        root.style.setProperty('--accent-2', cfg.palette.accent2);
        root.style.setProperty('--text', cfg.palette.text);
        root.style.setProperty('--text-muted', cfg.palette.textMuted);
        root.style.setProperty('--font-display', `'${cfg.fontDisplay}', system-ui, sans-serif`);
        root.style.setProperty('--font-body', `'${cfg.fontBody}', system-ui, sans-serif`);

        const fonts = [cfg.fontDisplay, cfg.fontBody].filter(Boolean);
        const fontUrl = `https://fonts.googleapis.com/css2?${fonts.map(f => `family=${f.replace(/ /g, '+')}:wght@400;500;600;700;800`).join('&')}&display=swap`;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = fontUrl;
        document.head.appendChild(link);

        document.body.style.background = `linear-gradient(160deg, ${cfg.palette.bgStart} 0%, ${cfg.palette.bgEnd} 100%)`;
        document.body.style.color = cfg.palette.text;

        accentRGB = hexToRgb(cfg.palette.accent);
        document.getElementById('taglineEl').textContent = cfg.tagline;

        console.log('✅ Style applied:', cfg.vibe);
        return cfg;
    } catch (e) {
        console.warn('Style failed:', e);
        document.getElementById('taglineEl').textContent = data.bio || `${data.name} • Building something`;
        return null;
    }
}

function hexToRgb(hex) {
    const h = hex.replace('#', '');
    return [
        parseInt(h.substring(0, 2), 16),
        parseInt(h.substring(2, 4), 16),
        parseInt(h.substring(4, 6), 16),
    ];
}

// ============================================
// INJECT USER DATA
// ============================================
function injectData() {
    document.getElementById('nameEl').textContent = data.name;

    // ⭐ Meta pills (age only)
    const pills = [];
    if (data.age) pills.push(`🎂 ${data.age} yrs`);
    const metaEl = document.getElementById('metaPills');
    if (pills.length > 0) {
        metaEl.innerHTML = pills.map(p => `<span class="meta-pill">${p}</span>`).join('');
    }

    // ⭐ Instagram link (clickable)
    if (data.username) {
        const instaLink = document.createElement('a');
        instaLink.href = `https://instagram.com/${data.username}`;
        instaLink.target = '_blank';
        instaLink.rel = 'noopener noreferrer';
        instaLink.className = 'meta-pill meta-pill-insta';
        instaLink.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
            </svg>
            <span>@${escapeHtml(data.username)}</span>
        `;
        metaEl.appendChild(instaLink);
    }

    // Profile photo
    const photoEl = document.getElementById('profile-photo');
    if (data.photo) {
        photoEl.src = data.photo;
    } else {
        const initial = (data.name || '?').charAt(0).toUpperCase();
        photoEl.src = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#667eea"/><stop offset="1" stop-color="#f093fb"/></linearGradient></defs><rect width="200" height="200" fill="url(#g)"/><text x="50%" y="50%" font-size="100" fill="white" text-anchor="middle" dominant-baseline="central" font-family="sans-serif" font-weight="700">${initial}</text></svg>`)}`;
    }

    // Interests
    if (data.hobbies && data.hobbies.length > 0) {
        const LABELS = {
            music: '🎵 Music', singing: '🎤 Singing', dance: '💃 Dance', art: '🎨 Art',
            photography: '📷 Photography', movies: '🎬 Movies', theatre: '🎭 Theatre',
            cricket: '🏏 Cricket', football: '⚽ Football', badminton: '🏸 Badminton',
            gym: '💪 Gym', yoga: '🧘 Yoga', running: '🏃 Running', cycling: '🚴 Cycling',
            books: '📚 Books', coding: '💻 Coding', science: '🔬 Science', history: '🏛️ History',
            languages: '🗣️ Languages', podcasts: '🎧 Podcasts',
            travel: '✈️ Travel', food: '🍕 Food', cooking: '🍳 Cooking', coffee: '☕ Coffee',
            fashion: '👗 Fashion', pets: '🐕 Pets', gardening: '🌱 Gardening',
            gaming: '🎮 Gaming', anime: '🎌 Anime', memes: '😂 Memes', astrology: '⭐ Astrology',
        };
        const list = document.getElementById('interestsList');
        data.hobbies.forEach((h, i) => {
            const chip = document.createElement('span');
            chip.className = 'interest-chip';
            chip.textContent = LABELS[h] || h;
            chip.style.animationDelay = `${i * 0.06}s`;
            list.appendChild(chip);
        });
        document.getElementById('interestsSection').style.display = 'block';
    }

    // Music
    if (data.music && data.music.song) {
        const songEl = document.querySelector('[data-role="song"]');
        const artistEl = document.querySelector('[data-role="artist"]');
        const playEl = document.querySelector('[data-role="play"]');
        const artEl = document.getElementById('musicArt');

        songEl.textContent = data.music.song;
        artistEl.textContent = data.music.artist || '';

        if (data.music.link) {
            playEl.href = data.music.link;
            if (data.music.link.includes('spotify.com')) {
                fetch(`/api/spotify-oembed?url=${encodeURIComponent(data.music.link)}`)
                    .then(r => r.json())
                    .then(d => {
                        if (d.thumbnail_url) {
                            artEl.innerHTML = `<img src="${d.thumbnail_url}" alt="album">`;
                        }
                    })
                    .catch(() => {});
            }
        } else {
            playEl.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(data.music.song + ' ' + (data.music.artist || ''))}`;
        }

        document.getElementById('musicSection').style.display = 'block';
    }

    // Gallery
    if (data.gallery && data.gallery.length > 0) {
        const gallery = document.getElementById('gallery');
        data.gallery.forEach((photo, i) => {
            const img = document.createElement('img');
            img.src = photo;
            img.alt = `Photo ${i + 1}`;
            img.loading = 'lazy';
            img.style.animationDelay = `${i * 0.06}s`;
            img.addEventListener('click', () => openLightbox(photo));
            gallery.appendChild(img);
        });
        document.getElementById('gallerySection').style.display = 'block';
    }

    // Links — with auto-detected icons
    if (data.links && data.links.length > 0) {
        const linksEl = document.getElementById('links');
        data.links.forEach(link => {
            const a = document.createElement('a');
            a.className = 'link-btn';
            a.href = link.url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            
            const icon = getLinkIcon(link.url);
            a.innerHTML = `${icon} <span>${escapeHtml(link.label)}</span>`;
            
            linksEl.appendChild(a);
        });
        document.getElementById('linksSection').style.display = 'block';
    }

    // Footer
    const footerNameEl = document.getElementById('footerName');
    if (footerNameEl) {
        footerNameEl.innerHTML = `Made with <span class="heart">❤️</span> by <strong>${escapeHtml(data.name)}</strong>`;
    }
}

// ============================================
// LIGHTBOX
// ============================================
function openLightbox(src) {
    const lb = document.getElementById('lightbox');
    document.getElementById('lightboxImg').src = src;
    lb.classList.add('show');
}

document.getElementById('lightbox')?.addEventListener('click', () => {
    document.getElementById('lightbox').classList.remove('show');
});

// ============================================
// DEPLOY
// ============================================
async function deployPage() {
    const btn = document.getElementById('deployBtn');
    if (!btn) return;

    btn.disabled = true;
    btn.textContent = '⏳ Deploying... Please wait';

    try {
        const fullHtml = buildDeployableHtml();

        const resp = await fetch('/api/deploy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                html: fullHtml,
                username: data.username || data.name.toLowerCase().replace(/\s+/g, '-'),
            }),
        });

        const result = await resp.json();

        if (result.success && result.url) {
            btn.textContent = '✅ Deployed!';
            showDeploySuccess(result.url);
        } else {
            throw new Error(result.detail || 'Deploy failed');
        }
    } catch (e) {
        console.error('Deploy error:', e);
        alert('❌ Deploy failed. Try again.\n\n' + (e.message || ''));
        btn.disabled = false;
        btn.textContent = '🚀 Deploy & Get Link';
    }
}

function buildDeployableHtml() {
    const rootStyle = getComputedStyle(document.documentElement);
    const getVar = (name, fallback) => {
        const val = rootStyle.getPropertyValue(name).trim();
        return val || fallback;
    };

    const cssVars = `
        :root {
            --bg-start: ${getVar('--bg-start', '#0f0c29')};
            --bg-end: ${getVar('--bg-end', '#1a1440')};
            --accent: ${getVar('--accent', '#a78bfa')};
            --accent-2: ${getVar('--accent-2', '#f093fb')};
            --text: ${getVar('--text', '#ffffff')};
            --text-muted: ${getVar('--text-muted', 'rgba(255,255,255,0.65)')};
            --font-display: ${getVar('--font-display', 'Space Grotesk, system-ui, sans-serif')};
            --font-body: ${getVar('--font-body', 'Inter, system-ui, sans-serif')};
        }
    `;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
    <title>${escapeHtml(data.name)} — InstaPage</title>
    <link rel="icon" href="data:,">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${getFontFamily()}&display=swap">
    <style>${cssVars}</style>
</head>
<body>
    ${getBodyHtml()}
    ${getDeployJs()}
</body>
</html>`;
}

function getFontFamily() {
    const rootStyle = getComputedStyle(document.documentElement);
    const display = rootStyle.getPropertyValue('--font-display').replace(/['"]/g, '').split(',')[0].trim();
    const body = rootStyle.getPropertyValue('--font-body').replace(/['"]/g, '').split(',')[0].trim();
    const fonts = [...new Set([display, body])].filter(Boolean);
    return fonts.map(f => `family=${f.replace(/ /g, '+')}:wght@400;500;600;700;800`).join('&');
}





function getBodyHtml() {
    const pageEl = document.querySelector('.page');
    const clone = pageEl.cloneNode(true);
    clone.style.display = 'block';

    // ⭐ Deploy button hata do
    const deployBtnInClone = clone.querySelector('#deployBtn');
    if (deployBtnInClone) deployBtnInClone.remove();

    return `
        <canvas id="bgCanvas"></canvas>
        <div class="mesh-bg"></div>
        ${clone.outerHTML}
        <div class="lightbox" id="lightbox">
            <img class="lightbox-img" id="lightboxImg" src="" alt="Zoom">
        </div>
    `;
}

function getDeployJs() {
    const [r, g, b] = accentRGB;
    return `
    <script>
    document.querySelectorAll('.gallery img').forEach(img => {
        img.addEventListener('click', () => {
            document.getElementById('lightboxImg').src = img.src;
            document.getElementById('lightbox').classList.add('show');
        });
    });
    document.getElementById('lightbox')?.addEventListener('click', () => {
        document.getElementById('lightbox').classList.remove('show');
    });

    const canvas = document.getElementById('bgCanvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
    function createParticles() {
        particles = [];
        const count = Math.min(50, Math.floor(innerWidth / 30));
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                r: Math.random() * 1.5 + 0.5,
                a: Math.random() * 0.5 + 0.2,
            });
        }
    }
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const d = Math.hypot(dx, dy);
                if (d < 130) {
                    ctx.strokeStyle = 'rgba(${r},${g},${b},' + (0.15 * (1 - d / 130)) + ')';
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }
        particles.forEach(p => {
            p.x += p.vx; p.y += p.vy;
            p.vx *= 0.99; p.vy *= 0.99;
            if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
            grad.addColorStop(0, 'rgba(${r},${g},${b},' + p.a + ')');
            grad.addColorStop(1, 'rgba(${r},${g},${b},0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2);
            ctx.fill();
        });
        requestAnimationFrame(animate);
    }
    resize(); createParticles(); animate();
    addEventListener('resize', () => { resize(); createParticles(); });
    </script>
    `;
}

function showDeploySuccess(url) {
    const linkBox = document.createElement('div');
    linkBox.style.cssText = 'position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: white; color: #1a1a1a; padding: 20px 24px; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.4); z-index: 10000; max-width: 90%; width: 400px; font-family: system-ui, sans-serif;';
    linkBox.innerHTML = `
        <div style="font-weight: 800; font-size: 1.1rem; margin-bottom: 8px;">🎉 Your page is LIVE!</div>
        <div style="font-size: 0.85rem; color: #666; margin-bottom: 12px;">Copy this link and paste it in your Instagram bio:</div>
        <div style="background: #f5f5f5; padding: 10px 12px; border-radius: 8px; font-size: 0.8rem; word-break: break-all; margin-bottom: 12px; color: #333;">${url}</div>
        <div style="display: flex; gap: 8px;">
            <button id="copyLinkBtn" style="flex: 1; padding: 10px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 0.9rem;">📋 Copy Link</button>
            <a href="${url}" target="_blank" style="flex: 1; padding: 10px; background: #1a1a1a; color: white; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 0.9rem; text-align: center;">🔗 Open</a>
        </div>
    `;
    document.body.appendChild(linkBox);

    document.getElementById('copyLinkBtn').addEventListener('click', function () {
        navigator.clipboard.writeText(url);
        this.textContent = '✅ Copied!';
        setTimeout(() => { this.textContent = '📋 Copy Link'; }, 2000);
    });
}

// ============================================
// PARTICLES
// ============================================
const canvas = document.getElementById('bgCanvas');
const ctx = canvas.getContext('2d');
let particles = [];
let mouse = { x: null, y: null };

function resize() {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
}

function createParticles() {
    particles = [];
    const count = Math.min(50, Math.floor(innerWidth / 30));
    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            r: Math.random() * 1.5 + 0.5,
            a: Math.random() * 0.5 + 0.2,
        });
    }
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const [r, g, b] = accentRGB;

    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const d = Math.hypot(dx, dy);
            if (d < 130) {
                ctx.strokeStyle = `rgba(${r},${g},${b},${0.15 * (1 - d / 130)})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }
    }

    particles.forEach(p => {
        if (mouse.x !== null) {
            const dx = p.x - mouse.x;
            const dy = p.y - mouse.y;
            const d = Math.hypot(dx, dy);
            if (d < 100) {
                const f = (100 - d) / 100;
                p.vx += (dx / d) * f * 0.2;
                p.vy += (dy / d) * f * 0.2;
            }
        }
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.99;
        p.vy *= 0.99;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        p.x = Math.max(0, Math.min(canvas.width, p.x));
        p.y = Math.max(0, Math.min(canvas.height, p.y));

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
        grad.addColorStop(0, `rgba(${r},${g},${b},${p.a})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${r},${g},${b},${p.a + 0.3})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
    });

    requestAnimationFrame(animate);
}

resize();
createParticles();
animate();

addEventListener('resize', () => { resize(); createParticles(); });
addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
addEventListener('touchmove', e => { if (e.touches[0]) { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; } }, { passive: true });
addEventListener('mouseleave', () => { mouse.x = null; mouse.y = null; });

// ============================================
// UTILITY
// ============================================
function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ============================================
// INIT
// ============================================
(async () => {
    await applyStyle();
    injectData();

    const deployBtn = document.getElementById('deployBtn');
    if (deployBtn) {
        deployBtn.addEventListener('click', deployPage);
    }

    setTimeout(() => {
        document.getElementById('loading').classList.add('hide');
        document.getElementById('page').style.display = 'block';
    }, 300);
})();








// ============================================
// LINK ICON AUTO-DETECTOR
// ============================================
function getLinkIcon(url) {
    const u = (url || '').toLowerCase();
    
    const icons = {
        instagram: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>`,
        
        snapchat: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.02 2c-3.06 0-5.1 2.4-5.1 5.44 0 .55.04 1.09.08 1.6-.74.06-1.55.53-1.55 1.1 0 .58.84.89 1.45 1.05l.35.09c.14.04.25.06.38.13.13.06.2.16.2.28 0 .36-.9 1.66-1.7 2.22-.32.22-.6.35-.6.66 0 .43.83.72 1.4.86.17.04.33.06.47.06.33 0 .62-.1.92-.1.5 0 .84.44 1.4.88.65.52 1.5.9 2.78.9s2.13-.38 2.78-.9c.56-.44.9-.88 1.4-.88.3 0 .59.1.92.1.14 0 .3-.02.47-.06.57-.14 1.4-.43 1.4-.86 0-.31-.28-.44-.6-.66-.8-.56-1.7-1.86-1.7-2.22 0-.12.07-.22.2-.28.13-.07.24-.09.38-.13l.35-.09c.61-.16 1.45-.47 1.45-1.05 0-.57-.81-1.04-1.55-1.1.04-.51.08-1.05.08-1.6C17.12 4.4 15.08 2 12.02 2z"/></svg>`,
        
        linkedin: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z"/></svg>`,
        
        github: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2 0 1.9 1.2 1.9 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.5-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3"/></svg>`,
        
        whatsapp: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.2-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.4-1.4-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.4.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.2 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3z"/></svg>`,
        
        twitter: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 1.15h3.7l-8.1 9.2 9.5 12.5h-7.4l-5.8-7.6-6.7 7.6H.4l8.7-9.9L0 1.15h7.6l5.3 6.9 6-6.9zm-1.3 19.5h2L6.5 3.3H4.4l13.2 17.4z"/></svg>`,
        
        youtube: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z"/></svg>`,
        
        facebook: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.49h-2.8V24C19.62 23.1 24 18.1 24 12.07"/></svg>`,
        
        spotify: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.52 17.28c-.24.36-.66.48-1.02.24-2.82-1.74-6.36-2.1-10.56-1.14-.42.12-.78-.18-.9-.6-.12-.42.18-.78.6-.9 4.56-1.02 8.52-.6 11.64 1.32.36.18.48.66.24 1.02zm1.44-3.3c-.3.42-.84.6-1.26.3-3.24-1.98-8.16-2.58-11.94-1.38-.48.12-1.02-.12-1.14-.6-.12-.48.12-1.02.6-1.14 4.38-1.32 9.78-.66 13.5 1.62.36.24.54.84.24 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.3c-.54.18-1.14-.12-1.32-.66-.18-.54.12-1.14.66-1.32 4.26-1.26 11.28-1.02 15.72 1.62.48.3.66.96.36 1.44-.3.42-.96.6-1.44.3z"/></svg>`,
        
        // Fallback — generic link icon
        default: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`,
    };
    
    // Detect platform from URL
    if (u.includes('instagram.com'))  return icons.instagram;
    if (u.includes('snapchat.com'))   return icons.snapchat;
    if (u.includes('linkedin.com'))   return icons.linkedin;
    if (u.includes('github.com'))     return icons.github;
    if (u.includes('wa.me') || u.includes('whatsapp.com')) return icons.whatsapp;
    if (u.includes('twitter.com') || u.includes('x.com'))  return icons.twitter;
    if (u.includes('youtube.com') || u.includes('youtu.be')) return icons.youtube;
    if (u.includes('facebook.com') || u.includes('fb.com')) return icons.facebook;
    if (u.includes('spotify.com'))    return icons.spotify;
    
    return icons.default;
}