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
  const POINT_CAP = 1500;
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
    },
    {
      key: "handles",
      name: "Streetball Handles",
      sub: "Breaking ankles & putting on a show",
      attrs: [
        "Ankle Breaker", "Hesi Pull", "Crossover",
        "Behind-the-Back", "Between-the-Legs", "Spin Move"
      ]
    },
    {
      key: "swagger",
      name: "Swagger & Intangibles",
      sub: "Mind games, flopping & street antics",
      attrs: [
        "Trash Talk", "Flopping", "Ball Slapper",
        "Showboating", "Mind Games", "Clutch Gene"
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

  // Streetball Handles + Swagger feed a separate "flair" bonus to the Overall,
  // so investing in them always nudges your rating (up to +FLAIR_MAX) even when
  // those ratings don't crack your top-8 core attributes.
  const STREET_KEYS = { handles: true, swagger: true };
  const streetIds = [];
  CATEGORIES.forEach(function (cat) {
    if (!STREET_KEYS[cat.key]) return;
    cat.attrs.forEach(function (attr) { streetIds.push(idOf(cat.key, attr)); });
  });
  const FLAIR_MAX = 6;
  const flairBonus = function () {
    if (!streetIds.length) return 0;
    const sum = streetIds.reduce(function (s, id) { return s + state[id]; }, 0);
    return Math.round((sum / (streetIds.length * ATTR_MAX)) * FLAIR_MAX);
  };

  const spent = function () {
    return allIds.reduce(function (sum, id) { return sum + state[id]; }, 0);
  };
  const remaining = function () { return POINT_CAP - spent(); };

  /* ---------- Injuries (each ailment docks Overall points) ---------- */
  const INJURIES = [
    { id: "ankles",     name: "Glass Ankles",          penalty: 3, note: "Rolls ankles on hard cuts" },
    { id: "knees",      name: "Bad Knees",             penalty: 5, note: "Cartilage wear; explosive moves risky" },
    { id: "back",       name: "Chronic Back",          penalty: 4, note: "Tightens up over heavy minutes" },
    { id: "hamstring",  name: "Hamstring Issues",      penalty: 3, note: "Strains on full sprints" },
    { id: "achilles",   name: "Achilles / Foot",       penalty: 5, note: "High re-injury risk" },
    { id: "shoulder",   name: "Shoulder Problems",     penalty: 3, note: "Affects contact & shooting" },
    { id: "concussion", name: "Concussion History",    penalty: 4, note: "Protocol absences" },
    { id: "brittle",    name: "Injury Prone (Brittle)", penalty: 6, note: "Frequent soft-tissue injuries" }
  ];
  const injuryState = {};
  INJURIES.forEach(function (i) { injuryState[i.id] = false; });
  const injuryPenalty = function () {
    return INJURIES.reduce(function (s, i) { return s + (injuryState[i.id] ? i.penalty : 0); }, 0);
  };

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

  function computeOverall() {
    const penalty = injuryPenalty();
    const flair = flairBonus();
    const TOP_N = 8;
    const topRatings = allIds
      .map(function (id) { return state[id]; })
      .sort(function (a, b) { return b - a; })
      .slice(0, TOP_N);
    const base = topRatings.length
      ? Math.round(topRatings.reduce(function (a, b) { return a + b; }, 0) / topRatings.length)
      : 0;
    const finalOverall = Math.max(0, Math.min(99, base + flair - penalty));
    return { base: base, flair: flair, penalty: penalty, finalOverall: finalOverall, topN: TOP_N };
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

    // Overall = average of the player's BEST attributes, minus injuries.
    // A "top N" average (vs. a flat average across every attribute) lets a
    // focused build climb into the 90s while a thin spread stays lower.
    const ov = computeOverall();
    const penalty = ov.penalty;
    const flair = ov.flair;
    const TOP_N = ov.topN;
    const base = ov.base;
    const finalOverall = ov.finalOverall;

    const overallEl = document.getElementById("overallValue");
    if (overallEl) {
      overallEl.textContent = finalOverall;
      overallEl.classList.toggle("hurt", penalty > 0);
    }
    const noteEl = document.getElementById("overallNote");
    if (noteEl) {
      if (flair === 0 && penalty === 0) {
        noteEl.textContent = "Avg of top " + TOP_N + " ratings";
      } else {
        const parts = ["Top " + TOP_N + " " + base];
        if (flair > 0) parts.push("+" + flair + " flair");
        if (penalty > 0) parts.push("−" + penalty + " injuries");
        noteEl.textContent = parts.join(" · ");
      }
    }
    const injTotal = document.querySelector("[data-injury-total]");
    if (injTotal) injTotal.innerHTML = "−" + penalty + " OVR";
  }

  function buildInjuries() {
    const host = document.getElementById("attributes");
    if (!host) return;

    const rows = INJURIES.map(function (i) {
      return (
        '<label class="injury">' +
          '<input type="checkbox" data-injury="' + i.id + '" />' +
          '<span class="injury-box" aria-hidden="true"></span>' +
          '<span class="injury-info">' +
            '<span class="injury-name">' + i.name + '</span>' +
            '<span class="injury-note">' + i.note + '</span>' +
          '</span>' +
          '<span class="injury-pen">&minus;' + i.penalty + ' OVR</span>' +
        '</label>'
      );
    }).join("");

    const sec = document.createElement("section");
    sec.className = "cat injury-cat";
    sec.innerHTML =
      '<div class="cat-head"><div>' +
        '<div class="cat-name">Injury Profile</div>' +
        '<div class="cat-sub">Pre-existing ailments — each lowers Overall</div>' +
      '</div><div class="cat-points injury-total" data-injury-total>&minus;0 OVR</div></div>' +
      rows;
    host.appendChild(sec);

    sec.addEventListener("change", function (e) {
      const cb = e.target;
      if (!cb.matches('input[type="checkbox"]')) return;
      injuryState[cb.dataset.injury] = cb.checked;
      render();
    });
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
    INJURIES.forEach(function (i) { injuryState[i.id] = false; });
    document.querySelectorAll('input[data-injury]').forEach(function (cb) { cb.checked = false; });
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

  /* ---------- Saving profiles (browser localStorage) ---------- */
  const STORAGE_KEY = "rjp_profiles_v1";

  function loadProfiles() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function saveProfiles(arr) {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); return true; }
    catch (e) { return false; }
  }

  function setStatus(msg, kind) {
    const el = document.getElementById("submitStatus");
    if (!el) return;
    el.textContent = msg || "";
    el.className = "submit-status" + (kind ? " " + kind : "");
  }

  // Where submissions are posted. The page is static, so "submit" opens a
  // pre-filled GitHub Issue in this repo — a real, persistent destination.
  const SUBMIT_REPO = "aaronsemi/cl-testing";

  function buildIssueBody(name, ov) {
    const lines = [];
    lines.push("## Player Build — " + name);
    lines.push("");
    const noteParts = ["Top " + ov.topN + " avg " + ov.base];
    if (ov.flair > 0) noteParts.push("+" + ov.flair + " flair");
    if (ov.penalty > 0) noteParts.push("-" + ov.penalty + " injuries");
    lines.push("**Overall:** " + ov.finalOverall + "  (" + noteParts.join(" · ") + ")");
    lines.push("**Points:** " + spent() + " / " + POINT_CAP);
    lines.push("");
    CATEGORIES.forEach(function (cat) {
      lines.push("### " + cat.name);
      cat.attrs.forEach(function (attr) {
        lines.push("- " + attr + ": " + state[idOf(cat.key, attr)]);
      });
      lines.push("");
    });
    const chosen = INJURIES.filter(function (i) { return injuryState[i.id]; });
    lines.push("### Injuries");
    if (chosen.length) {
      chosen.forEach(function (i) { lines.push("- " + i.name + " (-" + i.penalty + ")"); });
    } else {
      lines.push("- None (fully healthy)");
    }
    lines.push("");
    lines.push("_Submitted via the Build a Player tool._");
    return lines.join("\n");
  }

  function buildIssueUrl(name, ov) {
    const title = "Build: " + name + " (" + ov.finalOverall + " OVR)";
    return "https://github.com/" + SUBMIT_REPO + "/issues/new" +
      "?title=" + encodeURIComponent(title) +
      "&body=" + encodeURIComponent(buildIssueBody(name, ov));
  }

  function submitProfile() {
    const nameInput = document.getElementById("playerName");
    const name = (nameInput && nameInput.value || "").trim();
    if (!name) {
      setStatus("Enter a player name before submitting.", "warn");
      if (nameInput) nameInput.focus();
      return;
    }

    const ov = computeOverall();
    const attrs = {};
    allIds.forEach(function (id) { attrs[id] = state[id]; });
    const injuries = INJURIES.filter(function (i) { return injuryState[i.id]; })
                             .map(function (i) { return i.id; });

    const profile = {
      id: "p_" + Date.now() + "_" + Math.floor(Math.random() * 1e6),
      name: name,
      overall: ov.finalOverall,
      spent: spent(),
      cap: POINT_CAP,
      attrs: attrs,
      injuries: injuries,
      savedAt: new Date().toISOString()
    };

    const profiles = loadProfiles();
    profiles.unshift(profile);
    saveProfiles(profiles); // local draft copy (non-fatal if storage is off)
    renderSaved();

    // Actually submit: open a pre-filled GitHub Issue to post the build.
    const url = buildIssueUrl(name, ov);
    const win = window.open(url, "_blank", "noopener");

    setStatus("“" + name + "” (Overall " + ov.finalOverall + ") — ", "ok");
    const el = document.getElementById("submitStatus");
    if (el) {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener";
      a.className = "submit-link";
      a.textContent = win ? "finish posting on GitHub →" : "open GitHub to post →";
      el.appendChild(a);
    }
  }

  function applyProfile(p) {
    allIds.forEach(function (id) { state[id] = (p.attrs && typeof p.attrs[id] === "number") ? p.attrs[id] : 0; });
    INJURIES.forEach(function (i) { injuryState[i.id] = (p.injuries || []).indexOf(i.id) !== -1; });
    document.querySelectorAll("input[data-injury]").forEach(function (cb) {
      cb.checked = injuryState[cb.dataset.injury];
    });
    const nameInput = document.getElementById("playerName");
    if (nameInput) { nameInput.value = p.name || ""; syncBuildName(nameInput.value); }
    render();
    setStatus("Loaded “" + (p.name || "build") + "”.", "ok");
    const builder = document.getElementById("builder");
    if (builder && builder.scrollIntoView) builder.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function deleteProfile(id) {
    const profiles = loadProfiles().filter(function (p) { return p.id !== id; });
    saveProfiles(profiles);
    renderSaved();
  }

  function renderSaved() {
    const host = document.getElementById("savedList");
    const empty = document.getElementById("savedEmpty");
    if (!host) return;
    const profiles = loadProfiles();

    if (empty) empty.style.display = profiles.length ? "none" : "";

    host.innerHTML = profiles.map(function (p) {
      const inj = (p.injuries && p.injuries.length) ? (p.injuries.length + " injur" + (p.injuries.length === 1 ? "y" : "ies")) : "healthy";
      return (
        '<li class="saved-item">' +
          '<span class="saved-ovr">' + p.overall + '</span>' +
          '<span class="saved-info">' +
            '<span class="saved-name">' + escapeHtml(p.name) + '</span>' +
            '<span class="saved-meta">' + p.spent + " pts · " + inj + '</span>' +
          '</span>' +
          '<span class="saved-actions">' +
            '<button type="button" class="btn btn-outline btn-sm" data-load="' + p.id + '">Load</button>' +
            '<button type="button" class="btn btn-outline btn-sm" data-del="' + p.id + '">Delete</button>' +
          '</span>' +
        '</li>'
      );
    }).join("");
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
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
    buildInjuries();
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

    const submit = document.getElementById("submitBtn");
    if (submit) submit.addEventListener("click", submitProfile);

    const savedList = document.getElementById("savedList");
    if (savedList) {
      savedList.addEventListener("click", function (e) {
        const loadBtn = e.target.closest("[data-load]");
        const delBtn = e.target.closest("[data-del]");
        if (loadBtn) {
          const p = loadProfiles().filter(function (x) { return x.id === loadBtn.dataset.load; })[0];
          if (p) applyProfile(p);
        } else if (delBtn) {
          deleteProfile(delBtn.dataset.del);
        }
      });
    }
    renderSaved();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
