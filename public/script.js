// ========================================
// FmcComic - Script.js (Updated API)
// API: sankavollerei.com/comic/softkomik
// ========================================

const API_BASE = "https://www.sankavollerei.com/comic/softkomik";
const BACKEND_URL = window.location.origin;

const contentArea = document.getElementById('content-area');
const filterPanel = document.getElementById('filter-panel');
const mainNav = document.getElementById('main-nav');
const mobileNav = document.getElementById('mobile-nav');
const progressBar = document.getElementById('progress-bar');

let currentChapterList = [];
let currentComicContext = { slug: null, title: null, image: null };
let isNavigating = false;

/* ---------------- Helpers ---------------- */

async function getUuidFromSlug(slug, type) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/get-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, type })
    });
    const data = await res.json();
    return data.uuid;
  } catch (e) {
    return slug;
  }
}

async function getSlugFromUuid(uuid) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/get-slug/${uuid}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

function updateURL(path) {
  if (window.location.pathname !== path) history.pushState(null, null, path);
}

function getTypeClass(type) {
  if (!type) return 'type-default';
  const t = String(type).toLowerCase();
  if (t.includes('manga')) return 'type-manga';
  if (t.includes('manhwa')) return 'type-manhwa';
  if (t.includes('manhua')) return 'type-manhua';
  return 'type-default';
}

function redirectTo404() {
  contentArea.innerHTML = `<div class="text-center py-40 text-red-500">Error 404: Halaman tidak ditemukan.</div>`;
}

async function fetchAPI(url) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.success) return data;
    return null;
  } catch (e) {
    console.error('API Error:', e);
    return null;
  }
}

function toggleFilter() {
  filterPanel.classList.toggle('hidden');
}

function resetNavs() {
  mainNav.classList.remove('-translate-y-full');
  mobileNav.classList.remove('translate-y-full');
  filterPanel.classList.add('hidden');
}

function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
  }
}

function setLoading() {
  contentArea.innerHTML = `
    <div class="flex justify-center py-40">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-amber-500"></div>
    </div>`;
}

function lockNav() {
  isNavigating = true;
  setProgress(0);
}

function unlockNav() {
  isNavigating = false;
}

function setProgress(percent) {
  if (!progressBar) return;
  const p = Math.max(0, Math.min(100, percent));
  progressBar.style.width = `${p}%`;
}

