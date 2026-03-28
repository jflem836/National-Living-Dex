async function loadJSON(filename) {
  const response = await fetch(filename);

  if (!response.ok) {
    throw new Error(`Failed to load ${filename}`);
  }

  return await response.json();
}

async function loadAllEncounters() {
  const files = await loadJSON("encounters/index.json");
  const encounterArrays = await Promise.all(
    files.map((file) => loadJSON(`encounters/${file}`))
  );
  return encounterArrays.flat();
}

const GAME_ORDER = [
  "Pokemon Red",
  "Pokemon Blue",
  "Pokemon Yellow",

  "Pokemon Gold",
  "Pokemon Silver",
  "Pokemon Crystal",

  "Pokemon Ruby",
  "Pokemon Sapphire",
  "Pokemon Emerald",
  "Pokemon FireRed",
  "Pokemon LeafGreen",

  "Pokemon Diamond",
  "Pokemon Pearl",
  "Pokemon Platinum",
  "Pokemon HeartGold",
  "Pokemon SoulSilver",

  "Pokemon Black",
  "Pokemon White",
  "Pokemon Black 2",
  "Pokemon White 2",

  "Pokemon X",
  "Pokemon Y",
  "Pokemon Omega Ruby",
  "Pokemon Alpha Sapphire",

  "Pokemon Sun",
  "Pokemon Moon",
  "Pokemon Ultra Sun",
  "Pokemon Ultra Moon",

  "Pokemon Sword",
  "Pokemon Shield",

  "Pokemon Scarlet",
  "Pokemon Violet"
];

const GAME_ORDER_MAP = Object.fromEntries(
  GAME_ORDER.map((game, index) => [game, index])
);

function normalizeGameName(name) {
  const map = {
    red: "Pokemon Red",
    blue: "Pokemon Blue",
    yellow: "Pokemon Yellow",
    gold: "Pokemon Gold",
    silver: "Pokemon Silver",
    crystal: "Pokemon Crystal",
    firered: "Pokemon FireRed",
    leafgreen: "Pokemon LeafGreen",
    heartgold: "Pokemon HeartGold",
    soulsilver: "Pokemon SoulSilver",
    scarlet: "Pokemon Scarlet",
    violet: "Pokemon Violet"
  };

  const key = String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return map[key] || name;
}

function normalizeConsoleName(name) {
  const map = {
    gb: "Game Boy",
    gameboy: "Game Boy",
    gbc: "Game Boy Color",
    gameboycolor: "Game Boy Color",
    gba: "Game Boy Advance",
    gameboyadvance: "Game Boy Advance",
    nds: "Nintendo DS",
    nintendods: "Nintendo DS",
    switch: "Nintendo Switch",
    nintendoswitch: "Nintendo Switch"
  };

  const key = String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return map[key] || name;
}

function buildEncounterMap(encounters) {
  const map = new Map();
  const seen = new Set();

  for (const encounter of encounters) {
    const pokemonId = Number(encounter.pokemonId);

    const normalizedEntry = {
      name: normalizeGameName(encounter.game),
      console: normalizeConsoleName(encounter.console),
      location: encounter.location || "Unknown location",
      method: encounter.method || "catch"
    };

    const dedupeKey = [
      pokemonId,
      normalizedEntry.name,
      normalizedEntry.console,
      normalizedEntry.location,
      normalizedEntry.method
    ].join("|");

    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);

    if (!map.has(pokemonId)) {
      map.set(pokemonId, []);
    }

    map.get(pokemonId).push(normalizedEntry);
  }

  for (const entries of map.values()) {
  entries.sort((a, b) => {
    const orderA = GAME_ORDER_MAP[a.name] ?? 9999;
    const orderB = GAME_ORDER_MAP[b.name] ?? 9999;

    if (orderA !== orderB) return orderA - orderB;

    // fallback inside same game
    if (a.location !== b.location) return a.location.localeCompare(b.location);
    return a.method.localeCompare(b.method);
  });
}

  return map;
}

