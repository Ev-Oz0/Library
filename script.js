// ====== STATE GLOBAL ======
let allBooks = [];
let currentOpenedBook = null; // buku yang sedang dibuka di modal detail
let currentCategory = "all";

// Elemen Kontainer Utama
const skeletonContainer = document.getElementById("skeleton-container");
const bookListContainer = document.getElementById("book-list");
const bookCountEl = document.getElementById("book-count");

// Fungsi Loading Switch
function setLoading(isLoading) {
  if (isLoading) {
    if (skeletonContainer) skeletonContainer.style.display = "grid";
    if (bookListContainer) bookListContainer.style.display = "none";
  } else {
    if (skeletonContainer) skeletonContainer.style.display = "none";
    if (bookListContainer) bookListContainer.style.display = "grid";
  }
}

/* =========================
   KAMUS TERJEMAHAN PELAJARAN
   ========================= */
const dictionary = {
  "advanced mathematics": "Matematika Lanjutan",
  "basic mathematics": "Matematika Dasar",
  mathematics: "Matematika",
  math: "Matematika",
  "basic physics": "Fisika Dasar",
  physics: "Fisika",
  "organic chemistry": "Kimia Organik",
  "inorganic chemistry": "Kimia Anorganik",
  chemistry: "Kimia",
  biology: "Biologi",
  microbiology: "Mikrobiologi",
  botany: "Botani",
  zoology: "Zoologi",
  "computer science": "Ilmu Komputer",
  programming: "Pemrograman",
  "software engineering": "Rekayasa Perangkat Lunak",
  history: "Sejarah",
  geography: "Geografi",
  economics: "Ekonomi",
  "natural science": "Ilmu Pengetahuan Alam",
  "social science": "Ilmu Pengetahuan Sosial",
  science: "Sains",
  introduction: "Pengantar",
  fundamentals: "Dasar-dasar",
  principles: "Prinsip",
  concepts: "Konsep",
  guide: "Panduan",
  textbook: "Buku Pelajaran",
  workbook: "Buku Latihan",
  volume: "Jilid",
};

function normalize(text) {
  return text
    .replace(/\(.*?\)/g, "")
    .replace(/[_\-]/g, " ")
    .replace(/\/.*/g, "")
    .replace(/volume\s*\d+/gi, "")
    .replace(/\s+ed.*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const dictEntries = Object.entries(dictionary).sort(
  (a, b) => b[0].length - a[0].length,
);

function translateSmart(text) {
  const normalized = normalize(text);
  let result = normalized;
  let lower = normalized.toLowerCase();

  for (const [key, value] of dictEntries) {
    if (lower.includes(key)) {
      const re = new RegExp(key, "gi");
      result = result.replace(re, value);
      lower = result.toLowerCase();
    }
  }
  return result.replace(/\b\w/g, (c) => c.toUpperCase());
}

/* =========================
   LOAD DATA BUKU DARI API
   ========================= */
const subjects = [
  "mathematics",
  "physics",
  "chemistry",
  "biology",
  "computer science",
  "history",
  "geography",
];

async function loadBooks() {
  setLoading(true);
  let result = [];

  try {
    for (const subject of subjects) {
      const url = `https://openlibrary.org/search.json?subject=${subject}&limit=12`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.docs) {
        for (const book of data.docs) {
          if (book.language && !book.language.includes("eng")) continue;

          const rawTitle = book.title || "Unknown Book";
          const rawAuthor = book.author_name
            ? book.author_name[0]
            : "Unknown Author";

          const titleID = translateSmart(rawTitle);
          const authorID = translateSmart(rawAuthor);

          const workKey = book.key || null;
          const subs = book.subject ? book.subject.slice(0, 20) : [];

          // Klasifikasi kategori internal
          let category = "Sains";
          if (subject.includes("math")) category = "Matematika";
          if (subject.includes("history") || subject.includes("geography"))
            category = "Sejarah";

          result.push({
            title: titleID,
            author: authorID,
            year: book.first_publish_year || "Tidak Diketahui",
            cover: book.cover_i
              ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
              : "https://via.placeholder.com/200x300?text=No+Cover",
            workKey,
            subjects: subs,
            category: category,
          });
        }
      }
    }
  } catch (err) {
    console.error("Gagal memuat data buku:", err);
  }

  // Bersihkan duplikat judul buku
  allBooks = result.filter(
    (v, i, a) => a.findIndex((t) => t.title === v.title) === i,
  );

  displayBooks(allBooks);
  activateSearch();
  activateFiltersAndSorting();
  setLoading(false);
}

/* =========================
   TAMPIL GRID BUKU
   ========================= */
function displayBooks(bookData) {
  if (!bookListContainer) return;
  bookListContainer.innerHTML = "";

  if (bookCountEl) {
    bookCountEl.textContent = `Menampilkan ${bookData.length} Buku`;
  }

  if (bookData.length === 0) {
    bookListContainer.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #64748b; padding: 40px; font-weight: 500;">Buku tidak ditemukan di kategori ini.</p>`;
    return;
  }

  bookData.forEach((book) => {
    const card = document.createElement("div");
    card.className = "book-card";

    card.innerHTML = `
      <img class="book-cover" src="${book.cover}" alt="${book.title}" loading="lazy">
      <div class="book-title">${book.title}</div>
      <div class="book-author">Oleh: ${book.author}</div>
      <div class="book-year">Tahun: ${book.year}</div>
    `;

    card.addEventListener("click", () => openBookModal(book));
    bookListContainer.appendChild(card);
  });
}

/* =========================
   MODAL DETAIL BUKU
   ========================= */
const modal = document.getElementById("book-modal");
const modalCover = document.getElementById("modal-cover");
const modalTitle = document.getElementById("modal-title");
const modalAuthor = document.getElementById("modal-author");
const modalYear = document.getElementById("modal-year");
const modalDescription = document.getElementById("modal-description");
const modalSubjects = document.getElementById("modal-subjects");
const modalCloseBtn = document.querySelector(".book-modal-close");

if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeBookModal);
if (modal) {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeBookModal();
  });
}

