"use strict";

/* ===== 등급 설정 (합계 100) ===== */
const GRADES = [
  { key: "A", name: "A상", count: 3,  color: "var(--g-a)", rare: true  },
  { key: "B", name: "B상", count: 7,  color: "var(--g-b)", rare: true  },
  { key: "C", name: "C상", count: 10, color: "var(--g-c)", rare: false },
  { key: "D", name: "D상", count: 20, color: "var(--g-d)", rare: false },
  { key: "E", name: "E상", count: 25, color: "var(--g-e)", rare: false },
  { key: "F", name: "F상", count: 35, color: "var(--g-f)", rare: false },
];
const TOTAL = GRADES.reduce((sum, g) => sum + g.count, 0); // 100

/* ===== 상태 ===== */
let tickets = [];                 // [{ grade }] 길이 100
let selectedIndex = null;         // 현재 선택한 티켓
let drawnIndices = new Set();     // 지금까지 뽑아 소진된 티켓들 (누적)
let lastDrawn = null;             // 방금 뽑은 티켓 (결과 표시용)

/* ===== DOM ===== */
const $ = (id) => document.getElementById(id);
const screens = {
  product: $("screen-product"),
  select: $("screen-select"),
  result: $("screen-result"),
};

/* ===== 유틸 ===== */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function gradeOf(key) {
  return GRADES.find((g) => g.key === key);
}
function remaining() {
  return TOTAL - drawnIndices.size;
}
function updateStock() {
  // 뽑아 소진된 만큼 남은 수 감소 (100 → 99 → 98 …)
  const remain = remaining();
  ["stock-count", "stock-select", "stock-result"].forEach((id) => {
    const el = $(id);
    if (el) el.textContent = String(remain);
  });
}
function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove("is-active"));
  screens[name].classList.add("is-active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ===== 초기화 (처음부터) ===== */
function buildTickets() {
  const pool = [];
  GRADES.forEach((g) => {
    for (let i = 0; i < g.count; i++) pool.push(g.key);
  });
  shuffle(pool);
  tickets = pool.map((key) => ({ grade: key }));
  selectedIndex = null;
  drawnIndices = new Set();
  lastDrawn = null;
}

function renderPrizes() {
  const grid = $("prize-grid");
  grid.innerHTML = "";
  GRADES.forEach((g) => {
    const card = document.createElement("div");
    card.className = "prize-card";
    card.innerHTML = `
      <div class="prize-thumb" style="background:${g.color}">${g.key}</div>
      <div class="prize-body">
        <div class="prize-name">${g.name} 경품</div>
        <div class="prize-count">${g.count}개</div>
      </div>`;
    grid.appendChild(card);
  });
}

function renderTickets() {
  const grid = $("ticket-grid");
  grid.innerHTML = "";
  tickets.forEach((t, i) => {
    const btn = document.createElement("button");
    btn.className = "ticket";
    btn.type = "button";
    btn.setAttribute("role", "option");
    btn.dataset.index = String(i);
    btn.innerHTML = `<span class="ticket-num">${String(i + 1).padStart(3, "0")}</span>
                     <span class="ticket-logo"></span>`;
    btn.addEventListener("click", () => onTicketClick(i));
    grid.appendChild(btn);
  });
  syncTicketUI();
}

/* ===== 티켓 선택/해제 ===== */
function onTicketClick(i) {
  if (drawnIndices.has(i)) return;            // 이미 소진된 티켓은 선택 불가
  selectedIndex = selectedIndex === i ? null : i;
  syncTicketUI();
}

function syncTicketUI() {
  const nodes = $("ticket-grid").children;
  for (const node of nodes) {
    const i = Number(node.dataset.index);
    const drawn = drawnIndices.has(i);
    node.classList.toggle("is-drawn", drawn);
    node.classList.toggle("is-selected", i === selectedIndex && !drawn);
    node.querySelector(".ticket-done")?.remove();
    if (drawn) {
      const done = document.createElement("span");
      done.className = "ticket-done";
      done.textContent = tickets[i].grade; // 당첨 등급 알파벳
      node.appendChild(done);
    }
  }
  const soldOut = remaining() === 0;
  $("draw-btn").disabled = selectedIndex === null || soldOut;
  $("draw-hint").textContent =
    soldOut ? "모든 복권이 소진되었습니다." :
    selectedIndex === null ? "복권을 한 장 선택하세요." :
    `${String(selectedIndex + 1).padStart(3, "0")}번 복권을 선택했어요.`;
  updateStock();
}

/* ===== 뽑기 → 공개 애니메이션 ===== */
function doDraw() {
  if (selectedIndex === null || drawnIndices.has(selectedIndex)) return;
  lastDrawn = selectedIndex;
  drawnIndices.add(lastDrawn);        // 즉시 소진 처리 (누적)
  const g = gradeOf(tickets[lastDrawn].grade);

  const overlay = $("draw-overlay");
  const flip = $("flip-card");
  const confirm = $("overlay-confirm");

  // 뒷면 준비
  $("flip-grade").textContent = g.key;
  $("flip-sub").textContent = g.name;
  $("flip-back").style.background = g.color;
  $("overlay-caption").textContent = "두구두구…";
  flip.classList.remove("is-flipped", "rare");
  confirm.hidden = true;

  overlay.classList.add("is-open");
  overlay.setAttribute("aria-hidden", "false");

  // 뒤 그리드도 즉시 소진 상태로 갱신
  selectedIndex = null;
  syncTicketUI();

  // 잠시 뜸 들인 뒤 flip
  setTimeout(() => {
    flip.classList.add("is-flipped");
    if (g.rare) flip.classList.add("rare");
    $("overlay-caption").textContent = `${g.name} 당첨!`;
    confirm.hidden = false;
  }, 1400);
}

function confirmResult() {
  const overlay = $("draw-overlay");
  overlay.classList.remove("is-open");
  overlay.setAttribute("aria-hidden", "true");

  const g = gradeOf(tickets[lastDrawn].grade);
  $("result-grade").textContent = g.key;
  $("result-label").textContent = g.name;
  $("result-prize").textContent = `${g.name} 경품 (플레이스홀더)`;
  $("result-card").style.background = g.color;

  // 소진 다 됐으면 "한 번 더" 대신 완료 안내
  const soldOut = remaining() === 0;
  $("draw-again-btn").hidden = soldOut;
  $("result-soldout").hidden = !soldOut;

  showScreen("result");
}

/* ===== 한 번 더 뽑기 (판 유지, 계속 소진) ===== */
function drawAgain() {
  selectedIndex = null;
  syncTicketUI();
  showScreen("select");
}

/* ===== 처음부터 (전체 초기화) ===== */
function resetAll() {
  buildTickets();
  renderTickets();
  $("turns-left").textContent = "1";
  showScreen("product");
}

/* ===== 이벤트 바인딩 ===== */
function init() {
  buildTickets();
  renderPrizes();
  renderTickets();

  $("go-select").addEventListener("click", () => showScreen("select"));
  $("back-to-product").addEventListener("click", () => showScreen("product"));
  $("draw-btn").addEventListener("click", doDraw);
  $("overlay-confirm").addEventListener("click", confirmResult);
  $("draw-again-btn").addEventListener("click", drawAgain);
  $("reset-btn").addEventListener("click", resetAll);
}

document.addEventListener("DOMContentLoaded", init);