function getPokemonGames(pokemonId) {
  return encounterMap.get(pokemonId) || [];
}

function getSpriteUrl(pokemonId) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;
}

let pokemonData = [];
let selectedPokemonId = null;
let encounterMap = new Map();

async function init() {
  try {
    const pokemon = await loadJSON("pokemon.json");
    const encounters = await loadAllEncounters();

    encounterMap = buildEncounterMap(encounters);

    const savedData = localStorage.getItem("pokemonData");

    if (savedData) {
      pokemonData = JSON.parse(savedData).map((p) => ({
        ...p,
        region: p.region ? p.region.toLowerCase() : "",
        types: normalizeTypes(p.types)
      }));
    } else {
      pokemonData = pokemon.map((p) => ({
        ...p,
        region: p.region ? p.region.toLowerCase() : "",
        types: normalizeTypes(p.types),
        caught: false,
        shiny: false
      }));
    }

    loadOwnedSelections();
    applyFilters();
  } catch (error) {
    console.error("Init failed:", error);
  }
}

//localStorage.removeItem("pokemonData");
//localStorage.removeItem("ownedGames");
//localStorage.removeItem("ownedConsoles");


let pokemonList;
let completionText;
let progressText;
let progressFill;
let searchInput;
let ownedConsoleCheckboxes;
let ownedGameCheckboxes;
let filterSelect;
let clearFiltersBtn;
let regionCheckboxes;
let typeCheckboxes;
let gameCheckboxes;
let consoleCheckboxes;
let shownCount;
let hiddenCount;
let totalCount;
let unavailablePokemonList;
let obtainableProgressText;
let obtainableProgressFill;

function setupDOMReferences() {
  pokemonList = document.getElementById("pokemon-list");
  completionText = document.getElementById("completion");
  progressText = document.getElementById("progress-text");
  progressFill = document.getElementById("progress-fill");
  searchInput = document.getElementById("search");
  ownedConsoleCheckboxes = document.querySelectorAll(".owned-console");
  ownedGameCheckboxes = document.querySelectorAll(".owned-game");
  filterSelect = document.getElementById("filter");
  clearFiltersBtn = document.getElementById("clear-filters");
  regionCheckboxes = document.querySelectorAll(".region-checkbox");
  typeCheckboxes = document.querySelectorAll(".type-checkbox");
  gameCheckboxes = document.querySelectorAll(".game-checkbox");
  consoleCheckboxes = document.querySelectorAll(".console-checkbox");
  shownCount = document.getElementById("shown-count");
  hiddenCount = document.getElementById("hidden-count");
  totalCount = document.getElementById("total-count");
  unavailablePokemonList = document.getElementById("unavailable-pokemon-list");
  obtainableProgressText = document.getElementById("obtainable-progress-text");
  obtainableProgressFill = document.getElementById("obtainable-progress-fill");

  console.log("pokemonList =", pokemonList);
  console.log("unavailablePokemonList =", unavailablePokemonList);
}

const TYPE_MAP = {
  1: "normal",
  2: "fighting",
  3: "flying",
  4: "poison",
  5: "ground",
  6: "rock",
  7: "bug",
  8: "ghost",
  9: "steel",
  10: "fire",
  11: "water",
  12: "grass",
  13: "electric",
  14: "psychic",
  15: "ice",
  16: "dragon",
  17: "dark",
  18: "fairy"
};

function normalizeTypes(types) {
  if (!Array.isArray(types)) return [];

  return types.map((type) => {
    const typeId = Number(type);

    if (!Number.isNaN(typeId) && TYPE_MAP[typeId]) {
      return TYPE_MAP[typeId];
    }

    return String(type).toLowerCase();
  });
}

