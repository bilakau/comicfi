// ====== SETUP API & PROXY BARU ======
const API_PROXY = "https://api-proxy-eight-mu.vercel.app/api/tools/proxy?url=";
const API_BASE = "https://www.sankavollerei.com/comic/komikindo";
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

// Pembersih Text untuk "Komik\n      Nama Judul" menjadi "Nama Judul"
function cleanText(text) {
  if (!text) return "";
  return text.replace(/Komik\s+/ig, '').replace(/\n\s+/g, ' ').trim();
}

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
  contentArea.innerHTML = `<div class="text-center py-40 text-red-500 font-bold"><i class="fa fa-triangle-exclamation text-4xl mb-3"></i><br/>Error 404: Halaman / Komik tidak ditemukan.</div>`;
}

// Custom Fetch API Menyesuaikan Proxy Baru 
async function fetchAPI(url) {
  try {
    const response = await fetch(API_PROXY + encodeURIComponent(url));
    const data = await response.json();
    
    // Mengecek respon JSON Proxy dan mendapatkan content yang asli 
    if (data.success && data.result) {
       return data.result.content || data.result; 
    } else {
       // fallback jk langsung direct API
       return data;
    }
  } catch (e) {
    console.error("Fetch API Gagal: ", e);
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

function lockNav() { isNavigating = true; setProgress(0); }
function unlockNav() { isNavigating = false; }

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

// HomePage -> Load dari komikindo latest terbaru 
async function showHome(push = true) {
  if (push) updateURL('/');
  resetNavs();
  setLoading();

  const data = await fetchAPI(`${API_BASE}/latest/1`);
  if (!data || !data.komikList) { redirectTo404(); return; }

  contentArea.innerHTML = `
    <section class="mb-12 animate-fade-in">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold flex items-center gap-2">
          <i class="fa fa-fire text-amber-500"></i> Populer Hari Ini
        </h2>
      </div>
      <div class="flex overflow-x-auto gap-4 hide-scroll pb-4 -mx-4 px-4 md:mx-0 md:px-0">
        ${(data.komikPopuler || []).slice(0, 10).map(item => `
          <div class="min-w-[150px] md:min-w-[200px] cursor-pointer card-hover relative rounded-2xl overflow-hidden group"
              onclick="showDetail('${item.slug}')">
            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10"></div>
            <span class="absolute top-3 left-3 z-20 bg-amber-500 text-black text-xs font-bold px-2 py-0.5 rounded-full shadow-lg border border-amber-300">#${item.rank || ''}</span>
            <span class="type-badge right-2 left-auto bg-yellow-500/80 !border-yellow-300 text-black"><i class="fa fa-star text-[8px]"></i> ${item.rating || '?'}</span>
            
            <img src="${item.image}" class="h-64 md:h-80 w-full object-cover transform group-hover:scale-110 transition duration-500">
            <div class="absolute bottom-0 left-0 p-3 z-20 w-full">
              <h3 class="text-sm font-bold truncate text-white drop-shadow-md">${cleanText(item.title)}</h3>
              <p class="text-amber-400 text-[10px] font-semibold mt-1"><i class="fa fa-pen-nib"></i> ${item.author || '-'}</p>
            </div>
          </div>
        `).join('')}
      </div>
    </section>

    <div class="grid grid-cols-1 gap-10">
      <div>
        <h2 class="text-xl font-bold mb-6 border-l-4 border-amber-500 pl-4">Update Chapter Terbaru</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          ${(data.komikList || []).map(item => `
            <div class="bg-zinc-900/40 border border-white/5 rounded-xl overflow-hidden cursor-pointer hover:border-amber-500/50 transition group"
                onclick="showDetail('${item.slug}')">
              <div class="relative h-48 md:h-60 overflow-hidden">
                <span class="type-badge ${getTypeClass(item.type)}">${item.type || 'Kmk'}</span>
                <span class="absolute right-2 top-2 z-20 text-[9px] bg-white/10 text-white backdrop-blur-sm px-2 py-0.5 rounded">${item.color || ''}</span>
                <img src="${item.image}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition duration-300"></div>
              </div>
              <div class="p-3">
                <h3 class="text-xs font-bold line-clamp-2 h-8 leading-relaxed">${cleanText(item.title)}</h3>
                <div class="flex justify-between items-center mt-3">
                  <span class="text-[10px] text-amber-500 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">${item.chapters?.[0]?.title || 'BACA'}</span>
                  <span class="text-[9px] text-gray-500"><i class="fa fa-clock"></i> ${item.chapters?.[0]?.date?.replace(' lalu', '') || ''}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  window.scrollTo(0, 0);
}

// Untuk ongoing kita akali menggunkaan data library bawaan
async function showOngoing(page = 1) {
  updateURL('/ongoing'); resetNavs(); setLoading();
  const data = await fetchAPI(`${API_BASE}/library?page=${page}`);
  renderGrid(data, "Komik Daftar Library Terbaru", "showOngoing");
}

async function showCompleted(page = 1) {
  updateURL('/completed'); resetNavs(); setLoading();
  // Untuk di komikindo karena tidak ada param komplit direct kita jadikan library base page random
  const data = await fetchAPI(`${API_BASE}/library?page=${page + 5}`);
  renderGrid(data, "Daftar Lainya", "showCompleted");
}

async function applyAdvancedFilter() {
  const query = document.getElementById('search-input').value;
  filterPanel.classList.add('hidden');
  setLoading();

  if (query) {
    const data = await fetchAPI(`${API_BASE}/search/${encodeURIComponent(query)}/1`);
    renderGrid(data, `Hasil Pencarian: "${query}"`, null);
  } else {
    // Tampil lib standard jika pencarian kosong
    const data = await fetchAPI(`${API_BASE}/library?page=1`);
    renderGrid(data, "Semua Komik (Library)", "showOngoing");
  }
}

// Global render fungsi 
function renderGrid(data, title, funcName, extraArg = null) {
  const list = data?.komikList || data?.data || [];
  
  if (list.length === 0) {
    contentArea.innerHTML = `
      <div class="text-center py-40 text-gray-500 flex flex-col items-center gap-4">
        <i class="fa fa-folder-open text-4xl opacity-50"></i>
        <p>Maaf, komik tidak ditemukan.</p>
        <button onclick="showHome()" class="mt-4 bg-amber-500 text-black px-4 py-2 font-bold text-xs rounded shadow">Ke Halaman Utama</button>
      </div>`;
    return;
  }

  let paginationHTML = '';
  if (data.pagination && funcName) {
    const current = Number(data.pagination.currentPage);
    const argStr = extraArg ? `'${extraArg}', ` : '';
    
    paginationHTML = `
      <div class="mt-14 flex justify-center items-center gap-4">
        ${current > 1 ? `<button onclick="${funcName}(${argStr}${current - 1})" class="glass px-5 py-2 rounded-lg text-xs font-bold hover:bg-amber-500 hover:text-black transition"><i class="fa fa-chevron-left"></i> Prev</button>` : ''}
        <span class="bg-amber-500 text-black px-4 py-2 rounded-lg text-xs font-extrabold shadow-lg shadow-amber-500/20">${current}</span>
        ${data.pagination.hasNextPage ? `<button onclick="${funcName}(${argStr}${current + 1})" class="glass px-5 py-2 rounded-lg text-xs font-bold hover:bg-amber-500 hover:text-black transition">Next <i class="fa fa-chevron-right"></i></button>` : ''}
      </div>
    `;
  }

  contentArea.innerHTML = `
    <h2 class="text-2xl font-bold mb-8 border-l-4 border-amber-500 pl-4">${title}</h2>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
      ${list.map(item => `
        <div class="bg-zinc-900/40 rounded-xl overflow-hidden border border-white/5 card-hover cursor-pointer relative group"
            onclick="showDetail('${item.slug}')">
          <span class="type-badge ${getTypeClass(item.type)}">${item.type || 'Comic'}</span>
          <div class="relative overflow-hidden aspect-[3/4]">
            <img src="${item.image}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition duration-300"></div>
          </div>
          <div class="p-3 text-center">
            <h3 class="text-xs font-bold truncate group-hover:text-amber-500 transition">${cleanText(item.title)}</h3>
            <p class="text-[10px] text-amber-500 mt-1 font-medium">${item.rating ? `<i class="fa fa-star text-[9px]"></i> ${item.rating}` : (item.chapters?.[0]?.title || 'Baca Sekarang')}</p>
          </div>
        </div>
      `).join('')}
    </div>
    ${paginationHTML}
  `;
  window.scrollTo(0, 0);
}

/* ---------------- Detail Page Logic ---------------- */

async function showDetail(idOrSlug, push = true) {
  let slug = idOrSlug;
  setLoading();

  // Pengembalian mapping Backend MongoDB uuid <=> slug
  if (idOrSlug.length === 36) {
    const mapping = await getSlugFromUuid(idOrSlug);
    if (mapping) slug = mapping.slug;
  }
  if (push) {
    const uuid = await getUuidFromSlug(slug, 'series');
    updateURL(`/series/${uuid}`);
  }

  resetNavs();
  
  // Ambil Data di endpoint yang benar sesuai komikindo
  const responJSON = await fetchAPI(`${API_BASE}/detail/${slug}`);
  
  if (!responJSON || !responJSON.data) { redirectTo404(); return; }

  const res = responJSON.data;
  
  // Mengikuti Struktur Baru
  currentChapterList = res.chapters || [];
  
  const realTitle = cleanText(res.title);
  currentComicContext = { slug, title: realTitle, image: res.image };

  const history = JSON.parse(localStorage.getItem('fmc_history') || '[]');
  const savedItem = history.find(h => h.slug === slug);
  const lastCh = savedItem ? savedItem.lastChapterSlug : null;
  
  // chapter list biasa dari paling baru ke lama, jasi chapter #1 (Awal) di bawah (index ke 0 dari method firstChapter komikindo)
  let firstCh = res.firstChapter ? res.firstChapter.slug : null;
  if (!firstCh && res.chapters?.length > 0) {
      firstCh = res.chapters[res.chapters.length - 1].slug; // index terakhir adalah awal (berdasarkan response asc)
  }

  const startBtnText = lastCh ? "Lanjut Baca" : "Mulai Dari Awal";
  const startBtnAction = lastCh
    ? `readChapter('${lastCh}', '${slug}')`
    : (firstCh ? `readChapter('${firstCh}', '${slug}')` : "alert('Chapter belum tersedia/loading.')");

  const backdropHTML = `
    <div class="fixed top-0 left-0 w-full h-[60vh] -z-10 pointer-events-none overflow-hidden">
      <img src="${res.image}" class="w-full h-full object-cover blur-3xl opacity-20 backdrop-banner animate-pulse-slow">
      <div class="absolute inset-0 bg-gradient-to-b from-[#0b0b0f]/20 via-[#0b0b0f]/80 to-[#0b0b0f]"></div>
    </div>
  `;

  const synopsisText = res.description || "Sinopsis belum ditambahkan/tersedia.";
  const isLongSynopsis = synopsisText.length > 250;

  contentArea.innerHTML = `
    ${backdropHTML}
    <div class="relative z-10 flex flex-col md:flex-row gap-8 lg:gap-12 mt-4 animate-fade-in">
      
      <!-- Panel Gambar Sebelah Kiri -->
      <div class="md:w-[280px] flex-shrink-0 mx-auto md:mx-0 w-full max-w-[280px]">
        <div class="relative group">
          <span class="type-badge ${getTypeClass(res.detail?.type)} scale-110 top-4 left-4 shadow-lg bg-black/70 backdrop-blur border-amber-500 text-amber-500 px-3 py-1 font-bold">${res.detail?.type || 'COMIC'}</span>
          <img src="${res.image}" class="w-full rounded-2xl shadow-2xl border border-white/10 group-hover:border-amber-500/30 transition duration-500 object-cover min-h-[380px]">
        </div>

        <div class="flex flex-col gap-3 mt-6">
          <button onclick="${startBtnAction}" class="amber-gradient w-full py-3.5 rounded-xl font-bold text-black flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition shadow-lg shadow-amber-500/20">
            <i class="fa fa-book-open"></i> ${startBtnText}
          </button>
          <button onclick="toggleBookmark('${slug}', '${realTitle.replace(/'/g, "")}', '${res.image}')" id="btn-bookmark"
            class="w-full py-3.5 rounded-xl glass font-semibold border-white/10 hover:bg-white/10 transition flex items-center justify-center gap-2">
            <i class="fa fa-bookmark"></i> Simpan Pustaka
          </button>
        </div>
      </div>

      <!-- Info Sebelah Kanan -->
      <div class="flex-1 min-w-0">
        <h1 class="text-3xl md:text-5xl font-extrabold mb-3 leading-tight text-white">${realTitle}</h1>
        <div class="text-xs text-amber-500 mb-6 font-medium bg-amber-500/10 inline-block px-3 py-1 border border-amber-500/30 rounded-lg">
           <i class="fa fa-pen-nib"></i> Oleh: <span class="text-white">${res.detail?.author || '?'}</span>
        </div>

        <div class="flex flex-wrap gap-3 mb-6">
          <div class="glass px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold text-amber-400 shadow">
            <i class="fa fa-star text-base"></i> ${res.rating || '-'} 
            <span class="font-normal text-[10px] text-gray-500">(${res.votes || ''})</span>
          </div>
          <div class="glass px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold text-green-400 border border-green-500/10">
            <i class="fa fa-fire-flame-curved text-sm"></i> ${res.detail?.status || 'B/S'}
          </div>
        </div>

        <!-- Render genre Komikindo structure name/slug  -->
        <div class="flex flex-wrap gap-2 mb-6">
          ${(res.genres || []).map(g => `
            <span class="cursor-pointer text-gray-300 text-xs px-3 py-1.5 rounded-full border border-white/10 hover:border-amber-500/80 bg-black/40 hover:bg-amber-500/20 hover:text-white transition">
              ${g.name || g.title}
            </span>`).join('')}
        </div>

        <div class="bg-black/30 rounded-2xl p-5 md:p-6 mb-8 border border-white/5 backdrop-blur-md">
          <h3 class="font-bold text-sm mb-3 flex gap-2 items-center text-amber-500 tracking-wide uppercase">
            <i class="fa fa-info-circle text-lg"></i> Sinopsis 
          </h3>
          <p id="synopsis-text" class="text-gray-300 text-[13px] leading-relaxed text-justify ${isLongSynopsis ? 'line-clamp-4' : ''} transition-all duration-300 font-normal">
            ${synopsisText}
          </p>
          ${isLongSynopsis ? `
            <button onclick="toggleSynopsis()" id="synopsis-btn" class="text-amber-500 mt-3 text-xs font-bold hover:text-white transition flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded">
              Baca Selengkapnya <i class="fa fa-chevron-down"></i>
            </button>` : ''}
        </div>

        <div class="glass rounded-2xl border border-white/10 overflow-hidden shadow-2xl relative">
          <div class="p-5 border-b border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 bg-zinc-900/50">
            <h3 class="font-bold text-lg flex items-center gap-3">
              <i class="fa fa-list-ul text-amber-500"></i> Chapters
              <span class="bg-amber-500 text-black text-[10px] font-bold px-2 py-0.5 rounded shadow">${res.chapters?.length || 0} Update</span>
            </h3>
            <div class="relative w-full sm:w-auto group">
              <i class="fa fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs transition"></i>
              <input type="text" id="chapter-search" onkeyup="filterChapters()" placeholder="Cari chapter misal: 25.."
                class="w-full sm:w-48 bg-black/40 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-amber-500 focus:w-64 transition-all duration-300 text-white placeholder:text-gray-600">
            </div>
          </div>
          <!-- Loop Daftar disini -->
          <div id="chapter-list-container" class="max-h-[500px] overflow-y-auto chapter-list-scroll p-3 bg-black/20 space-y-1"></div>
        </div>
      </div>
    </div>
  `;

  renderChapterList(res.chapters || [], slug);
  checkBookmarkStatus(slug);
  saveHistory(slug, realTitle, res.image);
  window.scrollTo(0, 0);
}

function toggleSynopsis() {
  const txt = document.getElementById('synopsis-text');
  const btn = document.getElementById('synopsis-btn');
  if (!txt || !btn) return;

  if (txt.classList.contains('line-clamp-4')) {
    txt.classList.remove('line-clamp-4');
    btn.innerHTML = `Sembunyikan <i class="fa fa-chevron-up"></i>`;
  } else {
    txt.classList.add('line-clamp-4');
    btn.innerHTML = `Baca Selengkapnya <i class="fa fa-chevron-down"></i>`;
  }
}

function renderChapterList(chapters, comicSlug) {
  const container = document.getElementById('chapter-list-container');
  const history = JSON.parse(localStorage.getItem('fmc_history') || '[]');
  const comicHistory = history.find(h => h.slug === comicSlug);
  const lastReadSlug = comicHistory ? comicHistory.lastChapterSlug : '';

  if (!chapters || chapters.length === 0) {
    container.innerHTML = '<div class="p-8 text-center text-gray-500 text-sm font-semibold">Saat ini Belum ada data Chapter</div>';
    return;
  }

  container.innerHTML = chapters.map(ch => {
    const isLastRead = ch.slug === lastReadSlug;
    return `
      <div onclick="safeReadChapter('${ch.slug}', '${comicSlug}')"
        class="chapter-item group flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all duration-200
        ${isLastRead ? 'bg-amber-500/20 border border-amber-500/50 shadow-inner' : 'bg-zinc-800/30 border border-transparent hover:bg-white/5 hover:border-amber-500/20'}">

        <div class="flex items-center gap-3 overflow-hidden">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm
             ${isLastRead ? 'bg-amber-500 text-black' : 'bg-black/40 text-gray-400 group-hover:text-amber-500'}">
            <i class="fa ${isLastRead ? 'fa-play' : 'fa-bolt'} text-[10px]"></i>
          </div>
          <div class="flex flex-col truncate">
             <span class="text-[13px] font-bold truncate group-hover:text-amber-500 transition ${isLastRead ? 'text-amber-400' : 'text-gray-200'}">
              ${cleanText(ch.title)}
             </span>
             ${ch.releaseTime ? `<span class="text-[9px] text-gray-500 mt-0.5"><i class="fa fa-clock"></i> ${ch.releaseTime}</span>` : ''}
          </div>
        </div>

        <div class="text-[9px] text-gray-500 px-3 py-1.5 rounded-md uppercase tracking-wider group-hover:bg-amber-500 group-hover:text-black transition font-bold shrink-0">
          Mulai Baca
        </div>
      </div>
    `;
  }).join('');
}

function safeReadChapter(chSlug, comicSlug) {
  if (isNavigating) return;
  readChapter(chSlug, comicSlug, true);
}

function filterChapters() {
  const input = document.getElementById('chapter-search');
  const filter = (input?.value || '').toLowerCase();
  const container = document.getElementById('chapter-list-container');
  const items = container.getElementsByClassName('chapter-item');

  for (let i = 0; i < items.length; i++) {
    const span = items[i].getElementsByTagName("span")[0]; // the title span
    const txtValue = span.textContent || span.innerText;
    items[i].style.display = txtValue.toLowerCase().indexOf(filter) > -1 ? "flex" : "none";
  }
}

/* ---------------- Reader Mode Component ---------------- */

async function readChapter(chIdOrSlug, comicSlug = null, push = true) {
  if (isNavigating) return;
  lockNav();
  setLoading();

  try {
    let chSlug = chIdOrSlug;
    if (chIdOrSlug.length === 36) {
      const mapping = await getSlugFromUuid(chIdOrSlug);
      if (mapping) chSlug = mapping.slug;
    }

    if (push) {
      const uuid = await getUuidFromSlug(chSlug, 'chapter');
      updateURL(`/chapter/${uuid}`);
    }

    // Hilangkan menu dasar ketika mulai membaca
    mainNav.classList.add('-translate-y-full');
    mobileNav.classList.add('translate-y-full');

    // Mendapat url endpoint yg bnr untuk Detail Chapter nya.
    const resAPI = await fetchAPI(`${API_BASE}/chapter/${chSlug}`);
    if (!resAPI || !resAPI.data) { redirectTo404(); return; }

    const res = resAPI.data;
    
    // komikindo memberikan properti super detail dari json response baca .allChapterSlug sbagai identiti comic awal.
    const finalComicSlug = comicSlug || res.allChapterSlug; 
    
    // Beri info nama dari cache var, atau properti komik info
    const comicTitle = currentComicContext?.title || (res.komikInfo ? res.komikInfo.title : "FmcComic Mode Baca");
    const chapterCleanStr = cleanText(res.title); 

    const backAction = finalComicSlug ? `showDetail('${finalComicSlug}')` : `showHome()`;

    // Dropdown Logic Switch Chap dari Response komikinfo chapter jika var glbl null (untuk memuat saat reload link chap doang direct mode)
    let dynamicChapterArray = currentChapterList && currentChapterList.length > 0 ? currentChapterList : (res.komikInfo?.chapters || []);
    let dropdownHTML = generateDropdownHTML(dynamicChapterArray, chSlug, finalComicSlug);

    contentArea.innerHTML = `
      <div class="relative min-h-screen bg-[#08080a] -mx-4 -mt-24 selection:bg-amber-500/40">

        <!-- HEADER BAWAAN / NAVBAR RNDER  -->
        <div id="reader-top" class="reader-ui fixed top-0 w-full bg-[#08080a]/90 backdrop-blur-xl border-b border-white/5 z-[60] p-3 flex justify-between items-center transition-transform duration-300">
          <div class="flex items-center gap-3 w-full pr-3 overflow-hidden">
            <button onclick="${backAction}" class="min-w-[40px] w-10 h-10 flex items-center justify-center bg-white/5 rounded-full hover:bg-amber-500 hover:text-black transition text-gray-300 shrink-0 shadow">
              <i class="fa fa-chevron-left text-sm"></i>
            </button>
            <div class="flex flex-col flex-1 truncate pr-3 cursor-default">
              <span class="text-[9px] text-amber-500/80 font-black tracking-[0.2em] uppercase leading-none drop-shadow"><i class="fa fa-book-reader mr-1"></i> Sedang Membaca</span>
              <h2 class="text-xs md:text-sm font-bold text-gray-100 truncate mt-1 tracking-tight shadow-sm drop-shadow-md">
                 ${comicTitle.replace(/Komikindo|Komik Indo/gi, '').trim()} • <span class="text-amber-400 ml-1 font-semibold">${chapterCleanStr.replace(comicTitle.replace(/Komikindo/gi, '').trim(), '')}</span>
              </h2>
            </div>
          </div>
          <button onclick="toggleFullScreen()" class="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full hover:text-amber-500 hover:bg-amber-500/10 transition text-gray-400 shrink-0">
             <i class="fa fa-expand"></i>
          </button>
        </div>

        <!-- LOAD IMAGE -> TAP CLOSE / Buka OPSI -->
        <div id="reader-images" class="flex flex-col items-center pt-14 pb-14 min-h-screen w-full max-w-4xl mx-auto cursor-pointer" onclick="toggleReaderUI()">
        </div>

        <!-- FOTTER NEXT REV -->
        <div id="reader-bottom" class="reader-ui fixed bottom-4 md:bottom-8 left-0 w-full z-[60] px-4 flex justify-center transition-transform duration-300 pb-safe">
          <div class="glass py-2 px-3 rounded-2xl flex gap-3 items-center shadow-2xl shadow-black border border-white/10 bg-black/95 backdrop-blur-3xl min-w-[280px] md:min-w-[400px] justify-between">
            <button id="btn-prev"
              onclick="${res.navigation?.prev ? `readChapter('${res.navigation.prev}', '${finalComicSlug}')` : ''}"
              class="flex flex-col w-12 h-10 justify-center items-center rounded-xl bg-zinc-800 ${!res.navigation?.prev ? 'opacity-30 cursor-not-allowed text-gray-600' : 'hover:bg-white hover:text-black transition text-gray-200'} border border-white/5 shrink-0">
              <i class="fa fa-backward-step text-[10px] mb-0.5"></i> <span class="text-[8px] font-bold uppercase leading-none">Kiri</span>
            </button>

            <div id="chapter-dropdown-container" class="flex-1 min-w-[130px] w-full max-w-sm flex items-center h-full">
              ${dropdownHTML}
            </div>

            <button id="btn-next"
              onclick="${res.navigation?.next ? `readChapter('${res.navigation.next}', '${finalComicSlug}')` : ''}"
              class="flex flex-col w-12 h-10 justify-center items-center rounded-xl amber-gradient ${!res.navigation?.next ? 'opacity-30 cursor-not-allowed !text-black shadow-none border-0' : 'text-black shadow-[0_4px_15px_-3px_rgba(245,158,11,0.5)] active:scale-95 transition-all duration-300'} font-bold shrink-0">
               <i class="fa fa-forward-step text-[10px] mb-0.5"></i><span class="text-[8px] font-black uppercase leading-none tracking-tight">Kanan</span>
            </button>
          </div>
        </div>
      </div>
    `;

    const imageContainer = document.getElementById('reader-images');
    // Get properti data struktur : komik indo menyajikan array obj [ {url: ".."}, ..]
    const imgs = res.images?.map(obj => obj.url) || [];

    setProgress(5);

    let loadedCount = 0;
    const total = Math.max(1, imgs.length);

    // Mencegah memory crash kita inject 1 demi 1 object js 
    imgs.forEach((imgUrl, index) => {
      const wrapper = document.createElement('div');
      wrapper.className = "w-full relative bg-[#111111]";
      
      const imgInfo = document.createElement('div');
      imgInfo.className = "absolute left-2 top-2 z-30 bg-black/80 text-[8px] text-gray-500 font-bold px-2 rounded opacity-30 select-none shadow pointer-events-none";
      imgInfo.innerText = `${index + 1}/${total}`;

      const skeleton = document.createElement('div');
      skeleton.className = "skeleton absolute inset-0 w-full h-[80vh] z-10 min-h-[500px]";

      const img = new Image();
      // Bypass Anti HOTLINK MENGGUNAKAN proxy baru juga terhadap setiap gambar API KOMIK INDO !!!  <== PENTING (klo tdk load maka terdeteksi cloudflare).  
      img.src = `${API_PROXY}${encodeURIComponent(imgUrl)}`; 
      img.className = "comic-page opacity-0 transition-opacity duration-[800ms] relative z-20 m-auto md:w-[700px] bg-black border-y border-white/5";
      img.loading = "lazy";
      img.alt = `Pages-${index + 1}`;

      img.onload = () => {
        loadedCount++;
        skeleton.remove();
        img.classList.remove('opacity-0');
        wrapper.style.minHeight = "auto";
        wrapper.style.backgroundColor = "transparent";
        setProgress(5 + (loadedCount / total) * 95);
      };

      img.onerror = () => {
        loadedCount++;
        skeleton.remove();
        // btn refreh try link direct in some devices hotlinking will permitted natively depending on cors polc:
        wrapper.innerHTML = `
          <div class="flex flex-col items-center justify-center h-48 bg-[#0a0a0d] text-gray-400 gap-3 border border-red-900/10">
            <i class="fa fa-broken text-red-600/50 text-3xl"></i>
            <span class="text-[10px] uppercase font-bold text-red-500/50">Halaman (${index+1}) Gagal Terhubung ke Sumber..</span>
             <button onclick="this.parentElement.parentElement.querySelector('img').src='${imgUrl}'" class="text-[10px] border border-amber-500/50 text-amber-500 bg-amber-500/10 px-4 py-1.5 rounded-full hover:bg-amber-500/20 active:scale-90 font-bold shadow"><i class="fa fa-refresh mr-1"></i> Force Bypass direct Image Source</button>
          </div>
        `;
        wrapper.appendChild(img);
        img.classList.remove('opacity-0');
        setProgress(5 + (loadedCount / total) * 95);
      };

      wrapper.appendChild(skeleton);
      wrapper.appendChild(imgInfo);
      wrapper.appendChild(img);
      imageContainer.appendChild(wrapper);
    });

    if (finalComicSlug) {
      // Simpan proper history riwayat pengguna saat itu jg 
      saveHistory(finalComicSlug, currentComicContext?.title || res.komikInfo?.title, currentComicContext?.image || res.thumbnail?.url, chSlug, chapterCleanStr);
    }
    
    // Fall back komikcontext image dll update memory  state
    currentComicContext.image = currentComicContext.image || res.thumbnail?.url || 'assets/icon.png';
    currentComicContext.title = currentComicContext.title || res.komikInfo?.title || 'Baca Komik Indo';
     
    setProgress(100);
    setTimeout(() => { setProgress(0); bindReaderProgress(); }, 1000); // hilangkan warna progses trhds
    window.scrollTo(0, 0);
  } catch(fatalError){
     console.error("Kesalahan render / Reader API Terhenti:", fatalError);
     unlockNav();
  } finally {
    unlockNav();
  }
}

// Fitur Nav Select Options Option Array Chapters JSON. 
function generateDropdownHTML(list, currentSlug, comicSlug) {
  if (!list || list.length === 0) { return `<div class="text-[10px] w-full text-center text-white p-2">Selesai</div>`; }
  return `
    <div class="relative group w-full px-2 flex-1">
      <div class="absolute inset-y-0 left-4 flex items-center pointer-events-none z-10"><i class="fa fa-hashtag text-[9px] text-amber-400 opacity-60"></i></div>
      <select onchange="safeReadChapter(this.value, '${comicSlug || ''}')"
        class="w-full appearance-none bg-black text-gray-200 border border-white/10 rounded-xl text-xs font-semibold py-2.5 pl-8 pr-10 focus:outline-none focus:border-amber-500 cursor-pointer hover:bg-zinc-800 transition truncate shadow-inner">
        ${list.map(ch => `<option class="bg-[#111] text-xs font-medium border-none rounded-none py-1" value="${ch.slug}" ${ch.slug === currentSlug ? 'selected' : ''}>${cleanText(ch.title)}</option>`).join('')}
      </select>
      <i class="fa fa-chevron-up absolute right-5 top-1/2 -translate-y-1/2 text-[10px] pointer-events-none text-gray-500 font-light group-hover:text-amber-500 transition-colors duration-200"></i>
    </div>
  `;
}


// Event saat sentuh halaman layar mode manga/membaca disamping area maka toolbar navbar hidden/ muncul (immersion)
function toggleReaderUI() {
  const top = document.getElementById('reader-top');
  const bottom = document.getElementById('reader-bottom');
  if (!top || !bottom) return;
  top.classList.toggle('ui-hidden-top');
  bottom.classList.toggle('ui-hidden-bottom');
}

/* ---------------- History & Bookmarks Client Side Cache  ---------------- */

function handleSearch(e) { if (e.key === 'Enter') applyAdvancedFilter(); }

function saveHistory(slug, title, image, chSlug, chTitle) {
  let history = JSON.parse(localStorage.getItem('fmc_history') || '[]');
  let existing = history.find(h => h.slug === slug);

  const data = {
    slug,
    title: title || existing?.title || 'Unknown Title',
    image: image || existing?.image || 'assets/icon.png',
    lastChapterSlug: chSlug || existing?.lastChapterSlug,
    lastChapterTitle: chTitle || existing?.lastChapterTitle || 'Belum Di Baca/Start..',
    timestamp: new Date().getTime()
  };

  history = history.filter(h => h.slug !== slug);
  history.unshift(data);
  if (history.length > 50) history.pop(); // memori maks  kiri komik agar ringan lokal user max= 50 komik riw.
  localStorage.setItem('fmc_history', JSON.stringify(history));
}

function showHistory() {
  updateURL('/history'); resetNavs();
  let history = JSON.parse(localStorage.getItem('fmc_history') || '[]');
  // mock the same property pattern expected 
  renderGrid({ komikList: history }, "Aktivitas Terakhirmu Di Aplikasi", null);
}

function toggleBookmark(slug, title, image) {
  let bookmarks = JSON.parse(localStorage.getItem('fmc_bookmarks') || '[]');
  const idx = bookmarks.findIndex(b => b.slug === slug);
  if (idx > -1) bookmarks.splice(idx, 1);
  else bookmarks.push({ slug, title, image, type: 'My Collections' });
  localStorage.setItem('fmc_bookmarks', JSON.stringify(bookmarks));
  checkBookmarkStatus(slug);
}

function checkBookmarkStatus(slug) {
  let bookmarks = JSON.parse(localStorage.getItem('fmc_bookmarks') || '[]');
  const btn = document.getElementById('btn-bookmark');
  if (!btn) return;

  if (bookmarks.some(b => b.slug === slug)) {
    btn.innerHTML = `<i class="fa fa-check text-green-400"></i> Tersimpan (Pustaka)`;
    btn.classList.add('border-green-500/30', 'bg-green-500/10', 'text-green-100');
    btn.classList.remove('glass');
  } else {
    btn.innerHTML = `<i class="fa fa-bookmark"></i> Simpan Pustaka`;
    btn.classList.remove('border-green-500/30', 'bg-green-500/10', 'text-green-100');
    btn.classList.add('glass');
  }
}

function showBookmarks() {
  updateURL('/bookmarks'); resetNavs();
  let bookmarks = JSON.parse(localStorage.getItem('fmc_bookmarks') || '[]');
  renderGrid({ komikList: bookmarks }, "Disimpan Dan Dimarkahi (*)", null);
}


/* ---------------- Init System Startup  ---------------- */
// Hapus fitur Load Genre Native / drop down agar ui lbh enteng karena struktur genre komik indo rumit ,
// atau gunakan ini sbng default manual:  kini dropdown di matikan dari start diganti sistem advanced filter library default search (langsung gass)  
async function handleInitialLoad() {
  const path = window.location.pathname;
  resetNavs();

  if (path === '/404.html') return;

  if (path.startsWith('/series/')) {
    const uuid = path.split('/')[2];
    if (uuid) showDetail(uuid, false);
    else showHome(false);
  }
  else if (path.startsWith('/chapter/')) {
    const uuid = path.split('/')[2];
    if (uuid) readChapter(uuid, null, false);
    else showHome(false);
  }
  else if (path === '/ongoing') showOngoing(1);
  else if (path === '/completed') showCompleted(1);
  else if (path === '/history') showHistory();
  else if (path === '/bookmarks') showBookmarks();
  else showHome(false);
}

window.addEventListener('popstate', () => handleInitialLoad());

document.addEventListener('DOMContentLoaded', () => {
   console.log('FmcComic Framework Terinisialisasi v2.5 by KomikIndo RestAPI');
   handleInitialLoad();
});

// ==== END ====