function closeBookModal() {
  if (modal) modal.classList.remove("is-open");
}

async function openBookModal(book) {
  currentOpenedBook = book;

  if (modalCover) {
    modalCover.src = book.cover;
    modalCover.alt = book.title;
  }
  if (modalTitle) modalTitle.textContent = book.title;
  if (modalAuthor) modalAuthor.textContent = book.author;
  if (modalYear) modalYear.textContent = book.year;

  if (modalDescription) modalDescription.textContent = "Memuat deskripsi...";
  if (modalSubjects) modalSubjects.innerHTML = "";

  if (modal) modal.classList.add("is-open");

  if (!book.workKey) {
    if (modalDescription)
      modalDescription.textContent = "Belum ada deskripsi tambahan.";
    renderSubjects(book.subjects || []);
    return;
  }

  try {
    const res = await fetch(`https://openlibrary.org${book.workKey}.json`);
    const data = await res.json();

    if (data.description) {
      const desc =
        typeof data.description === "string"
          ? data.description
          : data.description.value;
      if (modalDescription) modalDescription.textContent = desc;
    } else {
      if (modalDescription)
        modalDescription.textContent =
          "Belum ada deskripsi resmi untuk buku ini.";
    }

    const subs = data.subjects || book.subjects || [];
    renderSubjects(subs);
  } catch (err) {
    if (modalDescription)
      modalDescription.textContent = "Gagal memuat deskripsi detail.";
    renderSubjects(book.subjects || []);
  }
}

function renderSubjects(subjects) {
  if (!modalSubjects) return;
  modalSubjects.innerHTML = "";

  if (!subjects || subjects.length === 0) {
    const span = document.createElement("span");
    span.className = "modal-tag";
    span.textContent = "Umum";
    modalSubjects.appendChild(span);
    return;
  }

  subjects.slice(0, 5).forEach((subj) => {
    const span = document.createElement("span");
    span.className = "modal-tag";
    span.textContent = subj;
    modalSubjects.appendChild(span);
  });
}

/* =========================
   BOOK READER (FLIP EFFECT)
   ========================= */