function formatType(type) {
  const value = String(type);
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function savePokemonData() {
  localStorage.setItem("pokemonData", JSON.stringify(pokemonData));
}

function updateOverallProgress() {
  const caughtCount = pokemonData.filter((pokemon) => pokemon.caught).length;
  const totalCount = pokemonData.length;
  const percent = totalCount === 0 ? 0 : (caughtCount / totalCount) * 100;

  progressText.textContent = `${caughtCount} / ${totalCount}`;
  progressFill.style.width = `${percent}%`;
}

function updateObtainableProgress(obtainablePokemon) {
  const obtainableTotal = obtainablePokemon.length;
  const caughtObtainable = obtainablePokemon.filter((pokemon) => pokemon.caught).length;

  const percent = obtainableTotal === 0 ? 0 : (caughtObtainable / obtainableTotal) * 100;

  obtainableProgressText.textContent = `${caughtObtainable} / ${obtainableTotal}`;
  obtainableProgressFill.style.width = `${percent}%`;
}

function saveOwnedSelections() {
  const ownedGames = Array.from(ownedGameCheckboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.value);

  const ownedConsoles = Array.from(ownedConsoleCheckboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.value);

  localStorage.setItem("ownedGames", JSON.stringify(ownedGames));
  localStorage.setItem("ownedConsoles", JSON.stringify(ownedConsoles));
}

function loadOwnedSelections() {
  const savedGames = JSON.parse(localStorage.getItem("ownedGames")) || [];
  const savedConsoles = JSON.parse(localStorage.getItem("ownedConsoles")) || [];

  ownedGameCheckboxes.forEach((checkbox) => {
    checkbox.checked = savedGames.includes(checkbox.value);
  });

  ownedConsoleCheckboxes.forEach((checkbox) => {
    checkbox.checked = savedConsoles.includes(checkbox.value);
  });
}

function renderPokemon(pokemonArray, container) {
  if (!container) {
    console.error("renderPokemon received null container");
    return;
  }

  container.innerHTML = "";

  for (let i = 0; i < pokemonArray.length; i++) {
    const pokemon = pokemonArray[i];

    const card = document.createElement("div");
    const reasonsHTML =
      pokemon.unavailableReasons && pokemon.unavailableReasons.length > 0
        ? `<div class="unavailable-reasons">${pokemon.unavailableReasons.join(", ")}</div>`
        : "";

    card.className = `pokemon-card ${pokemon.caught ? "caught" : ""} ${
      pokemon.id === selectedPokemonId ? "selected" : ""
    }`;
    card.dataset.id = pokemon.id;

    card.innerHTML = `
      <div class="dex-number">#${pokemon.id}</div>
      <button class="shiny-button ${pokemon.shiny ? "shiny-active" : ""}" data-id="${pokemon.id}">
        ${pokemon.shiny ? "✨" : "☆"}
      </button>
      <div class="sprite-container">
        <img src="${getSpriteUrl(pokemon.id)}" alt="${pokemon.name}">
      </div>
      <div class="pokemon-name">${pokemon.name}</div>
      ${reasonsHTML}
      <button class="info-button" data-id="${pokemon.id}">ℹ️</button>
    `;

    container.appendChild(card);
  }
}

function renderPokemonDetails() {
  const detailsContainer = document.getElementById("pokemon-details");

  function formatType(type) {
    const value = String(type);
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  if (selectedPokemonId === null) {
    detailsContainer.innerHTML = `<p>Select a Pokemon's info button to see details.</p>`;
    return;
  }

  const pokemon = pokemonData.find((p) => p.id === selectedPokemonId);

  if (!pokemon) {
    detailsContainer.innerHTML = `<p>Pokémon not found.</p>`;
    return;
  }

  const games = getPokemonGames(pokemon.id);
  let gamesHTML = "";

  if (games.length > 0) {
    for (let i = 0; i < games.length; i++) {
      const game = games[i];
      gamesHTML += `
        <li class="game-entry">
          <strong>${game.name}</strong><br>
          <span class="game-console">${game.console}</span><br>
          <span class="game-location">${game.location || "Unknown location"}</span><br>
          <span class="game-method">${game.method}</span>
        </li>
      `;
    }
  } else {
    gamesHTML = `<li class="game-entry">No game data available.</li>`;
  }

  detailsContainer.innerHTML = `
    <div class="details-header">
      <img 
        class="details-sprite"
        src="${getSpriteUrl(pokemon.id)}"
        alt="${pokemon.name}"
      >
      <div>
        <h2>${pokemon.name}</h2>
        <p>#${pokemon.id}</p>
      </div>
    </div>

    <div class="details-section">
      <p><strong>Region:</strong> ${pokemon.region}</p>
      <p><strong>Types:</strong></p>
      <div class="type-badges">
        ${pokemon.types.map(type => `<span class="type-badge type-${type}">${formatType(type)}</span>`).join("")}
      </div>
      <p><strong>Caught:</strong> ${pokemon.caught ? "Yes" : "No"}</p>
      <p><strong>Shiny:</strong> ${pokemon.shiny ? "Yes" : "No"}</p>
    </div>

    <div class="details-section">
      <h3>Locations by Game</h3>
      <ul class="games-list">
        ${gamesHTML}
      </ul>
    </div>
  `;
}

function addEventListeners() {
  const pokemonCards = document.querySelectorAll(".pokemon-card");
  const shinyButton = document.querySelectorAll(".shiny-button");
  const infoButtons = document.querySelectorAll(".info-button");

  pokemonCards.forEach((card) => {
    card.addEventListener("click", function () {
      const pokemonID = Number(this.dataset.id);
      const pokemon = pokemonData.find(p => p.id === pokemonID);
      pokemon.caught = !pokemon.caught;
      savePokemonData();
      applyFilters();
      renderPokemonDetails();
    });
  });

  shinyButton.forEach((button) => {
    button.addEventListener("click", function (event) {
      event.stopPropagation();
      const pokemonID = Number(this.dataset.id);
      const pokemon = pokemonData.find(p => p.id === pokemonID);
      pokemon.shiny = !pokemon.shiny;
      savePokemonData();
      applyFilters();
      renderPokemonDetails();
    });
  });

    infoButtons.forEach((button) => {
    button.addEventListener("click", function (event) {
        event.stopPropagation();

        const pokemonID = Number(this.dataset.id);
        selectedPokemonId = pokemonID;

        renderPokemonDetails();
    });
    });
}

function updateCompletion() {
  let caughtCount = 0;
  let shinyCount = 0;

  for (let i = 0; i < pokemonData.length; i++) {
    if (pokemonData[i].caught) {
        caughtCount++;
    }
    if (pokemonData[i].shiny){
        shinyCount++;
    }
  }

  completionText.textContent = `Caught: ${caughtCount} / ${pokemonData.length} | Shiny: ${shinyCount} / ${pokemonData.length}`;
}

function applyFilters() {
  const searchText = searchInput.value.toLowerCase();
  const selectedFilter = filterSelect.value;

  const selectedRegions = Array.from(regionCheckboxes)
    .filter((cb) => cb.checked)
    .map((cb) => cb.value);

  const selectedTypes = Array.from(typeCheckboxes)
    .filter((cb) => cb.checked)
    .map((cb) => cb.value);

  const selectedGames = Array.from(gameCheckboxes)
    .filter((cb) => cb.checked)
    .map((cb) => cb.value);

  const selectedConsoles = Array.from(consoleCheckboxes)
    .filter((cb) => cb.checked)
    .map((cb) => cb.value);

  const ownedGames = Array.from(ownedGameCheckboxes)
    .filter((cb) => cb.checked)
    .map((cb) => cb.value);

  const ownedConsoles = Array.from(ownedConsoleCheckboxes)
    .filter((cb) => cb.checked)
    .map((cb) => cb.value);

  const obtainablePokemon = pokemonData.filter((pokemon) =>
    isObtainable(pokemon, ownedGames, ownedConsoles)
    );

  const unavailablePokemon = pokemonData
    .filter((pokemon) => !isObtainable(pokemon, ownedGames, ownedConsoles))
    .map((pokemon) => ({
        ...pokemon,
        unavailableReasons: getUnavailabilityReasons(pokemon, ownedGames, ownedConsoles)
  }));

  const visibleObtainable = obtainablePokemon.filter((pokemon) =>
    matchesViewFilters(
      pokemon,
      searchText,
      selectedFilter,
      selectedRegions,
      selectedTypes
    )
  );

  const visibleUnavailable = unavailablePokemon.filter((pokemon) =>
    matchesViewFilters(
      pokemon,
      searchText,
      selectedFilter,
      selectedRegions,
      selectedTypes
    )
  );

  console.log("applyFilters running");
  console.log("pokemonData:", pokemonData);

  renderPokemon(visibleObtainable, pokemonList);
  renderPokemon(visibleUnavailable, unavailablePokemonList);

  addEventListeners();
  updateCompletion();
  updateOverallProgress();
  updateAvailabilitySummary(obtainablePokemon, unavailablePokemon);
  updateObtainableProgress(obtainablePokemon);
}

function updateAvailabilitySummary(obtainablePokemon, unavailablePokemon) {
  shownCount.textContent = obtainablePokemon.length;
  hiddenCount.textContent = unavailablePokemon.length;
  totalCount.textContent = pokemonData.length;
}

function isObtainable(pokemon, selectedGames, selectedConsoles) {
  const games = getPokemonGames(pokemon.id);

  if (selectedGames.length === 0 && selectedConsoles.length === 0) {
    return true;
  }

  const matchesGame =
    selectedGames.length === 0 ||
    games.some((game) => selectedGames.includes(game.name));

  const matchesConsole =
    selectedConsoles.length === 0 ||
    games.some((game) => selectedConsoles.includes(game.console));

  return matchesGame && matchesConsole;
}

function matchesViewFilters(pokemon, searchText, selectedFilter, selectedRegions, selectedTypes) {
  if (!pokemon.name.toLowerCase().includes(searchText)) {
    return false;
  }

  if (selectedFilter === "caught" && !pokemon.caught) {
    return false;
  }

  if (selectedFilter === "not-caught" && pokemon.caught){
    return false;
  }

  if (selectedFilter === "shiny" && !pokemon.shiny) {
    return false;
  }

  if (selectedRegions.length > 0 && !selectedRegions.includes(pokemon.region)) {
    return false;
  }

  if (
    selectedTypes.length > 0 &&
    !selectedTypes.some((type) => pokemon.types.includes(type))
  ) {
    return false;
  }

  return true;
}

function getUnavailabilityReasons(pokemon, selectedGames, selectedConsoles) {
  const reasons = [];
  const games = getPokemonGames(pokemon.id);

  const matchesGame =
    selectedGames.length === 0 ||
    games.some((game) => selectedGames.includes(game.name));

  const matchesConsole =
    selectedConsoles.length === 0 ||
    games.some((game) => selectedConsoles.includes(game.console));

  if (selectedGames.length > 0 && !matchesGame) {
    reasons.push("Not in selected game(s)");
  }

  if (selectedConsoles.length > 0 && !matchesConsole) {
    reasons.push("Not on selected console(s)");
  }

  return reasons;
}

function setupStaticEventListeners() {
  clearFiltersBtn.addEventListener("click", () => {
    searchInput.value = "";
    filterSelect.value = "all";

    regionCheckboxes.forEach(cb => cb.checked = false);
    typeCheckboxes.forEach(cb => cb.checked = false);

    applyFilters();
  });

  searchInput.addEventListener("input", applyFilters);
  filterSelect.addEventListener("change", applyFilters);

  regionCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", applyFilters);
  });

  typeCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", applyFilters);
  });

  ownedConsoleCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      saveOwnedSelections();
      applyFilters();
    });
  });

  ownedGameCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      saveOwnedSelections();
      applyFilters();
    });
  });
}

window.addEventListener("DOMContentLoaded", () => {
  setupDOMReferences();
  setupStaticEventListeners();
  init();
});