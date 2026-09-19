// ===== ELEMENT REFERENCES =====
const form = document.getElementById('pageForm');
const instaUsername = document.getElementById('instaUsername');
const fetchBtn = document.getElementById('fetchBtn');
const fetchHint = document.getElementById('fetchHint');
const fullName = document.getElementById('fullName');
const bio = document.getElementById('bio');
const age = document.getElementById('age');
const dob = document.getElementById('dob');
const photoInput = document.getElementById('photoInput');
const photoPreview = document.getElementById('photoPreview');
const linksContainer = document.getElementById('linksContainer');
const addLinkBtn = document.getElementById('addLinkBtn');
const themeCards = document.querySelectorAll('.theme-card');
const hobbyCategories = document.getElementById('hobbyCategories');
const galleryInput = document.getElementById('galleryInput');
const galleryGrid = document.getElementById('galleryGrid');
const galleryAdd = document.getElementById('galleryAdd');
const favSong = document.getElementById('favSong');
const favArtist = document.getElementById('favArtist');
const favMusicLink = document.getElementById('favMusicLink');

let photoBase64 = null;
let selectedTheme = 'soft-gradient';
let selectedHobbies = [];
let galleryPhotos = [];

const MAX_HOBBIES = 8;
const MAX_GALLERY = 9;

// ============================================
// ⭐ INTERACTIVE ANIMATED BACKGROUND
// ============================================
const canvas = document.getElementById('bgCanvas');
const ctx = canvas.getContext('2d');
let particles = [];
let mouse = { x: null, y: null };

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function createParticles() {
    particles = [];
    const count = Math.min(80, Math.floor(window.innerWidth / 20));
    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            radius: Math.random() * 2 + 0.5,
            hue: Math.random() * 60 + 240, // purple-blue range
            alpha: Math.random() * 0.5 + 0.2,
        });
    }
}

function animateBackground() {
    // Dark gradient base
    const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width
    );
    gradient.addColorStop(0, 'rgba(30, 20, 60, 1)');
    gradient.addColorStop(0.5, 'rgba(15, 10, 30, 1)');
    gradient.addColorStop(1, 'rgba(5, 5, 10, 1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw connecting lines between nearby particles
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 120) {
                ctx.strokeStyle = `hsla(${particles[i].hue}, 70%, 60%, ${0.15 * (1 - dist / 120)})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }
    }

    // Draw and update particles
    particles.forEach(p => {
        // Mouse interaction — particles push away
        if (mouse.x !== null) {
            const dx = p.x - mouse.x;
            const dy = p.y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 100) {
                const force = (100 - dist) / 100;
                p.vx += (dx / dist) * force * 0.3;
                p.vy += (dy / dist) * force * 0.3;
            }
        }

        p.x += p.vx;
        p.y += p.vy;

        // Friction
        p.vx *= 0.99;
        p.vy *= 0.99;

        // Bounce
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        // Keep in bounds
        p.x = Math.max(0, Math.min(canvas.width, p.x));
        p.y = Math.max(0, Math.min(canvas.height, p.y));

        // Draw particle with glow
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 6);
        grd.addColorStop(0, `hsla(${p.hue}, 80%, 70%, ${p.alpha})`);
        grd.addColorStop(1, `hsla(${p.hue}, 80%, 70%, 0)`);
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 6, 0, Math.PI * 2);
        ctx.fill();

        // Center dot
        ctx.fillStyle = `hsla(${p.hue}, 90%, 80%, ${p.alpha + 0.3})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    requestAnimationFrame(animateBackground);
}

resizeCanvas();
createParticles();
animateBackground();

window.addEventListener('resize', () => {
    resizeCanvas();
    createParticles();
});

window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

window.addEventListener('mouseleave', () => {
    mouse.x = null;
    mouse.y = null;
});