const readerModal = document.getElementById("reader-modal");
const readerClose = document.querySelector(".reader-close");
const readerTitle = document.getElementById("reader-title");
const readBookBtn = document.getElementById("read-book-btn");

const pageLeftEl = document.getElementById("page-left");
const pageRightEl = document.getElementById("page-right");
const pageIndicatorEl = document.getElementById("page-indicator");

const bookPageLeft = document.querySelector(".book-page.left");
const bookPageRight = document.querySelector(".book-page.right");
const pagePrevBtn = document.getElementById("page-prev");
const pageNextBtn = document.getElementById("page-next");

const sampleParagraphs = [
  "Pengetahuan adalah cahaya yang menerangi jalan manusia menuju masa depan. Setiap halaman adalah jendela baru menuju wawasan yang lebih luas.",
  "Belajar bukan hanya tentang memahami teori, melainkan tentang menemukan makna dari setiap proses yang dilalui.",
  "Pendidikan menjadi jembatan antara mimpi dan kenyataan. Dengan ilmu, manusia mampu menciptakan perubahan besar.",
  "Setiap buku adalah dunia baru. Siapa pun yang membaca, ia sedang menjelajahi tempat-tempat yang belum pernah ia kunjungi.",
  "Tidak ada batasan untuk ilmu. Semakin kita belajar, semakin kita menyadari betapa luasnya dunia.",
  "Membaca adalah cara sederhana untuk bepergian jauh tanpa berpindah tempat. Dalam diam, imajinasi bekerja dengan sangat hebat.",
];

let pages = [];
let currentSpreadIndex = 0;
let isFlipping = false;

function buildFakeBookPages(book) {
  pages = [];
  pages.push({
    type: "cover",
    cover: book.cover,
    title: book.title,
    author: book.author,
  });

  let fakeText = "";
  for (let i = 0; i < 20; i++) {
    fakeText +=
      sampleParagraphs[Math.floor(Math.random() * sampleParagraphs.length)] +
      "\n\n";
  }

  const rawParas = fakeText.trim().split(/\n\s*\n/);
  let buffer = [];

  rawParas.forEach((p, idx) => {
    buffer.push(p);
    if (buffer.length === 3 || idx === rawParas.length - 1) {
      pages.push({
        type: "text",
        content: buffer.join("\n\n"),
      });
      buffer = [];
    }
  });
}

function renderPage(container, pageData) {
  if (!container) return;
  container.innerHTML = "";
  if (!pageData) return;

  if (pageData.type === "cover") {
    container.innerHTML = `
      <div class="page-cover">
        <img src="${pageData.cover}" alt="${pageData.title}">
        <h3>${pageData.title}</h3>
        <p>Oleh: ${pageData.author}</p>
      </div>
    `;
  } else {
    container.textContent = pageData.content;
  }
}

function renderSpread() {
  if (!pageLeftEl || !pageRightEl) return;

  const totalSpreads = Math.max(1, Math.ceil(pages.length / 2));

  if (currentSpreadIndex < 0) currentSpreadIndex = 0;
  if (currentSpreadIndex > totalSpreads - 1)
    currentSpreadIndex = totalSpreads - 1;

  const leftIndex = currentSpreadIndex * 2;
  const rightIndex = leftIndex + 1;

  renderPage(pageLeftEl, pages[leftIndex] || null);
  renderPage(pageRightEl, pages[rightIndex] || null);

  if (pageIndicatorEl) {
    pageIndicatorEl.textContent = `Halaman ${leftIndex + 1}-${Math.min(rightIndex + 1, pages.length)} dari ${pages.length}`;
  }
}

function goNext() {
  const totalSpreads = Math.max(1, Math.ceil(pages.length / 2));
  if (currentSpreadIndex >= totalSpreads - 1 || isFlipping) return;

  isFlipping = true;
  if (bookPageRight) bookPageRight.classList.add("flip-next");
  if (pageLeftEl) pageLeftEl.classList.add("fade-out");
  if (pageRightEl) pageRightEl.classList.add("fade-out");

  setTimeout(() => {
    currentSpreadIndex += 1;
    renderSpread();
    if (pageLeftEl) pageLeftEl.classList.remove("fade-out");
    if (pageRightEl) pageRightEl.classList.remove("fade-out");
  }, 250);

  setTimeout(() => {
    if (bookPageRight) bookPageRight.classList.remove("flip-next");
    isFlipping = false;
  }, 600);
}

