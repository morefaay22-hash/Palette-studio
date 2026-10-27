const INITIAL_COLORS = ["#6558E8", "#F4A261", "#68B6A1", "#F2CC8F", "#252633"];
const INITIAL_NAMES = ["Iris", "Apricot", "Sea Glass", "Sand", "Ink"];
const STORAGE_KEYS = { saved: "palette-studio-saved-v1", theme: "palette-studio-theme-v1" };

let palette = INITIAL_COLORS.map((hex, i) => ({ hex, locked: false, name: INITIAL_NAMES[i] }));
let toastTimer;
const $ = (selector) => document.querySelector(selector);
const grid = $("#paletteGrid");
const toast = $("#toast");

function randomHex() {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 45 + Math.floor(Math.random() * 41);
  const lightness = 32 + Math.floor(Math.random() * 43);
  return hslToHex(hue, saturation, lightness);
}
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const color = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}
function hexToRgb(hex) {
  const n = Number.parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function readableText(hex) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
  return luminance > 160 ? "#20212A" : "#FFFFFF";
}
function colorName(hex, index = 0) {
  const { r, g, b } = hexToRgb(hex);
  if (r > 210 && g > 150 && b < 150) return "Golden Hour";
  if (r > 190 && g < 150 && b > 140) return "Soft Bloom";
  if (g > r * 1.12 && g > b * 0.95) return "Fresh Mint";
  if (b > r * 1.15 && b > g * 0.95) return "Blue Hour";
  if (r > 170 && g > 90 && b < 110) return "Warm Clay";
  if (r < 75 && g < 85 && b < 110) return "Midnight";
  if (r > 190 && g > 180 && b > 160) return "Oat Milk";
  return ["Studio Violet", "Citrus Pop", "Moss Garden", "Rosewater", "Deep Space"][index % 5];
}
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1900);
}
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const copied = document.execCommand("copy");
      area.remove();
      if (!copied) throw new Error("Clipboard unavailable");
    }
    showToast(`${text} copied to clipboard`);
  } catch {
    showToast("Could not copy automatically — please copy: " + text);
  }
}
function makeButton(className, label, title, handler) {
  const button = document.createElement("button");
  button.className = className;
  button.type = "button";
  button.textContent = label;
  button.title = title;
  button.setAttribute("aria-label", title);
  button.addEventListener("click", handler);
  return button;
}
function renderPalette() {
  grid.innerHTML = "";
  palette.forEach((color, index) => {
    const card = document.createElement("article");
    card.className = "color-card";
    const swatch = document.createElement("div");
    swatch.className = "swatch";
    swatch.style.backgroundColor = color.hex;
    swatch.tabIndex = 0;
    swatch.setAttribute("role", "button");
    swatch.setAttribute("aria-label", `Copy color ${color.hex}`);
    const copy = makeButton("copy-overlay", "COPY HEX", `Copy ${color.hex}`, e => {
      e.stopPropagation();
      copyText(color.hex);
    });
    swatch.appendChild(copy);
    swatch.addEventListener("click", () => copyText(color.hex));
    swatch.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        copyText(color.hex);
      }
    });

    const bottom = document.createElement("div");
    bottom.className = "card-bottom";
    const labels = document.createElement("div");
    labels.style.minWidth = "0";
    const name = document.createElement("div");
    name.className = "color-name";
    name.textContent = colorName(color.hex, index);
    const hex = document.createElement("div");
    hex.className = "hex-code";
    hex.textContent = color.hex;
    labels.append(name, hex);

    const lock = makeButton(`lock-btn${color.locked ? " locked" : ""}`, color.locked ? "🔒" : "⌑",
      color.locked ? "Unlock color" : "Lock color", () => {
        color.locked = !color.locked;
        renderPalette();
        showToast(color.locked ? "Color locked" : "Color unlocked");
      });
    lock.setAttribute("aria-pressed", String(color.locked));
    bottom.append(labels, lock);
    card.append(swatch, bottom);
    grid.appendChild(card);
  });
  $("#colorCount").textContent = `${palette.length} ${palette.length === 1 ? "color" : "colors"}`;
  updatePreview();
}
function generatePalette() {
  let changed = 0;
  palette = palette.map(color => {
    if (color.locked) return color;
    changed++;
    return { ...color, hex: randomHex() };
  });
  renderPalette();
  showToast(changed ? "Your new palette is ready!" : "Unlock a color to generate new shades");
}
function updatePreview() {
  const colors = palette.map(p => p.hex);
  if (!colors.length) return;
  const [a, b = a, c = b, d = c, e = d] = colors;
  const preview = $("#previewCard");
  preview.style.backgroundColor = a;
  const textColor = readableText(a);
  ["#previewBadge", "#previewTitle", "#previewText", ".mini-brand", ".mini-nav"].forEach(sel => {
    $(sel).style.color = textColor;
  });
  $(".mini-avatar").style.backgroundColor = b;
  $(".mini-avatar").style.color = readableText(b);
  $(".orb-one").style.backgroundColor = c;
  $(".orb-two").style.backgroundColor = d;
  $(".preview-cta").style.backgroundColor = e;
  $(".preview-cta").style.color = readableText(e);
  $(".legend-a").style.backgroundColor = a;
  $(".legend-b").style.backgroundColor = b;
  $(".legend-c").style.backgroundColor = c;
}
function exportPalette() {
  const content = "PALETTE STUDIO — COLOR PALETTE\n\n" +
    palette.map((c, i) => `${i + 1}. ${colorName(c.hex, i)}: ${c.hex}${c.locked ? " (locked)" : ""}`).join("\n") + "\n";
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "palette-studio-colors.txt";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast("Palette exported as a text file");
}
function getSavedPalettes() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.saved) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
function updateSavedCount() { $("#savedCount").textContent = getSavedPalettes().length; }
function savePalette() {
  const saved = getSavedPalettes();
  saved.unshift({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, createdAt: new Date().toISOString(),
    colors: palette.map(c => ({ hex: c.hex, locked: c.locked })) });
  try {
    localStorage.setItem(STORAGE_KEYS.saved, JSON.stringify(saved.slice(0, 30)));
    updateSavedCount();
    showToast("Palette saved in this browser");
  } catch { showToast("Unable to save — browser storage may be full"); }
}
function renderSavedPalettes() {
  const saved = getSavedPalettes();
  const list = $("#savedList");
  list.innerHTML = "";
  $("#emptySaved").style.display = saved.length ? "none" : "block";
  saved.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "saved-item";
    const visual = document.createElement("div");
    const swatches = document.createElement("div");
    swatches.className = "saved-swatches";
    (item.colors || []).forEach(c => {
      const swatch = document.createElement("button");
      swatch.className = "saved-swatch";
      swatch.style.backgroundColor = c.hex;
      swatch.title = `Copy ${c.hex}`;
      swatch.setAttribute("aria-label", `Copy ${c.hex}`);
      swatch.addEventListener("click", () => copyText(c.hex));
      swatches.appendChild(swatch);
    });
    const date = document.createElement("small");
    date.textContent = `Palette ${saved.length - index} · ${new Date(item.createdAt).toLocaleDateString()}`;
    visual.append(swatches, date);
    const actions = document.createElement("div");
    actions.className = "saved-item-actions";
    const load = makeButton("", "Load", "Load this palette", () => {
      palette = item.colors.map(c => ({ hex: c.hex, locked: Boolean(c.locked) }));
      renderPalette();
      $("#savedDialog").close();
      showToast("Saved palette loaded");
    });
    const remove = makeButton("", "Delete", "Delete this saved palette", () => {
      const updated = getSavedPalettes().filter(p => p.id !== item.id);
      localStorage.setItem(STORAGE_KEYS.saved, JSON.stringify(updated));
      updateSavedCount();
      renderSavedPalettes();
      showToast("Saved palette deleted");
    });
    actions.append(load, remove);
    row.append(visual, actions);
    list.appendChild(row);
  });
}
function toggleTheme() {
  const dark = document.body.classList.toggle("dark");
  try { localStorage.setItem(STORAGE_KEYS.theme, dark ? "dark" : "light"); } catch {}
  $("#themeBtn").textContent = dark ? "☀" : "☾";
  $("#themeBtn").title = dark ? "Switch to light mode" : "Switch to dark mode";
}
function resetPalette() {
  palette = INITIAL_COLORS.map((hex, i) => ({ hex, locked: false, name: INITIAL_NAMES[i] }));
  renderPalette();
  showToast("Palette reset");
}