// ============================================
// ⭐ HOBBIES (Expanded, Categories)
// ============================================
const HOBBY_DATA = {
    '🎵 Music & Arts': [
        { id: 'music', label: '🎵 Music' },
        { id: 'singing', label: '🎤 Singing' },
        { id: 'dance', label: '💃 Dance' },
        { id: 'art', label: '🎨 Art' },
        { id: 'photography', label: '📷 Photography' },
        { id: 'movies', label: '🎬 Movies' },
        { id: 'theatre', label: '🎭 Theatre' },
    ],
    '🏏 Sports & Fitness': [
        { id: 'cricket', label: '🏏 Cricket' },
        { id: 'football', label: '⚽ Football' },
        { id: 'badminton', label: '🏸 Badminton' },
        { id: 'gym', label: '💪 Gym' },
        { id: 'yoga', label: '🧘 Yoga' },
        { id: 'running', label: '🏃 Running' },
        { id: 'cycling', label: '🚴 Cycling' },
    ],
    '📚 Knowledge': [
        { id: 'books', label: '📚 Books' },
        { id: 'coding', label: '💻 Coding' },
        { id: 'science', label: '🔬 Science' },
        { id: 'history', label: '🏛️ History' },
        { id: 'languages', label: '🗣️ Languages' },
        { id: 'podcasts', label: '🎧 Podcasts' },
    ],
    '✈️ Lifestyle': [
        { id: 'travel', label: '✈️ Travel' },
        { id: 'food', label: '🍕 Food' },
        { id: 'cooking', label: '🍳 Cooking' },
        { id: 'coffee', label: '☕ Coffee' },
        { id: 'fashion', label: '👗 Fashion' },
        { id: 'pets', label: '🐕 Pets' },
        { id: 'gardening', label: '🌱 Gardening' },
    ],
    '🎮 Entertainment': [
        { id: 'gaming', label: '🎮 Gaming' },
        { id: 'anime', label: '🎌 Anime' },
        { id: 'memes', label: '😂 Memes' },
        { id: 'astrology', label: '⭐ Astrology' },
    ],
};

function renderHobbies() {
    hobbyCategories.innerHTML = '';
    for (const [category, hobbies] of Object.entries(HOBBY_DATA)) {
        const catDiv = document.createElement('div');
        catDiv.className = 'hobby-category';
        catDiv.innerHTML = `
            <div class="category-title">${category}</div>
            <div class="hobby-chips">
                ${hobbies.map(h => `<div class="hobby-chip" data-hobby="${h.id}">${h.label}</div>`).join('')}
            </div>
        `;
        hobbyCategories.appendChild(catDiv);
    }
}

renderHobbies();

hobbyCategories.addEventListener('click', (e) => {
    const chip = e.target.closest('.hobby-chip');
    if (!chip) return;

    const hobby = chip.dataset.hobby;

    if (chip.classList.contains('selected')) {
        chip.classList.remove('selected');
        selectedHobbies = selectedHobbies.filter(h => h !== hobby);
    } else {
        if (selectedHobbies.length >= MAX_HOBBIES) {
            alert(`Max ${MAX_HOBBIES} interests choose kar sakte ho`);
            return;
        }
        chip.classList.add('selected');
        selectedHobbies.push(hobby);
    }
});

// ============================================
// PHOTO UPLOAD (Profile)
// ============================================
photoPreview.addEventListener('click', () => photoInput.click());

photoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
        alert('Photo 3MB se choti honi chahiye');
        return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
        photoBase64 = ev.target.result;
        photoPreview.innerHTML = `<img src="${photoBase64}" alt="Profile">`;
    };
    reader.readAsDataURL(file);
});

// ============================================
// ⭐ GALLERY (Multiple Photos)
// ============================================
galleryAdd.addEventListener('click', () => galleryInput.click());

galleryInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    for (const file of files) {
        if (galleryPhotos.length >= MAX_GALLERY) {
            alert(`Max ${MAX_GALLERY} photos allowed`);
            break;
        }
        if (file.size > 3 * 1024 * 1024) {
            alert(`${file.name} 3MB se badi hai, skip kar diya`);
            continue;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            galleryPhotos.push(ev.target.result);
            renderGallery();
        };
        reader.readAsDataURL(file);
    }

    galleryInput.value = ''; // reset
});

