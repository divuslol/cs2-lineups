const canvas = document.getElementById("lineCanvas");
const ctx = canvas.getContext("2d");
const mapContainer = document.querySelector(".map-container");
const wrapper = document.getElementById("transformWrapper");
const minimapImage = document.getElementById("mapImage");

const form = document.getElementById("lineupForm");
const addLineupBtn = document.getElementById("addLineupBtn");
const closeFormBtn = document.getElementById("closeFormBtn");
const setStartBtn = document.getElementById("setStart");
const setEndBtn = document.getElementById("setEnd");
const saveBtn = document.getElementById("saveLineup");
const videoInput = document.getElementById("videoUrlInput");
const imageUpload = document.getElementById("imageUpload");
const grenadeType = document.getElementById("grenadeType");
const mapSelect = document.getElementById("mapSelect");
const filterSelect = document.getElementById("filterType");
const resetZoomBtn = document.getElementById("resetZoomBtn");
const popup = document.getElementById("popup");
const closePopupBtn = document.getElementById("closePopupBtn");

let currentMap = mapSelect.value;
let currentFilter = "all";

let clickMode = null;
let startPos = null;
let endPos = null;

// Zoom & Pan Werte
let scale = 1;
let pos = { x: 0, y: 0 };
let isDragging = false;
let dragStart = { x: 0, y: 0 };

// Initial Setup
function resizeCanvas() {
  canvas.width = minimapImage.clientWidth;
  canvas.height = minimapImage.clientHeight;
}

// ========== Zoom & Pan ==========
function updateTransform() {
  wrapper.style.transform = `translate(${pos.x}px, ${pos.y}px) scale(${scale})`;
  drawAllLines();
}

document.querySelector(".map-outer").addEventListener("wheel", (e) => {
  e.preventDefault();
  const zoomSpeed = 0.1;
  const direction = e.deltaY > 0 ? -1 : 1;
  scale += direction * zoomSpeed;
  scale = Math.min(Math.max(scale, 0.5), 2.5);
  updateTransform();
}, { passive: false });

wrapper.addEventListener("mousedown", (e) => {
  isDragging = true;
  dragStart = { x: e.clientX - pos.x, y: e.clientY - pos.y };
});

window.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  pos.x = e.clientX - dragStart.x;
  pos.y = e.clientY - dragStart.y;
  updateTransform();
});

window.addEventListener("mouseup", () => {
  isDragging = false;
});

resetZoomBtn.addEventListener("click", () => {
  scale = 1;
  pos = { x: 0, y: 0 };
  updateTransform();
});

// ========== Map Wechsel & Filter ==========
mapSelect.addEventListener("change", () => {
  currentMap = mapSelect.value;
  minimapImage.src = `assets/maps/${currentMap}.webp`;
  clearAllLineups();
  loadLineupsFromStorage();
});

filterSelect.addEventListener("change", () => {
  currentFilter = filterSelect.value;
  clearAllLineups();
  loadLineupsFromStorage();
});

// ========== Lineup-Erstellung ==========
addLineupBtn.addEventListener("click", () => {
  form.classList.remove("hidden");
  startPos = null;
  endPos = null;
  clickMode = null;
});

closeFormBtn.addEventListener("click", () => {
  form.classList.add("hidden");
});

setStartBtn.addEventListener("click", () => clickMode = "start");
setEndBtn.addEventListener("click", () => clickMode = "end");

wrapper.addEventListener("click", (e) => {
  if (!clickMode) return;

  const rect = wrapper.getBoundingClientRect();
  const x = (e.clientX - rect.left) / scale;
  const y = (e.clientY - rect.top) / scale;

  if (clickMode === "start") {
    startPos = { x, y };
    createPoint(x, y, "start", grenadeType.value);
  } else if (clickMode === "end") {
    endPos = { x, y };
    createPoint(x, y, "end");
  }

  if (startPos && endPos) {
    drawAllLines();
    drawLine(startPos, endPos);
  }

  clickMode = null;
});

saveBtn.addEventListener("click", () => {
  if (!startPos || !endPos) {
    alert("Bitte Start- und Endpunkt setzen!");
    return;
  }

  const videoURL = videoInput.value;
  const imageFile = imageUpload.files[0];
  const type = grenadeType.value;

  if (!videoURL) {
    alert("Bitte Video-URL eingeben.");
    return;
  }

  const saveLineup = (imageData) => {
    const lineup = {
      start: startPos,
      end: endPos,
      video: videoURL,
      image: imageData || null,
      type,
      mapName: currentMap
    };

    saveLineupToStorage(lineup);
    renderSavedLineup(lineup, getSavedLineups().length - 1);
    drawAllLines();
    form.classList.add("hidden");
  };

  if (imageFile) {
    const reader = new FileReader();
    reader.onload = () => saveLineup(reader.result);
    reader.readAsDataURL(imageFile);
  } else {
    saveLineup(null);
  }
});