function goPrev() {
  if (currentSpreadIndex <= 0 || isFlipping) return;

  isFlipping = true;
  if (bookPageLeft) bookPageLeft.classList.add("flip-prev");
  if (pageLeftEl) pageLeftEl.classList.add("fade-out");
  if (pageRightEl) pageRightEl.classList.add("fade-out");

  setTimeout(() => {
    currentSpreadIndex -= 1;
    renderSpread();
    if (pageLeftEl) pageLeftEl.classList.remove("fade-out");
    if (pageRightEl) pageRightEl.classList.remove("fade-out");
  }, 250);

  setTimeout(() => {
    if (bookPageLeft) bookPageLeft.classList.remove("flip-prev");
    isFlipping = false;
  }, 600);
}

if (readBookBtn) {
  readBookBtn.addEventListener("click", () => {
    if (!currentOpenedBook || !readerModal) return;
    closeBookModal();
    readerModal.classList.add("is-open");
    if (readerTitle) readerTitle.textContent = currentOpenedBook.title;

    buildFakeBookPages(currentOpenedBook);
    currentSpreadIndex = 0;
    renderSpread();
  });
}

if (readerClose) {
  readerClose.addEventListener("click", () => {
    if (readerModal) readerModal.classList.remove("is-open");
  });
}

if (readerModal) {
  readerModal.addEventListener("click", (e) => {
    if (e.target === readerModal) readerModal.classList.remove("is-open");
  });
}

if (pagePrevBtn) pagePrevBtn.addEventListener("click", goPrev);
if (pageNextBtn) pageNextBtn.addEventListener("click", goNext);

/* DRAG & TOUCH TO FLIP */
let dragStartX = null;
let dragTargetSide = null;

function getClientX(e) {
  if (e.touches && e.touches[0]) return e.touches[0].clientX;
  return e.clientX;
}

function handlePointerDown(e, side) {
  if (isFlipping) return;
  dragStartX = getClientX(e);
  dragTargetSide = side;
}

function handlePointerUp(e) {
  if (dragStartX === null || !dragTargetSide) return;

  const endX = getClientX(e);
  const dx = endX - dragStartX;
  const threshold = 40;

  if (dragTargetSide === "right" && dx < -threshold) goNext();
  else if (dragTargetSide === "left" && dx > threshold) goPrev();

  dragStartX = null;
  dragTargetSide = null;
}

if (bookPageRight)
  bookPageRight.addEventListener("mousedown", (e) =>
    handlePointerDown(e, "right"),
  );
if (bookPageLeft)
  bookPageLeft.addEventListener("mousedown", (e) =>
    handlePointerDown(e, "left"),
  );
window.addEventListener("mouseup", handlePointerUp);

if (bookPageRight)
  bookPageRight.addEventListener("touchstart", (e) =>
    handlePointerDown(e, "right"),
  );
if (bookPageLeft)
  bookPageLeft.addEventListener("touchstart", (e) =>
    handlePointerDown(e, "left"),
  );
window.addEventListener("touchend", handlePointerUp);

/* =========================
   SEARCH & ANIMATED TAB FILTER
   ========================= */
function activateSearch() {
  const input = document.getElementById("search-input");
  const suggestions = document.getElementById("suggestions");

  if (!input) return;

  input.addEventListener("input", () => {
    const key = input.value.toLowerCase();

    let filtered = allBooks.filter((b) => b.title.toLowerCase().includes(key));
    if (currentCategory !== "all") {
      filtered = filtered.filter((b) => b.category === currentCategory);
    }

    displayBooks(filtered);

    if (!suggestions) return;
    suggestions.innerHTML = "";

    if (!key) {
      suggestions.style.display = "none";
      return;
    }

    filtered.slice(0, 8).forEach((book) => {
      const item = document.createElement("div");
      item.className = "suggestion-item";
      item.textContent = book.title;

      item.onclick = () => {
        input.value = book.title;
        suggestions.style.display = "none";
        applyFilterAndSort();
      };
      suggestions.appendChild(item);
    });

    suggestions.style.display = "block";
  });

  document.addEventListener("click", (e) => {
    if (suggestions && !e.target.closest(".search-box")) {
      suggestions.style.display = "none";
    }
  });
}