function renderGallery() {
    // Clear all except the "add" button
    galleryGrid.innerHTML = '';
    
    // Render photos
    galleryPhotos.forEach((photo, index) => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.innerHTML = `
            <img src="${photo}" alt="Gallery ${index + 1}">
            <button class="gallery-remove" data-index="${index}">✕</button>
        `;
        galleryGrid.appendChild(item);
    });

    // Add "add" button if not at limit
    if (galleryPhotos.length < MAX_GALLERY) {
        galleryGrid.appendChild(galleryAdd);
    }

    // Attach remove handlers
    document.querySelectorAll('.gallery-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            galleryPhotos.splice(index, 1);
            renderGallery();
        });
    });
}

// ============================================
// THEME PICKER
// ============================================
themeCards.forEach(card => {
    card.addEventListener('click', () => {
        themeCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedTheme = card.dataset.theme;
    });
});

themeCards[0].classList.add('selected');

// ============================================
// LINKS MANAGEMENT
// ============================================
let linkCount = 0;

function addLinkRow() {
    if (linkCount >= 6) {
        alert('Max 6 links allowed');
        return;
    }
    linkCount++;

    const row = document.createElement('div');
    row.className = 'link-row';
    row.innerHTML = `
        <input type="text" class="link-label" placeholder="Label (e.g. WhatsApp)" maxlength="20" />
        <input type="url" class="link-url" placeholder="https://..." />
        <button type="button" class="remove-link">✕</button>
    `;
    linksContainer.appendChild(row);

    row.querySelector('.remove-link').addEventListener('click', () => {
        row.remove();
        linkCount--;
    });
}

addLinkBtn.addEventListener('click', addLinkRow);
addLinkRow();

// ============================================
// FETCH (Placeholder)
// ============================================
fetchBtn.addEventListener('click', async () => {
    const username = instaUsername.value.trim().replace('@', '');
    if (!username) {
        alert('Username daalo');
        return;
    }

    fetchBtn.textContent = '...';
    fetchBtn.disabled = true;
    fetchHint.textContent = 'Fetching...';

    const API_URL = 'https://instapage-backend.onrender.com';

    try {
        const resp = await fetch(`${API_URL}/api/fetch-insta?username=${encodeURIComponent(username)}`);
        const data = await resp.json();

        if (data.success) {
            if (data.full_name) fullName.value = data.full_name;
            if (data.bio) bio.value = data.bio;
            if (data.photo) {
                photoBase64 = data.photo;
                photoPreview.innerHTML = `<img src="${data.photo}" alt="Profile">`;
            }
            fetchHint.textContent = '✅ Fetched! Edit anything below.';
        } else {
            fetchHint.textContent = '⚠️ Could not fetch. Fill manually ↓';
        }
    } catch (err) {
        fetchHint.textContent = '⚠️ Fetch failed. Fill manually ↓';
    } finally {
        fetchBtn.textContent = 'Fetch';
        fetchBtn.disabled = false;
    }
});

// ============================================
// FORM SUBMIT
// ============================================
form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Sirf naam compulsory
    if (!fullName.value.trim()) {
        alert('Naam daalo (ye compulsory hai)');
        return;
    }

    // Collect links
    const links = [];
    document.querySelectorAll('.link-row').forEach(row => {
        const label = row.querySelector('.link-label').value.trim();
        const url = row.querySelector('.link-url').value.trim();
        if (label && url) {
            links.push({ label, url });
        }
    });

    const pageData = {
        name: fullName.value.trim(),
        bio: bio.value.trim(),
        age: age.value.trim(),
        dob: dob.value.trim(),
        photo: photoBase64,
        hobbies: selectedHobbies,
        gallery: galleryPhotos,
        music: {
            song: favSong.value.trim(),
            artist: favArtist.value.trim(),
            link: favMusicLink.value.trim(),
        },
        links: links,
        theme: selectedTheme,
        username: instaUsername.value.trim().replace('@', ''),
    };

    localStorage.setItem('instapage_data', JSON.stringify(pageData));
    window.location.href = 'preview.html';
});