// ========== Lineups laden, zeichnen, löschen ==========
function drawLine(start, end) {
  ctx.strokeStyle = "yellow";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
}

function drawAllLines() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const saved = getSavedLineups();
  saved.forEach(lineup => {
    if (lineup.mapName === currentMap && (currentFilter === "all" || lineup.type === currentFilter)) {
      drawLine(lineup.start, lineup.end);
    }
  });
}

function createPoint(x, y, type, gtype = "") {
  const point = document.createElement("div");
  point.classList.add("lineup-point", type);
  if (gtype) point.classList.add(gtype);
  point.style.left = `${x}px`;
  point.style.top = `${y}px`;
  point.dataset.video = videoInput.value;
  point.dataset.image = "";
  point.addEventListener("click", () => showPopup(point));
  wrapper.appendChild(point);
}

function renderSavedLineup(lineup, index) {
    const start = document.createElement("div");
    start.classList.add("lineup-point", "start", lineup.type);
    start.style.left = `${lineup.start.x}px`;
    start.style.top = `${lineup.start.y}px`;
    start.dataset.video = lineup.video;
    start.dataset.image = lineup.image;
    start.dataset.index = index; // ⬅️ neu: index speichern!
  
    const end = document.createElement("div");
    end.classList.add("lineup-point", "end");
    end.style.left = `${lineup.end.x}px`;
    end.style.top = `${lineup.end.y}px`;
  
    start.addEventListener("click", () => showPopup(start));
  
    wrapper.appendChild(start);
    wrapper.appendChild(end);
  }
  

  function showPopup(point) {
    const embedUrl = convertYouTubeUrlToEmbed(point.dataset.video);
    document.getElementById("youtubeFrame").src = embedUrl;
  
    const img = popup.querySelector("img");
    if (point.dataset.image && point.dataset.image !== "null") {
      img.src = point.dataset.image;
      img.style.display = "block";
    } else {
      img.style.display = "none";
    }
  
    // 🔁 Delete-Button vorbereiten
    const oldDelete = popup.querySelector(".popup-delete");
    if (oldDelete) oldDelete.remove();
  
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑️ Lineup löschen";
    deleteBtn.classList.add("popup-delete");
    deleteBtn.style.marginTop = "10px";
    deleteBtn.addEventListener("click", () => {
      const index = parseInt(point.dataset.index);
      if (!isNaN(index) && confirm("Lineup wirklich löschen?")) {
        deleteLineup(index);
        popup.classList.add("hidden");
      }
    });
  
    popup.appendChild(deleteBtn);
    popup.classList.remove("hidden");
  }
  

  closePopupBtn.addEventListener("click", () => {
    popup.classList.add("hidden");
    document.getElementById("youtubeFrame").src = "";
  
    const oldDelete = popup.querySelector(".popup-delete");
    if (oldDelete) oldDelete.remove();
  });
  

function convertYouTubeUrlToEmbed(url) {
  const videoIdMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([^\s&]+)/);
  if (videoIdMatch && videoIdMatch[1]) {
    return `https://www.youtube.com/embed/${videoIdMatch[1]}`;
  }
  return "";
}

function getSavedLineups() {
  return JSON.parse(localStorage.getItem("lineups") || "[]");
}

function saveLineupToStorage(lineup) {
  const saved = getSavedLineups();
  saved.push(lineup);
  localStorage.setItem("lineups", JSON.stringify(saved));
}

function loadLineupsFromStorage() {
  const saved = getSavedLineups();
  saved.forEach((lineup, index) => {
    if (
      lineup.mapName === currentMap &&
      (currentFilter === "all" || lineup.type === currentFilter)
    ) {
      renderSavedLineup(lineup, index);
    }
  });
}

function deleteLineup(index) {
  const saved = getSavedLineups();
  saved.splice(index, 1);
  localStorage.setItem("lineups", JSON.stringify(saved));
  location.reload();
}

function clearAllLineups() {
  wrapper.querySelectorAll(".lineup-point, button").forEach(el => el.remove());
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ========== Init ==========
window.addEventListener("DOMContentLoaded", () => {
  resizeCanvas();
  updateTransform();
  loadLineupsFromStorage();
});
