/* ===== 2026 Draft Class — roster + attribute builder ===== */
(function () {
  "use strict";

  /* ---------- Roster data (from the 2026 player list) ---------- */
  const ROSTER = [
    { name: "Aaron Seminiano", tag: "Mid-Range Sharpshooter", rating: 65 },
    { name: "Ben Galsim",      tag: "Jack of All Trades",     rating: 55 },
    { name: "Carlo Teodoro",   tag: "Jack of All Trades",     rating: 70 },
    { name: "Erick Liamzon",   tag: "Lockdown Defender",      rating: 60 },
    { name: "Evans Li",        tag: "Crafty Playmaker",       rating: 75 },
    { name: "Joe Lasala",      tag: "Lockdown Defender",      rating: 65 },
    { name: "Josh Seminiano",  tag: "Slashing Finisher",      rating: 68 }
  ];

  function renderRoster() {
    const host = document.getElementById("rosterList");
    if (!host) return;
    host.innerHTML = ROSTER.map(function (p) {
      return (
        '<article class="player">' +
          '<div class="player-head">' +
            '<span class="player-name">' + p.name + '</span>' +
            '<span class="player-tag">' + p.tag + '</span>' +
          '</div>' +
          '<div class="bar"><div class="bar-fill" style="width:0%">' +
            '<span>' + p.rating + '%</span>' +
          '</div></div>' +
        '</article>'
      );
    }).join("");

    // animate bars in after paint
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        host.querySelectorAll(".bar-fill").forEach(function (el, i) {
          el.style.width = ROSTER[i].rating + "%";
        });
      });
    });
  }

  /* ---------- Attribute builder ---------- */
  const POINT_CAP = 250;
  const ATTR_MAX  = 99;

  const CATEGORIES = [
    {
      key: "physicals",
      name: "Physicals",
      sub: "Raw athleticism & stamina drain",
      attrs: ["Speed", "Agility", "Strength", "Vertical", "Stamina"]
    },
    {
      key: "shooting",
      name: "Shooting & Finishing",
      sub: "Putting the ball in the basket",
      attrs: ["Close Shot", "Driving Layup", "Driving Dunk", "Mid-Range", "Three-Point"]
    },
    {
      key: "playmaking",
      name: "Playmaking",
      sub: "Creating for yourself and others",
      attrs: ["Pass Accuracy", "Ball Handle", "Speed with Ball"]
    },
    {
      key: "defense",
      name: "Defense",
      sub: "Stops, steals, blocks & boards",
      attrs: [
        "Interior Defense", "Perimeter Defense", "Steal",
        "Block", "Offensive Rebound", "Defensive Rebound"
      ]
    }
  ];

  // state: id -> value
  const state = {};
  const idOf = function (cat, attr) {
    return cat + "::" + attr.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  };
  const allIds = [];

  CATEGORIES.forEach(function (cat) {
    cat.attrs.forEach(function (attr) {
      const id = idOf(cat.key, attr);
      state[id] = 0;
      allIds.push(id);
    });
  });

  const spent = function () {
    return allIds.reduce(function (sum, id) { return sum + state[id]; }, 0);
  };
  const remaining = function () { return POINT_CAP - spent(); };

  function buildAttributes() {
    const host = document.getElementById("attributes");
    if (!host) return;

    host.innerHTML = CATEGORIES.map(function (cat) {
      const rows = cat.attrs.map(function (attr) {
        const id = idOf(cat.key, attr);
        return (
          '<div class="attr">' +
            '<label class="attr-name" for="' + id + '">' + attr + '</label>' +
            '<input type="range" id="' + id + '" min="0" max="' + ATTR_MAX + '" ' +
              'value="0" step="1" data-id="' + id + '" ' +
              'aria-label="' + attr + '" />' +
            '<output class="attr-value" data-out="' + id + '">0</output>' +
          '</div>'
        );
      }).join("");

      return (
        '<section class="cat">' +
          '<div class="cat-head">' +
            '<div>' +
              '<div class="cat-name">' + cat.name + '</div>' +
              '<div class="cat-sub">' + cat.sub + '</div>' +
            '</div>' +
            '<div class="cat-points" data-cat-points="' + cat.key + '">0 pts</div>' +
          '</div>' +
          rows +
        '</section>'
      );
    }).join("");

    host.addEventListener("input", function (e) {
      const input = e.target;
      if (!input.matches('input[type="range"]')) return;
      const id = input.dataset.id;
      let next = parseInt(input.value, 10) || 0;

      // clamp so the shared pool never goes over the cap
      const others = spent() - state[id];
      const max = Math.min(ATTR_MAX, POINT_CAP - others);
      if (next > max) next = max;

      state[id] = next;
      input.value = next;
      render();
    });
  }

  function render() {
    const rem = remaining();
    const sp = spent();

    // per-attribute outputs
    allIds.forEach(function (id) {
      const out = document.querySelector('[data-out="' + id + '"]');
      if (out) out.textContent = state[id];
      const input = document.getElementById(id);
      if (input && parseInt(input.value, 10) !== state[id]) input.value = state[id];
    });

    // per-category totals
    CATEGORIES.forEach(function (cat) {
      const total = cat.attrs.reduce(function (s, attr) { return s + state[idOf(cat.key, attr)]; }, 0);
      const badge = document.querySelector('[data-cat-points="' + cat.key + '"]');
      if (badge) badge.textContent = total + " pts";
      const li = document.querySelector('[data-cat-total="' + cat.key + '"]');
      if (li) li.textContent = total;
    });

    // points remaining
    const remEl = document.getElementById("pointsRemaining");
    const spentEl = document.getElementById("pointsSpent");
    const bar = document.getElementById("pointsBar");
    const barWrap = bar ? bar.parentElement : null;
    if (remEl) {
      remEl.textContent = rem;
      remEl.classList.toggle("exact", rem === 0);
      remEl.classList.remove("over"); // cap prevents over-spend, but kept for safety
    }
    if (spentEl) spentEl.textContent = sp;
    if (bar) bar.style.width = Math.min(100, (sp / POINT_CAP) * 100) + "%";
    if (barWrap) barWrap.classList.toggle("over", sp > POINT_CAP);

    // overall = average of all attributes, rounded
    const overallEl = document.getElementById("overallValue");
    if (overallEl) overallEl.textContent = Math.round(sp / allIds.length);
  }

  function buildCatTotals() {
    const host = document.getElementById("catTotals");
    if (!host) return;
    host.innerHTML = CATEGORIES.map(function (cat) {
      return (
        '<li><span>' + cat.name + '</span>' +
        '<b data-cat-total="' + cat.key + '">0</b></li>'
      );
    }).join("");
  }

  function resetAll() {
    allIds.forEach(function (id) { state[id] = 0; });
    render();
  }

  // spread `remaining` points randomly across attributes, never exceeding the cap
  function randomize() {
    allIds.forEach(function (id) { state[id] = 0; });
    let pool = POINT_CAP;
    let guard = 5000;
    while (pool > 0 && guard-- > 0) {
      const id = allIds[Math.floor(Math.random() * allIds.length)];
      if (state[id] >= ATTR_MAX) continue;
      const give = Math.min(ATTR_MAX - state[id], 1 + Math.floor(Math.random() * 6), pool);
      state[id] += give;
      pool -= give;
    }
    render();
  }

  function syncBuildName(value) {
    const out = document.getElementById("buildName");
    if (!out) return;
    const name = (value || "").trim();
    out.textContent = name ? name + "'s Build" : "Your Build";
  }

  function init() {
    renderRoster();
    buildAttributes();
    buildCatTotals();
    render();

    const nameInput = document.getElementById("playerName");
    if (nameInput) {
      nameInput.addEventListener("input", function () { syncBuildName(nameInput.value); });
      syncBuildName(nameInput.value);
    }

    const r = document.getElementById("randomizeBtn");
    const z = document.getElementById("resetBtn");
    if (r) r.addEventListener("click", randomize);
    if (z) z.addEventListener("click", resetAll);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
