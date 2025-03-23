const mapSelect = document.getElementById("mapSelect");
const minimapImage = document.querySelector(".minimap");
const filterSelect = document.getElementById("filterType");
const canvas = document.getElementById("lineCanvas");
const ctx = canvas.getContext("2d");
const mapContainer = document.querySelector(".map-container");

canvas.width = mapContainer.clientWidth;
canvas.height = mapContainer.clientHeight;

let currentMap = mapSelect.value;
let currentFilter = "all";
let clickMode = null;
let startPos = null;
let endPos = null;

// Form-Elemente
const form = document.getElementById("lineupForm");
const addLineupBtn = document.getElementById("addLineupBtn");
const setStartBtn = document.getElementById("setStart");
const setEndBtn = document.getElementById("setEnd");
const saveBtn = document.getElementById("saveLineup");
const videoInput = document.getElementById("videoUrlInput");
const imageUpload = document.getElementById("imageUpload");
const grenadeType = document.getElementById("grenadeType");

// Popup
const popup = document.getElementById("popup");
const closeBtn = document.getElementById("closePopupBtn");

// =========================== EVENT HANDLER ===========================

mapSelect.addEventListener("change", () => {
  currentMap = mapSelect.value;
  updateMapImage(currentMap);
  clearAllLineups();
  loadLineupsFromStorage();
  drawAllLines();
});

filterSelect.addEventListener("change", () => {
  currentFilter = filterSelect.value;
  clearAllLineups();
  loadLineupsFromStorage();
  drawAllLines();
});

addLineupBtn.addEventListener("click", () => {
  form.classList.remove("hidden");
  startPos = null;
  endPos = null;
  clickMode = null;
});

setStartBtn.addEventListener("click", () => {
  clickMode = "start";
});

setEndBtn.addEventListener("click", () => {
  clickMode = "end";
});

mapContainer.addEventListener("click", (e) => {
  if (!clickMode) return;

  const rect = mapContainer.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (clickMode === "start") {
    startPos = { x, y };
    createPoint(x, y, "start");
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
      type: type,
      mapName: currentMap,
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

closeBtn.addEventListener("click", () => {
  popup.classList.add("hidden");
  document.getElementById("youtubeFrame").src = "";
});

// =========================== FUNKTIONEN ===========================

function updateMapImage(mapName) {
  minimapImage.src = `assets/maps/${mapName}.webp`;
}

function clearAllLineups() {
  document.querySelectorAll(".lineup-point").forEach((el) => el.remove());
  document.querySelectorAll(".delete-lineup-button").forEach((el) => el.remove());
}

function createPoint(x, y, type) {
  const point = document.createElement("div");
  point.classList.add("lineup-point", type);
  point.style.left = `${x}px`;
  point.style.top = `${y}px`;
  mapContainer.appendChild(point);
}

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
  saved.forEach((lineup) => {
    if (
      lineup.mapName === currentMap &&
      (currentFilter === "all" || lineup.type === currentFilter)
    ) {
      drawLine(lineup.start, lineup.end);
    }
  });
}

function showPopup(point) {
  const videoUrl = point.dataset.video;
  const embedUrl = convertYouTubeUrlToEmbed(videoUrl);
  const iframe = document.getElementById("youtubeFrame");
  iframe.src = embedUrl;

  const imageEl = popup.querySelector("img");
  if (point.dataset.image && point.dataset.image !== "null") {
    imageEl.src = point.dataset.image;
    imageEl.style.display = "block";
  } else {
    imageEl.style.display = "none";
  }

  popup.classList.remove("hidden");
}

function convertYouTubeUrlToEmbed(url) {
  const videoIdMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([^\s&]+)/);
  if (videoIdMatch && videoIdMatch[1]) {
    return `https://www.youtube.com/embed/${videoIdMatch[1]}`;
  }
  return "";
}

function saveLineupToStorage(lineup) {
  const saved = getSavedLineups();
  saved.push(lineup);
  localStorage.setItem("lineups", JSON.stringify(saved));
}

function getSavedLineups() {
  return JSON.parse(localStorage.getItem("lineups") || "[]");
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

function renderSavedLineup(lineup, index) {
  const start = document.createElement("div");
  start.classList.add("lineup-point", "start", lineup.type);
  start.style.left = `${lineup.start.x}px`;
  start.style.top = `${lineup.start.y}px`;

  const end = document.createElement("div");
  end.classList.add("lineup-point", "end");
  end.style.left = `${lineup.end.x}px`;
  end.style.top = `${lineup.end.y}px`;

  start.dataset.video = lineup.video;
  start.dataset.image = lineup.image;

  start.addEventListener("click", () => showPopup(start));

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "🗑️";
  deleteBtn.classList.add("delete-lineup-button");
  deleteBtn.style.position = "absolute";
  deleteBtn.style.left = `${lineup.start.x + 10}px`;
  deleteBtn.style.top = `${lineup.start.y - 10}px`;
  deleteBtn.style.zIndex = "3";
  deleteBtn.style.background = "#900";
  deleteBtn.style.color = "#fff";
  deleteBtn.style.border = "none";
  deleteBtn.style.borderRadius = "4px";
  deleteBtn.style.padding = "2px 4px";
  deleteBtn.style.cursor = "pointer";
  deleteBtn.title = "Lineup löschen";

  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (confirm("Lineup wirklich löschen?")) {
      deleteLineup(index);
    }
  });

  mapContainer.appendChild(start);
  mapContainer.appendChild(end);
  mapContainer.appendChild(deleteBtn);
}

// =========================== INITIALISIERUNG ===========================

window.addEventListener("DOMContentLoaded", () => {
  updateMapImage(currentMap);
  loadLineupsFromStorage();
  drawAllLines();
});

const mapInner = document.getElementById("mapInner");

let scale = 1;
let pos = { x: 0, y: 0 };
let isDragging = false;
let dragStart = { x: 0, y: 0 };

function updateTransform() {
  mapInner.style.transform = `translate(${pos.x}px, ${pos.y}px) scale(${scale})`;
}

document.querySelector(".map-outer").addEventListener("wheel", (e) => {
  e.preventDefault();
  const zoomSpeed = 0.1;
  const direction = e.deltaY > 0 ? -1 : 1;
  scale += direction * zoomSpeed;
  scale = Math.min(Math.max(scale, 0.5), 2.5);
  updateTransform();
}, { passive: false });

mapInner.addEventListener("mousedown", (e) => {
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