/* progress reader: berdasarkan scroll */
function bindReaderProgress() {
  const onScroll = () => {
    const doc = document.documentElement;
    const scrollTop = doc.scrollTop || document.body.scrollTop;
    const scrollHeight = doc.scrollHeight - doc.clientHeight;
    if (scrollHeight <= 0) return setProgress(0);
    const percent = (scrollTop / scrollHeight) * 100;
    setProgress(percent);
  };
  window.removeEventListener('scroll', onScroll);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ---------------- Data Functions ---------------- */

async function showHome(push = true) {
  if (push) updateURL('/');
  resetNavs();
  setLoading();

  const data = await fetchAPI(`${API_BASE}/home`);
  if (!data || !data.data) { redirectTo404(); return; }

  const { trending, latest } = data.data;

  contentArea.innerHTML = `
    <section class="mb-12">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold flex items-center gap-2">
          <i class="fa fa-fire text-amber-500"></i> Trending Sekarang
        </h2>
      </div>
      <div class="flex overflow-x-auto gap-4 hide-scroll pb-4 -mx-4 px-4 md:mx-0 md:px-0">
        ${(trending || []).map(item => `
          <div class="min-w-[150px] md:min-w-[200px] cursor-pointer card-hover relative rounded-2xl overflow-hidden group"
              onclick="showDetail('${item.slug}')">
            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent z-10"></div>
            <span class="type-badge ${getTypeClass(item.type)}">${item.type || 'Hot'}</span>
            <img src="${item.image}" class="h-64 md:h-80 w-full object-cover transform group-hover:scale-110 transition duration-500">
            <div class="absolute bottom-0 left-0 p-3 z-20 w-full">
              <h3 class="text-sm font-bold truncate text-white drop-shadow-md">${item.title}</h3>
              <p class="text-amber-400 text-xs font-semibold mt-1">${item.latestChapter || 'Update'}</p>
            </div>
          </div>
        `).join('')}
      </div>
    </section>

    <div class="mb-12">
      <h2 class="text-xl font-bold mb-6 border-l-4 border-amber-500 pl-4">Update Terbaru</h2>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        ${(latest || []).slice(0, 20).map(item => `
          <div class="bg-zinc-900/40 border border-white/5 rounded-xl overflow-hidden cursor-pointer hover:border-amber-500/50 transition group"
              onclick="showDetail('${item.slug}')">
            <div class="relative h-48 overflow-hidden">
              <span class="type-badge ${getTypeClass(item.type)} bottom-2 left-2 top-auto">${item.type || 'UP'}</span>
              <img src="${item.image}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">
            </div>
            <div class="p-3">
              <h3 class="text-xs font-bold line-clamp-2 h-8 leading-relaxed">${item.title}</h3>
              <div class="flex justify-between items-center mt-3">
                <span class="text-[10px] bg-white/5 px-2 py-1 rounded text-gray-400">${item.latestChapter || 'Baca'}</span>
                <span class="text-[10px] text-gray-500">${item.status || ''}</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  window.scrollTo(0, 0);
}

async function showOngoing() {
  updateURL('/ongoing'); 
  resetNavs();
  setLoading();
  
  const data = await fetchAPI(`${API_BASE}/home`);
  if (!data || !data.data || !data.data.latest) { 
    redirectTo404(); 
    return; 
  }
  
  const ongoingComics = data.data.latest.filter(comic => comic.status === 'ongoing');
  
  contentArea.innerHTML = `
    <h2 class="text-2xl font-bold mb-8 border-l-4 border-amber-500 pl-4">Komik Ongoing</h2>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
      ${ongoingComics.map(item => `
        <div class="bg-zinc-900/40 rounded-xl overflow-hidden border border-white/5 card-hover cursor-pointer relative group"
            onclick="showDetail('${item.slug}')">
          <span class="type-badge ${getTypeClass(item.type)}">${item.type || 'Comic'}</span>
          <div class="relative overflow-hidden aspect-[3/4]">
            <img src="${item.image}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition duration-300"></div>
          </div>
          <div class="p-3 text-center">
            <h3 class="text-xs font-bold truncate group-hover:text-amber-500 transition">${item.title}</h3>
            <p class="text-[10px] text-amber-500 mt-1 font-medium">${item.latestChapter || 'Baca'}</p>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  window.scrollTo(0, 0);
}

async function showCompleted() {
  updateURL('/completed'); 
  resetNavs();
  setLoading();
  
  const data = await fetchAPI(`${API_BASE}/home`);
  if (!data || !data.data || !data.data.latest) { 
    redirectTo404(); 
    return; 
  }
  
  const completedComics = data.data.latest.filter(comic => comic.status === 'tamat' || comic.status === 'completed');
  
  contentArea.innerHTML = `
    <h2 class="text-2xl font-bold mb-8 border-l-4 border-green-500 pl-4">Komik Tamat (Selesai)</h2>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
      ${completedComics.length > 0 ? completedComics.map(item => `
        <div class="bg-zinc-900/40 rounded-xl overflow-hidden border border-white/5 card-hover cursor-pointer relative group"
            onclick="showDetail('${item.slug}')">
          <span class="type-badge ${getTypeClass(item.type)}">${item.type || 'Comic'}</span>
          <div class="relative overflow-hidden aspect-[3/4]">
            <img src="${item.image}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">
            <div class="absolute top-2 right-2 bg-green-500 text-black px-2 py-1 rounded-full text-[8px] font-bold">TAMAT</div>
          </div>
          <div class="p-3 text-center">
            <h3 class="text-xs font-bold truncate group-hover:text-amber-500 transition">${item.title}</h3>
            <p class="text-[10px] text-green-500 mt-1 font-medium">${item.latestChapter || 'Selesai'}</p>
          </div>
        </div>
      `).join('') : '<div class="col-span-full text-center text-gray-500 py-20">Tidak ada komik tamat tersedia</div>'}
    </div>
  `;
  window.scrollTo(0, 0);
}

async function handleSearch(event) {
  if (event.key === 'Enter') {
    const query = document.getElementById('search-input').value.trim();
    if (query) {
      filterPanel.classList.add('hidden');
      setLoading();
      const data = await fetchAPI(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
      if (!data || !data.data || data.data.length === 0) {
        contentArea.innerHTML = `
          <div class="text-center py-40 text-gray-500 flex flex-col items-center gap-4">
            <i class="fa fa-search text-4xl opacity-50"></i>
            <p>Tidak ada hasil untuk "${query}"</p>
          </div>`;
        return;
      }
      
      contentArea.innerHTML = `
        <h2 class="text-2xl font-bold mb-8 border-l-4 border-amber-500 pl-4">Hasil Pencarian: "${query}"</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          ${data.data.map(item => `
            <div class="bg-zinc-900/40 rounded-xl overflow-hidden border border-white/5 card-hover cursor-pointer relative group"
                onclick="showDetail('${item.slug}')">
              <span class="type-badge ${getTypeClass(item.type)}">${item.type || 'Comic'}</span>
              <div class="relative overflow-hidden aspect-[3/4]">
                <img src="${item.image}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">
              </div>
              <div class="p-3 text-center">
                <h3 class="text-xs font-bold truncate group-hover:text-amber-500 transition">${item.title}</h3>
                <p class="text-[10px] text-gray-400 mt-1">${item.status || ''}</p>
              </div>
            </div>
          `).join('')}
        </div>
      `;
      window.scrollTo(0, 0);
    }
  }
}

async function applyAdvancedFilter() {
  const query = document.getElementById('search-input').value.trim();
  const type = document.getElementById('filter-type').value;
  const status = document.getElementById('filter-status').value;

  filterPanel.classList.add('hidden');
  setLoading();

  if (query) {
    const event = { key: 'Enter' };
    await handleSearch(event);
    return;
  }

  // Get all comics and filter by type/status
  const data = await fetchAPI(`${API_BASE}/home`);
  if (!data || !data.data || !data.data.latest) { 
    redirectTo404(); 
    return; 
  }

  let filtered = data.data.latest;
  
  if (type) {
    filtered = filtered.filter(item => item.type && item.type.toLowerCase() === type.toLowerCase());
  }
  
  if (status) {
    if (status === 'completed') {
      filtered = filtered.filter(item => item.status === 'tamat' || item.status === 'completed');
    } else {
      filtered = filtered.filter(item => item.status === status);
    }
  }

  contentArea.innerHTML = `
    <h2 class="text-2xl font-bold mb-8 border-l-4 border-amber-500 pl-4">Hasil Filter</h2>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
      ${filtered.length > 0 ? filtered.map(item => `
        <div class="bg-zinc-900/40 rounded-xl overflow-hidden border border-white/5 card-hover cursor-pointer relative group"
            onclick="showDetail('${item.slug}')">
          <span class="type-badge ${getTypeClass(item.type)}">${item.type || 'Comic'}</span>
          <div class="relative overflow-hidden aspect-[3/4]">
            <img src="${item.image}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">
          </div>
          <div class="p-3 text-center">
            <h3 class="text-xs font-bold truncate group-hover:text-amber-500 transition">${item.title}</h3>
            <p class="text-[10px] text-amber-500 mt-1 font-medium">${item.latestChapter || 'Baca'}</p>
          </div>
        </div>
      `).join('') : '<div class="col-span-full text-center text-gray-500 py-20">Tidak ada komik ditemukan</div>'}
    </div>
  `;
  window.scrollTo(0, 0);
}

/* ---------------- Detail Page Logic ---------------- */

async function showDetail(idOrSlug, push = true) {
  let slug = idOrSlug;
  setLoading();

  if (idOrSlug.length === 36) {
    const mapping = await getSlugFromUuid(idOrSlug);
    if (mapping) slug = mapping.slug;
  }

  if (push) {
    const uuid = await getUuidFromSlug(slug, 'series');
    updateURL(`/series/${uuid}`);
  }

  resetNavs();
  const data = await fetchAPI(`${API_BASE}/detail/${slug}`);
  if (!data || !data.data) { redirectTo404(); return; }

  const res = data.data;
  currentChapterList = res.chapters || [];
  currentComicContext = { slug, title: res.title, image: res.image };

  const history = JSON.parse(localStorage.getItem('fmc_history') || '[]');
  const savedItem = history.find(h => h.slug === slug);
  const lastCh = savedItem ? savedItem.lastChapterSlug : null;
  const firstCh = res.chapters?.length > 0 ? res.chapters[res.chapters.length - 1].slug : null;

  const startBtnText = lastCh ? "Lanjut Baca" : "Mulai Baca";
  const startBtnAction = lastCh
    ? `readChapter('${lastCh}', '${slug}')`
    : (firstCh ? `readChapter('${firstCh}', '${slug}')` : "alert('Chapter belum tersedia')");

  const backdropHTML = `
    <div class="fixed top-0 left-0 w-full h-[60vh] -z-10 pointer-events-none overflow-hidden">
      <img src="${res.image}" class="w-full h-full object-cover blur-2xl opacity-20 backdrop-banner animate-pulse-slow">
      <div class="absolute inset-0 bg-gradient-to-b from-[#0b0b0f]/40 via-[#0b0b0f]/80 to-[#0b0b0f]"></div>
    </div>
  `;

  const synopsisText = res.synopsis || "Sinopsis tidak tersedia.";
  const isLongSynopsis = synopsisText.length > 250;
  
  const ratingDisplay = res.rating && res.rating.average ? res.rating.average.toFixed(1) : 'N/A';
  const genresHTML = res.genres && res.genres.length > 0 
    ? res.genres.map(g => `<span class="text-gray-400 text-xs px-3 py-1 rounded-full border border-white/10 hover:border-amber-500/50 bg-white/5">${g}</span>`).join('')
    : '<span class="text-gray-500 text-xs">-</span>';

  contentArea.innerHTML = `
    ${backdropHTML}

    <div class="relative z-10 flex flex-col md:flex-row gap-8 lg:gap-12 mt-4 animate-fade-in">

      <div class="md:w-[280px] flex-shrink-0 mx-auto md:mx-0 w-full max-w-[280px]">
        <div class="relative group">
          <span class="type-badge ${getTypeClass(res.type)} scale-110 top-4 left-4 shadow-lg">${res.type || 'Comic'}</span>
          <img src="${res.image}" class="w-full rounded-2xl shadow-2xl border border-white/10 group-hover:border-amber-500/30 transition duration-500">
        </div>

        <div class="flex flex-col gap-3 mt-6">
          <button onclick="${startBtnAction}" class="amber-gradient w-full py-3.5 rounded-xl font-bold text-black flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition shadow-lg shadow-amber-500/20">
            <i class="fa fa-book-open"></i> ${startBtnText}
          </button>
          <button onclick="toggleBookmark('${slug}', '${String(res.title).replace(/'/g, "")}', '${res.image}')" id="btn-bookmark"
            class="w-full py-3.5 rounded-xl glass font-semibold border-white/10 hover:bg-white/10 transition flex items-center justify-center gap-2">
            <i class="fa fa-bookmark"></i> Simpan
          </button>
        </div>
      </div>

      <div class="flex-1 min-w-0">
        <h1 class="text-3xl md:text-5xl font-extrabold mb-4 leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">${res.title}</h1>

        <div class="flex flex-wrap gap-3 mb-6">
          <div class="glass px-4 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold text-amber-400 border border-amber-500/20">
            <i class="fa fa-star"></i> ${ratingDisplay}
          </div>
          <div class="glass px-4 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold text-green-400 border border-green-500/20">
            <i class="fa fa-circle text-[6px]"></i> ${res.status || 'Unknown'}
          </div>
          <div class="glass px-4 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold text-blue-400 border border-blue-500/20">
            ${res.type || 'Comic'}
          </div>
        </div>

        <div class="flex flex-wrap gap-2 mb-6">
          ${genresHTML}
        </div>

        <div class="bg-white/5 rounded-2xl p-5 md:p-6 mb-8 border border-white/5 backdrop-blur-sm">
          <h3 class="font-bold text-sm mb-2 text-amber-500 uppercase tracking-wide">Sinopsis</h3>
          <p id="synopsis-text" class="text-gray-300 text-sm leading-relaxed text-justify ${isLongSynopsis ? 'line-clamp-4' : ''} transition-all duration-300">
            ${synopsisText}
          </p>
          ${isLongSynopsis ? `
          <button onclick="document.getElementById('synopsis-text').classList.toggle('line-clamp-4')" 
            class="mt-3 text-amber-500 text-xs font-semibold hover:text-amber-400 transition">
            Baca Selengkapnya <i class="fa fa-chevron-down"></i>
          </button>` : ''}
        </div>

        <div class="bg-white/5 rounded-2xl p-5 md:p-6 border border-white/5">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-bold text-lg text-amber-500">Daftar Chapter</h3>
            <span class="text-xs text-gray-400">${res.totalChapters || res.chapters?.length || 0} Chapter</span>
          </div>
          <div class="max-h-[500px] overflow-y-auto chapter-list-scroll space-y-2">
            ${(res.chapters || []).map((ch, idx) => `
              <div onclick="readChapter('${ch.slug}', '${slug}')" 
                class="flex justify-between items-center p-3 bg-black/30 hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/30 rounded-lg cursor-pointer group transition">
                <div class="flex items-center gap-3">
                  <span class="w-8 h-8 flex items-center justify-center bg-amber-500/10 text-amber-500 rounded-lg text-xs font-bold group-hover:bg-amber-500 group-hover:text-black transition">
                    ${res.chapters.length - idx}
                  </span>
                  <span class="text-sm font-medium group-hover:text-amber-500 transition">${ch.title || 'Chapter ' + ch.chapter}</span>
                </div>
                <i class="fa fa-chevron-right text-xs text-gray-500 group-hover:text-amber-500 transition"></i>
              </div>
            `).join('')}
          </div>
        </div>

        ${res.recommendations && res.recommendations.length > 0 ? `
        <div class="mt-12">
          <h3 class="text-xl font-bold mb-6 border-l-4 border-amber-500 pl-4">Rekomendasi</h3>
          <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
            ${res.recommendations.slice(0, 6).map(item => `
              <div onclick="showDetail('${item.slug}')" class="cursor-pointer group">
                <div class="relative overflow-hidden rounded-lg aspect-[3/4] border border-white/5 group-hover:border-amber-500/50 transition">
                  <img src="${item.image}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">
                </div>
                <p class="text-xs font-medium mt-2 truncate group-hover:text-amber-500 transition">${item.title}</p>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
      </div>
    </div>
  `;
  
  updateBookmarkButton(slug);
  window.scrollTo(0, 0);
}

/* ---------------- Chapter Reader Logic ---------------- */

async function readChapter(chapterSlug, comicSlug) {
  lockNav();
  setLoading();
  
  const uuid = await getUuidFromSlug(comicSlug, 'series');
  const chUuid = await getUuidFromSlug(chapterSlug, 'chapter');
  updateURL(`/series/${uuid}/chapter/${chUuid}`);

  const data = await fetchAPI(`${API_BASE}/chapter/${comicSlug}/${chapterSlug}`);
  if (!data || !data.data) { 
    redirectTo404(); 
    unlockNav();
    return; 
  }

  const chapter = data.data;
  
  // Save to history
  saveToHistory(comicSlug, currentComicContext.title, currentComicContext.image, chapterSlug, chapter.title);

  const currentIdx = currentChapterList.findIndex(c => c.slug === chapterSlug);
  const prevChapter = currentIdx < currentChapterList.length - 1 ? currentChapterList[currentIdx + 1] : null;
  const nextChapter = currentIdx > 0 ? currentChapterList[currentIdx - 1] : null;

  contentArea.innerHTML = `
    <div class="fixed top-0 left-0 w-full glass z-40 border-b border-white/5 transition-all duration-300" id="reader-header">
      <div class="container mx-auto px-4 py-3 flex justify-between items-center">
        <button onclick="showDetail('${comicSlug}')" class="flex items-center gap-2 text-sm font-medium hover:text-amber-500 transition">
          <i class="fa fa-arrow-left"></i> <span class="hidden md:inline">Kembali</span>
        </button>
        <div class="flex-1 mx-4 text-center">
          <h2 class="text-sm md:text-base font-bold truncate">${currentComicContext.title}</h2>
          <p class="text-xs text-gray-400">${chapter.title || 'Chapter ' + chapter.chapter}</p>
        </div>
        <button onclick="toggleFullScreen()" class="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-full transition">
          <i class="fa fa-expand"></i>
        </button>
      </div>
    </div>

    <div class="mt-20 flex flex-col items-center" id="reader-images">
      ${(chapter.images || []).map((img, idx) => `
        <img src="${img}" 
          alt="Page ${idx + 1}" 
          class="comic-page w-full max-w-4xl mb-1 skeleton"
          loading="${idx < 3 ? 'eager' : 'lazy'}"
          onload="this.classList.remove('skeleton')"
          onerror="this.src='https://via.placeholder.com/800x1200?text=Image+Error'">
      `).join('')}
    </div>

    <div class="fixed bottom-0 left-0 w-full glass z-40 border-t border-white/5 transition-all duration-300" id="reader-footer">
      <div class="container mx-auto px-4 py-4 flex justify-between items-center gap-4">
        ${prevChapter ? `
          <button onclick="readChapter('${prevChapter.slug}', '${comicSlug}')" 
            class="flex-1 amber-gradient py-2.5 rounded-lg font-bold text-black text-xs md:text-sm flex items-center justify-center gap-2 hover:opacity-90 transition shadow-lg shadow-amber-500/20">
            <i class="fa fa-chevron-left"></i> <span class="hidden md:inline">Prev</span>
          </button>
        ` : '<div class="flex-1"></div>'}
        
        <button onclick="showDetail('${comicSlug}')" 
          class="flex-1 glass py-2.5 rounded-lg font-bold text-xs md:text-sm hover:bg-white/10 transition">
          <i class="fa fa-list"></i> <span class="hidden md:inline">Chapters</span>
        </button>
        
        ${nextChapter ? `
          <button onclick="readChapter('${nextChapter.slug}', '${comicSlug}')" 
            class="flex-1 amber-gradient py-2.5 rounded-lg font-bold text-black text-xs md:text-sm flex items-center justify-center gap-2 hover:opacity-90 transition shadow-lg shadow-amber-500/20">
            <span class="hidden md:inline">Next</span> <i class="fa fa-chevron-right"></i>
          </button>
        ` : '<div class="flex-1"></div>'}
      </div>
    </div>
  `;

  bindReaderProgress();
  bindReaderUIToggle();
  unlockNav();
  window.scrollTo(0, 0);
}

function bindReaderUIToggle() {
  const header = document.getElementById('reader-header');
  const footer = document.getElementById('reader-footer');
  const images = document.getElementById('reader-images');

  if (!images) return;

  let isHidden = false;

  images.addEventListener('click', (e) => {
    if (e.target.tagName === 'IMG') {
      isHidden = !isHidden;
      if (isHidden) {
        header?.classList.add('ui-hidden-top');
        footer?.classList.add('ui-hidden-bottom');
        mainNav?.classList.add('-translate-y-full');
        mobileNav?.classList.add('translate-y-full');
      } else {
        header?.classList.remove('ui-hidden-top');
        footer?.classList.remove('ui-hidden-bottom');
        mainNav?.classList.remove('-translate-y-full');
        mobileNav?.classList.remove('translate-y-full');
      }
    }
  });
}

/* ---------------- Bookmark System ---------------- */

function toggleBookmark(slug, title, image) {
  let bookmarks = JSON.parse(localStorage.getItem('fmc_bookmarks') || '[]');
  const idx = bookmarks.findIndex(b => b.slug === slug);
  
  if (idx >= 0) {
    bookmarks.splice(idx, 1);
    alert('Bookmark dihapus!');
  } else {
    bookmarks.push({ slug, title, image, date: new Date().toISOString() });
    alert('Komik disimpan ke bookmark!');
  }
  
  localStorage.setItem('fmc_bookmarks', JSON.stringify(bookmarks));
  updateBookmarkButton(slug);
}

function updateBookmarkButton(slug) {
  const btn = document.getElementById('btn-bookmark');
  if (!btn) return;
  
  const bookmarks = JSON.parse(localStorage.getItem('fmc_bookmarks') || '[]');
  const isBookmarked = bookmarks.some(b => b.slug === slug);
  
  if (isBookmarked) {
    btn.innerHTML = '<i class="fa fa-bookmark"></i> Tersimpan';
    btn.classList.add('bg-amber-500/10', 'border-amber-500/50');
  } else {
    btn.innerHTML = '<i class="fa fa-bookmark"></i> Simpan';
    btn.classList.remove('bg-amber-500/10', 'border-amber-500/50');
  }
}

function showBookmarks() {
  resetNavs();
  updateURL('/bookmarks');
  
  const bookmarks = JSON.parse(localStorage.getItem('fmc_bookmarks') || '[]');
  
  if (bookmarks.length === 0) {
    contentArea.innerHTML = `
      <div class="text-center py-40 text-gray-500 flex flex-col items-center gap-4">
        <i class="fa fa-bookmark text-4xl opacity-50"></i>
        <p>Belum ada bookmark</p>
      </div>`;
    return;
  }

  contentArea.innerHTML = `
    <h2 class="text-2xl font-bold mb-8 border-l-4 border-amber-500 pl-4">Bookmark Saya</h2>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
      ${bookmarks.reverse().map(item => `
        <div class="bg-zinc-900/40 rounded-xl overflow-hidden border border-white/5 card-hover cursor-pointer relative group"
            onclick="showDetail('${item.slug}')">
          <div class="relative overflow-hidden aspect-[3/4]">
            <img src="${item.image}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">
            <button onclick="event.stopPropagation(); toggleBookmark('${item.slug}', '${item.title}', '${item.image}')"
              class="absolute top-2 right-2 w-8 h-8 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-amber-500 transition z-20">
              <i class="fa fa-trash text-xs"></i>
            </button>
          </div>
          <div class="p-3 text-center">
            <h3 class="text-xs font-bold truncate group-hover:text-amber-500 transition">${item.title}</h3>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  window.scrollTo(0, 0);
}

/* ---------------- History System ---------------- */

function saveToHistory(slug, title, image, chapterSlug, chapterTitle) {
  let history = JSON.parse(localStorage.getItem('fmc_history') || '[]');
  
  const idx = history.findIndex(h => h.slug === slug);
  const item = {
    slug,
    title,
    image,
    lastChapterSlug: chapterSlug,
    lastChapterTitle: chapterTitle,
    date: new Date().toISOString()
  };
  
  if (idx >= 0) {
    history.splice(idx, 1);
  }
  
  history.unshift(item);
  
  if (history.length > 50) history = history.slice(0, 50);
  
  localStorage.setItem('fmc_history', JSON.stringify(history));
}

function showHistory() {
  resetNavs();
  updateURL('/history');
  
  const history = JSON.parse(localStorage.getItem('fmc_history') || '[]');
  
  if (history.length === 0) {
    contentArea.innerHTML = `
      <div class="text-center py-40 text-gray-500 flex flex-col items-center gap-4">
        <i class="fa fa-history text-4xl opacity-50"></i>
        <p>Belum ada riwayat baca</p>
      </div>`;
    return;
  }

  contentArea.innerHTML = `
    <div class="flex justify-between items-center mb-8">
      <h2 class="text-2xl font-bold border-l-4 border-amber-500 pl-4">Riwayat Baca</h2>
      <button onclick="if(confirm('Hapus semua riwayat?')) { localStorage.removeItem('fmc_history'); showHistory(); }" 
        class="text-xs px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition">
        <i class="fa fa-trash"></i> Hapus Semua
      </button>
    </div>
    <div class="space-y-4">
      ${history.map(item => `
        <div class="flex gap-4 bg-zinc-900/30 p-3 rounded-xl border border-white/5 hover:border-amber-500/30 transition group">
          <img src="${item.image}" onclick="showDetail('${item.slug}')" class="w-20 h-28 rounded-lg object-cover cursor-pointer shadow-lg">
          <div class="flex-1 flex flex-col justify-center min-w-0">
            <h3 onclick="showDetail('${item.slug}')" class="font-bold text-sm mb-1 cursor-pointer hover:text-amber-500 transition truncate">${item.title}</h3>
            <p class="text-xs text-gray-400 mb-2">Terakhir baca: ${item.lastChapterTitle || item.lastChapterSlug}</p>
            <button onclick="readChapter('${item.lastChapterSlug}', '${item.slug}')" 
              class="amber-gradient px-4 py-1.5 rounded-lg text-black text-xs font-bold self-start hover:opacity-90 transition shadow-lg shadow-amber-500/20">
              Lanjut Baca
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  window.scrollTo(0, 0);
}

/* ---------------- Router Logic ---------------- */

async function router() {
  const path = window.location.pathname;
  const parts = path.split('/').filter(p => p);

  if (path === '/' || path === '') {
    showHome(false);
  } else if (path === '/ongoing') {
    showOngoing();
  } else if (path === '/completed') {
    showCompleted();
  } else if (path === '/bookmarks') {
    showBookmarks();
  } else if (path === '/history') {
    showHistory();
  } else if (parts[0] === 'series' && parts[1]) {
    const uuid = parts[1];
    if (parts[2] === 'chapter' && parts[3]) {
      const chapterUuid = parts[3];
      const mapping = await getSlugFromUuid(uuid);
      const chMapping = await getSlugFromUuid(chapterUuid);
      if (mapping && chMapping) {
        readChapter(chMapping.slug, mapping.slug);
      } else {
        redirectTo404();
      }
    } else {
      showDetail(uuid, false);
    }
  } else {
    redirectTo404();
  }
}

window.addEventListener('popstate', router);
window.addEventListener('DOMContentLoaded', router);
