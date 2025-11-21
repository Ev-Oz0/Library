// ====== STATE GLOBAL ======
let allBooks = [];
let currentOpenedBook = null; // buku yang sedang dibuka di modal detail

// elemen loading
const loadingEl = document.getElementById("loading");
function setLoading(isLoading) {
  if (!loadingEl) return;
  loadingEl.style.display = isLoading ? "flex" : "none";
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
  (a, b) => b[0].length - a[0].length
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
      const url = `https://openlibrary.org/search.json?subject=${subject}&limit=20`;
      const response = await fetch(url);
      const data = await response.json();

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

        result.push({
          title: titleID,
          author: authorID,
          year: book.first_publish_year || "Tidak Diketahui",
          cover: book.cover_i
            ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
            : "https://via.placeholder.com/200x300?text=No+Cover",
          workKey,
          subjects: subs,
        });
      }
    }
  } catch (err) {
    console.error("Gagal memuat data buku:", err);
  }

  allBooks = result;
  displayBooks(allBooks);
  activateSearch();

  setLoading(false);
}

/* =========================
   TAMPIL GRID BUKU
   ========================= */

function displayBooks(bookData) {
  const container = document.getElementById("book-list");
  container.innerHTML = "";

  bookData.forEach((book) => {
    const card = document.createElement("div");
    card.className = "book-card";

    card.innerHTML = `
      <img class="book-cover" src="${book.cover}" alt="${book.title}">
      <div class="book-title">${book.title}</div>
      <div class="book-author">Oleh: ${book.author}</div>
      <div class="book-year">Tahun: ${book.year}</div>
    `;

    card.addEventListener("click", () => openBookModal(book));

    container.appendChild(card);
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

if (modalCloseBtn) {
  modalCloseBtn.addEventListener("click", closeBookModal);
}

if (modal) {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeBookModal();
  });
}

function closeBookModal() {
  modal.classList.remove("is-open");
}

async function openBookModal(book) {
  currentOpenedBook = book;

  modalCover.src = book.cover;
  modalCover.alt = book.title;
  modalTitle.textContent = book.title;
  modalAuthor.textContent = `Oleh: ${book.author}`;
  modalYear.textContent = `Tahun: ${book.year}`;

  modalDescription.textContent = "Memuat deskripsi...";
  modalSubjects.innerHTML = "";

  modal.classList.add("is-open");

  if (!book.workKey) {
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

      modalDescription.textContent = desc;
    } else {
      modalDescription.textContent = "Belum ada deskripsi.";
    }

    const subs = data.subjects || book.subjects || [];
    renderSubjects(subs);
  } catch (err) {
    modalDescription.textContent = "Gagal memuat deskripsi.";
    renderSubjects(book.subjects || []);
  }
}

function renderSubjects(subjects) {
  modalSubjects.innerHTML = "";

  if (!subjects || subjects.length === 0) {
    const span = document.createElement("span");
    span.className = "modal-tag";
    span.textContent = "Belum ada subjek.";
    modalSubjects.appendChild(span);
    return;
  }

  subjects.slice(0, 18).forEach((subj) => {
    const span = document.createElement("span");
    span.className = "modal-tag";
    span.textContent = subj;
    modalSubjects.appendChild(span);
  });
}

/* =========================
   BOOK READER (COVER + FLIP DRAG + PANAH)
   ========================= */

const readerModal = document.getElementById("reader-modal");
const readerClose = document.querySelector(".reader-close");
const readerTitle = document.getElementById("reader-title");
const readBookBtn = document.getElementById("read-book-btn");

const pageLeftEl = document.getElementById("page-left");
const pageRightEl = document.getElementById("page-right");
const pageNumberEl = document.getElementById("page-number");
const pageTotalEl = document.getElementById("page-total");
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
  "Setiap bab yang selesai dibaca adalah satu langkah baru menuju pemahaman diri dan dunia di sekitar kita.",
  "Ilmu yang bermanfaat adalah ilmu yang diamalkan. Setiap pengetahuan baru menjadi peluang untuk membawa kebaikan.",
  "Ketekunan dalam belajar akan membuahkan hasil yang mungkin tidak langsung terlihat, namun berdampak besar di masa depan.",
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
  for (let i = 0; i < 60; i++) {
    fakeText +=
      sampleParagraphs[Math.floor(Math.random() * sampleParagraphs.length)] +
      "\n\n";
  }

  const rawParas = fakeText.trim().split(/\n\s*\n/);
  let buffer = [];

  rawParas.forEach((p, idx) => {
    buffer.push(p);
    if (buffer.length === 5 || idx === rawParas.length - 1) {
      pages.push({
        type: "text",
        content: buffer.join("\n\n"),
      });
      buffer = [];
    }
  });

  if (pages.length === 0) {
    pages = [
      {
        type: "text",
        content: "Belum ada konten untuk ditampilkan.",
      },
    ];
  }
}

function renderPage(container, pageData) {
  if (!container) return;

  if (!pageData) {
    container.innerHTML = "";
    return;
  }

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

  const leftPage = pages[leftIndex] || null;
  const rightPage = pages[rightIndex] || null;

  renderPage(pageLeftEl, leftPage);
  renderPage(pageRightEl, rightPage);

  if (pageNumberEl && pageTotalEl) {
    const currentPageNumber = leftIndex + 1;
    const totalPages = pages.length;
    pageNumberEl.textContent = currentPageNumber;
    pageTotalEl.textContent = totalPages;
  }
}