$("#generateBtn").addEventListener("click", generatePalette);
$("#shuffleBtn").addEventListener("click", generatePalette);
$("#exportBtn").addEventListener("click", exportPalette);
$("#saveBtn").addEventListener("click", savePalette);
$("#savedBtn").addEventListener("click", () => { renderSavedPalettes(); $("#savedDialog").showModal(); });
$("#closeSavedBtn").addEventListener("click", () => $("#savedDialog").close());
$("#themeBtn").addEventListener("click", toggleTheme);
$("#resetBtn").addEventListener("click", resetPalette);
$("#addColorBtn").addEventListener("click", () => {
  if (palette.length >= 10) { showToast("You can have up to 10 colors"); return; }
  palette.push({ hex: randomHex(), locked: false });
  renderPalette();
  showToast("Color added");
});
$("#previewCta").addEventListener("click", () => showToast("This is just a live preview"));
document.addEventListener("keydown", e => {
  const target = e.target;
  const typing = target && (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable);
  if (e.code === "Space" && !typing && !$("#savedDialog").open) {
    e.preventDefault();
    generatePalette();
  }
  if (e.key === "Escape" && $("#savedDialog").open) $("#savedDialog").close();
});
try {
  if (localStorage.getItem(STORAGE_KEYS.theme) === "dark") {
    document.body.classList.add("dark");
    $("#themeBtn").textContent = "☀";
    $("#themeBtn").title = "Switch to light mode";
  }
} catch {}
updateSavedCount();
renderPalette();