function activateFiltersAndSorting() {
  const categoryButtons = document.querySelectorAll(
    ".nav-links-desktop li, .nav-links-mobile li",
  );
  const sortSelect = document.getElementById("sort-books");

  categoryButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      categoryButtons.forEach((b) => b.classList.remove("active"));

      // Sinkronisasi class active antara desktop dan mobile tab
      const target = btn.getAttribute("data-target");
      document
        .querySelectorAll(`[data-target="${target}"]`)
        .forEach((b) => b.classList.add("active"));

      currentCategory = target;
      applyFilterAndSort();
    });
  });

  if (sortSelect) {
    sortSelect.addEventListener("change", applyFilterAndSort);
  }
}

// FUNGSI UTAMA TRANSISI DAN ANIMASI PERPINDAHAN TAB
function applyFilterAndSort() {
  if (!bookListContainer) return;

  // 1. Picu efek animasi Keluar (Fade Out) pada kontainer tab list buku saat ini
  bookListContainer.classList.remove("fade-in-card");
  bookListContainer.classList.add("fade-out-card");

  // 2. Berikan delay singkat (250ms) agar animasi fade-out selesai sebelum merender konten tab baru
  setTimeout(() => {
    const searchInput = document.getElementById("search-input");
    const key = searchInput ? searchInput.value.toLowerCase() : "";
    const sortValue = document.getElementById("sort-books")?.value || "default";

    // Filter Kategori Tab
    let data = [...allBooks];
    if (currentCategory !== "all") {
      data = data.filter((b) => b.category === currentCategory);
    }

    // Filter Pencarian
    if (key) {
      data = data.filter((b) => b.title.toLowerCase().includes(key));
    }

    // Sorting
    if (sortValue === "title-az") {
      data.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortValue === "title-za") {
      data.sort((a, b) => b.title.localeCompare(a.title));
    } else if (sortValue === "year-new") {
      data.sort(
        (a, b) =>
          (b.year === "Tidak Diketahui" ? 0 : b.year) -
          (a.year === "Tidak Diketahui" ? 0 : a.year),
      );
    } else if (sortValue === "year-old") {
      data.sort(
        (a, b) =>
          (a.year === "Tidak Diketahui" ? 9999 : a.year) -
          (b.year === "Tidak Diketahui" ? 9999 : b.year),
      );
    }

    // Render data baru ke dalam grid
    displayBooks(data);

    // 3. Picu efek animasi Masuk (Fade & Slide In Up) untuk tab baru
    bookListContainer.classList.remove("fade-out-card");
    bookListContainer.classList.add("fade-in-card");
  }, 250);
}

/* =========================
   NAVBAR & THEME TOGGLE SYSTEM
   ========================= */
const navbar = document.querySelector(".navbar");
const menuToggleButtons = document.querySelectorAll(".menu-toggle");
const navMobileLinks = document.querySelectorAll(".nav-links-mobile li");
const themeToggleBtn = document.getElementById("theme-toggle");

window.addEventListener("scroll", () => {
  if (!navbar) return;
  if (window.scrollY > 10) navbar.classList.add("scrolled");
  else navbar.classList.remove("scrolled");
});

menuToggleButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (navbar) navbar.classList.toggle("nav-open");
  });
});

navMobileLinks.forEach((li) => {
  li.addEventListener("click", () => {
    if (navbar) navbar.classList.remove("nav-open");
  });
});

if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-theme");
    const icon = themeToggleBtn.querySelector("i");
    if (document.body.classList.contains("dark-theme")) {
      if (icon) icon.className = "fas fa-sun";
    } else {
      if (icon) icon.className = "fas fa-moon";
    }
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && navbar) navbar.classList.remove("nav-open");
});

/* ====== BOOTSTRAP INITIAL LOAD ====== */
loadBooks();