function goNext() {
  const totalSpreads = Math.max(1, Math.ceil(pages.length / 2));
  if (currentSpreadIndex >= totalSpreads - 1 || isFlipping) return;

  isFlipping = true;
  if (bookPageRight) {
    bookPageRight.classList.add("flip-next");
  }

  setTimeout(() => {
    currentSpreadIndex += 1;
    if (bookPageRight) {
      bookPageRight.classList.remove("flip-next");
    }
    renderSpread();
    isFlipping = false;
  }, 700);
}

function goPrev() {
  if (currentSpreadIndex <= 0 || isFlipping) return;

  isFlipping = true;
  if (bookPageLeft) {
    bookPageLeft.classList.add("flip-prev");
  }

  setTimeout(() => {
    currentSpreadIndex -= 1;
    if (bookPageLeft) {
      bookPageLeft.classList.remove("flip-prev");
    }
    renderSpread();
    isFlipping = false;
  }, 700);
}

function openReader() {
  if (!currentOpenedBook || !readerModal) return;

  readerModal.classList.add("is-open");
  readerTitle.textContent = currentOpenedBook.title;

  buildFakeBookPages(currentOpenedBook);
  currentSpreadIndex = 0;
  renderSpread();
}

if (readBookBtn) {
  readBookBtn.addEventListener("click", () => {
    openReader();
  });
}

if (readerClose) {
  readerClose.addEventListener("click", () => {
    readerModal.classList.remove("is-open");
  });
}

if (readerModal) {
  readerModal.addEventListener("click", (e) => {
    if (e.target === readerModal) {
      readerModal.classList.remove("is-open");
    }
  });
}

if (pagePrevBtn) {
  pagePrevBtn.addEventListener("click", () => {
    goPrev();
  });
}

if (pageNextBtn) {
  pageNextBtn.addEventListener("click", () => {
    goNext();
  });
}

/* DRAG UNTUK FLIP */

let dragStartX = null;
let dragTargetSide = null;

function getClientX(e) {
  if (e.touches && e.touches[0]) return e.touches[0].clientX;
  if (e.changedTouches && e.changedTouches[0])
    return e.changedTouches[0].clientX;
  return e.clientX;
}

function handlePointerDown(e, side) {
  if (isFlipping) return;
  dragStartX = getClientX(e);
  dragTargetSide = side;
}

function handlePointerUp(e) {
  if (dragStartX === null || !dragTargetSide) {
    dragStartX = null;
    dragTargetSide = null;
    return;
  }

  const endX = getClientX(e);
  const dx = endX - dragStartX;

  const threshold = 40;

  if (dragTargetSide === "right" && dx < -threshold) {
    goNext();
  } else if (dragTargetSide === "left" && dx > threshold) {
    goPrev();
  }

  dragStartX = null;
  dragTargetSide = null;
}

if (bookPageRight) {
  bookPageRight.addEventListener("mousedown", (e) =>
    handlePointerDown(e, "right")
  );
}
if (bookPageLeft) {
  bookPageLeft.addEventListener("mousedown", (e) =>
    handlePointerDown(e, "left")
  );
}
window.addEventListener("mouseup", handlePointerUp);

if (bookPageRight) {
  bookPageRight.addEventListener("touchstart", (e) =>
    handlePointerDown(e, "right")
  );
}
if (bookPageLeft) {
  bookPageLeft.addEventListener("touchstart", (e) =>
    handlePointerDown(e, "left")
  );
}
window.addEventListener("touchend", handlePointerUp);
window.addEventListener("touchcancel", () => {
  dragStartX = null;
  dragTargetSide = null;
});

/* =========================
   SEARCH + AUTOCOMPLETE
   ========================= */

function activateSearch() {
  const input = document.getElementById("search-input");
  const suggestions = document.getElementById("suggestions");

  if (!input) return;

  input.addEventListener("input", () => {
    const key = input.value.toLowerCase();
    const filtered = allBooks.filter((b) =>
      b.title.toLowerCase().includes(key)
    );

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
        displayBooks(filtered);
      };

      suggestions.appendChild(item);
    });

    suggestions.style.display = "block";
  });

  if (suggestions) {
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".search-box")) {
        suggestions.style.display = "none";
      }
    });
  }
}

/* =========================
   NAVBAR: SCROLL & MOBILE TOGGLE
   ========================= */

const navbar = document.querySelector(".navbar");
const menuToggleButtons = document.querySelectorAll(".menu-toggle");
const navOverlay = document.querySelector(".nav-mobile-overlay");
const navMobileLinks = document.querySelectorAll(".nav-links-mobile li");

window.addEventListener("scroll", () => {
  if (!navbar) return;
  if (window.scrollY > 10) {
    navbar.classList.add("scrolled");
  } else {
    navbar.classList.remove("scrolled");
  }
});

menuToggleButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    navbar.classList.toggle("nav-open");
  });
});

if (navOverlay) {
  navOverlay.addEventListener("click", (e) => {
    if (e.target === navOverlay) {
      navbar.classList.remove("nav-open");
    }
  });
}

navMobileLinks.forEach((li) => {
  li.addEventListener("click", () => {
    navbar.classList.remove("nav-open");
  });
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    navbar.classList.remove("nav-open");
  }
});

/* =========================
   START
   ========================= */

loadBooks();
