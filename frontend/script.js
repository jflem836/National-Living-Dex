console.log("SCRIPT LOADED");

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

const ACTIVE_PROFILE_KEY = "ldex_active_profile_id";

function getActiveProfileId() {
  return localStorage.getItem(ACTIVE_PROFILE_KEY);
}

function setActiveProfileId(profileId) {
  localStorage.setItem(ACTIVE_PROFILE_KEY, String(profileId));
}

async function fetchProfiles() {
  const response = await fetch(`${API_BASE}/api/profiles`, {
    credentials: "include"
  });

  const data = await response.json();
  console.log("fetchProfiles response:", response.status, data);
  return data;
}

async function createProfile(name) {
  const response = await fetch(`${API_BASE}/api/profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name })
  });
  return await response.json();
}

async function renameProfile(profileId, name) {
  const response = await fetch(`${API_BASE}/api/profiles/${profileId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name })
  });
  return await response.json();
}

async function removeProfile(profileId) {
  const response = await fetch(`${API_BASE}/api/profiles/${profileId}`, {
    method: "DELETE",
    credentials: "include"
  });
  return await response.json();
}

let profilesCache = [];

async function populateProfileSelect() {
  if (!profileSelect) return;

  const profiles = await fetchProfiles();

  if (!Array.isArray(profiles)) {
    console.error("populateProfileSelect expected array, got:", profiles);
    profileSelect.innerHTML = "";
    return;
  }

  profilesCache = profiles;

  let activeProfileId = getActiveProfileId();

  if (!activeProfileId && profiles.length > 0) {
    activeProfileId = String(profiles[0].id);
    setActiveProfileId(activeProfileId);
  }

  profileSelect.innerHTML = "";

  profiles.forEach((profile) => {
    const option = document.createElement("option");
    option.value = profile.id;
    option.textContent = profile.name;
    option.selected = String(profile.id) === String(activeProfileId);
    profileSelect.appendChild(option);
  });
}

async function ensureBackendDefaultProfile() {
  const profiles = await fetchProfiles();

  if (!Array.isArray(profiles) || profiles.length === 0) {
    const created = await createProfile("Profile 1");

    if (created.error) {
      alert(created.error);
      return null;
    }

    setActiveProfileId(created.id);
    return created;
  }

  let activeProfileId = getActiveProfileId();
  const matchingProfile = profiles.find(
    (profile) => String(profile.id) === String(activeProfileId)
  );

  if (!matchingProfile) {
    setActiveProfileId(profiles[0].id);
    return profiles[0];
  }

  return matchingProfile;
}

function setupProfileUI() {
  if (profileListenersInitialized) return;
  profileListenersInitialized = true;

  if (profileSelect) {
    profileSelect.addEventListener("change", async (event) => {
      setActiveProfileId(event.target.value);
      selectedPokemonId = null;
      await init();
    });
  }

  if (newProfileBtn) {
    newProfileBtn.addEventListener("click", async () => {
      const name = prompt("Enter a name for the new profile:");
      if (!name || !name.trim()) return;

      const result = await createProfile(name.trim());
      if (result.error) {
        alert(result.error);
        return;
      }

      setActiveProfileId(result.id);
      selectedPokemonId = null;
      await populateProfileSelect();
      await init();
    });
  }

  if (renameProfileBtn) {
    renameProfileBtn.addEventListener("click", async () => {
      const profileId = getActiveProfileId();
      const current = profilesCache.find(
        (p) => String(p.id) === String(profileId)
      );
      if (!current) return;

      const newName = prompt("Enter a new profile name:", current.name);
      if (!newName || !newName.trim()) return;

      const result = await renameProfile(profileId, newName.trim());
      if (result.error) {
        alert(result.error);
        return;
      }

      await populateProfileSelect();
    });
  }

  if (deleteProfileBtn) {
    deleteProfileBtn.addEventListener("click", async () => {
      const profileId = getActiveProfileId();
      const current = profilesCache.find(
        (p) => String(p.id) === String(profileId)
      );
      if (!current) return;

      if (!confirm(`Delete profile "${current.name}"?`)) return;

      const result = await removeProfile(profileId);
      if (result.error) {
        alert(result.error);
        return;
      }

      const remaining = await fetchProfiles();

      if (remaining.length > 0) {
        setActiveProfileId(remaining[0].id);
      } else {
        localStorage.removeItem(ACTIVE_PROFILE_KEY);
      }

      await populateProfileSelect();
      selectedPokemonId = null;
      await init();
    });
  }
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

let staticListenersInitialized = false;
let profileListenersInitialized = false;
let pokemonData = [];
let selectedPokemonId = null;
let encounterMap = new Map();

async function init() {
  const pokemon = await loadJSON("pokemon.json");
  const allEncounters = await loadAllEncounters();

  encounterMap = buildEncounterMap(allEncounters);

  const basePokemonData = pokemon.map((p) => ({
    ...p,
    types: normalizeTypes(p.types),
    caught: false,
    shiny: false,
    games: getPokemonGames(p.id)
  }));

  const activeProfile = await ensureBackendDefaultProfile();
  await populateProfileSelect();

  if (!activeProfile) {
    pokemonData = basePokemonData;
    loadOwnedSelections([], []);
    applyFilters();
    renderPokemonDetails();
    return;
  }

  const profileData = await fetchProfileData(activeProfile.id);

  if (profileData.error) {
    console.error("Failed to load profile data:", profileData.error);
    pokemonData = basePokemonData;
    loadOwnedSelections([], []);
    applyFilters();
    renderPokemonDetails();
    return;
  }

  const pokemonMap = new Map(
    (profileData.pokemon || []).map((row) => [
      Number(row.pokemon_id),
      {
        caught: !!row.caught,
        shiny: !!row.shiny
      }
    ])
  );

  pokemonData = basePokemonData.map((pokemon) => {
    const saved = pokemonMap.get(Number(pokemon.id));
    return {
      ...pokemon,
      caught: saved ? saved.caught : false,
      shiny: saved ? saved.shiny : false
    };
  });

  loadOwnedSelections(
    profileData.ownedGames || [],
    profileData.ownedConsoles || []
  );

  applyFilters();
  renderPokemonDetails();
}

//localStorage.removeItem("pokemonData");
//localStorage.removeItem("ownedGames");
//localStorage.removeItem("ownedConsoles");

let authSection;
let appSection;
let registerUsername;
let registerPassword;
let registerBtn;
let loginUsername;
let loginPassword;
let loginBtn;
let logoutBtn;
let currentUsername;
let authMessage;
let loggedInSection;

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
let profileSelect;
let newProfileBtn;
let renameProfileBtn;
let deleteProfileBtn;

function setupDOMReferences() {
  authSection = document.getElementById("auth-section");
  appSection = document.getElementById("app-section");
  registerUsername = document.getElementById("registerUsername");
  registerPassword = document.getElementById("registerPassword");
  registerBtn = document.getElementById("registerBtn");
  loginUsername = document.getElementById("loginUsername");
  loginPassword = document.getElementById("loginPassword");
  loginBtn = document.getElementById("loginBtn");
  logoutBtn = document.getElementById("logoutBtn");
  currentUsername = document.getElementById("currentUsername");
  authMessage = document.getElementById("authMessage");
  loggedInSection = document.getElementById("loggedInSection");

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
  profileSelect = document.getElementById("profileSelect");
  newProfileBtn = document.getElementById("newProfileBtn");
  renameProfileBtn = document.getElementById("renameProfileBtn");
  deleteProfileBtn = document.getElementById("deleteProfileBtn");

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

async function saveOwnedSelections() {
  const profileId = getActiveProfileId();
  if (!profileId) return;

  const ownedGames = [
    ...new Set(
      Array.from(ownedGameCheckboxes)
        .filter((cb) => cb.checked)
        .map((cb) => cb.value)
    )
  ];

  const ownedConsoles = [
    ...new Set(
      Array.from(ownedConsoleCheckboxes)
        .filter((cb) => cb.checked)
        .map((cb) => cb.value)
    )
  ];

  const gamesResult = await saveOwnedGamesToBackend(profileId, ownedGames);
  if (gamesResult.error) {
    alert(gamesResult.error);
    return;
  }

  const consolesResult = await saveOwnedConsolesToBackend(profileId, ownedConsoles);
  if (consolesResult.error) {
    alert(consolesResult.error);
    return;
  }
}

function loadOwnedSelections(ownedGames = [], ownedConsoles = []) {
  ownedGameCheckboxes.forEach((checkbox) => {
    checkbox.checked = ownedGames.includes(checkbox.value);
  });

  ownedConsoleCheckboxes.forEach((checkbox) => {
    checkbox.checked = ownedConsoles.includes(checkbox.value);
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
      <button type="button" class="shiny-button ${pokemon.shiny ? "shiny-active" : ""}" data-id="${pokemon.id}">
        ${pokemon.shiny ? "✨" : "☆"}
      </button>
      <div class="sprite-container">
        <img src="${getSpriteUrl(pokemon.id)}" alt="${pokemon.name}">
      </div>
      <div class="pokemon-name">${pokemon.name}</div>
      ${reasonsHTML}
      <button type="button" class="info-button" data-id="${pokemon.id}">ℹ️</button>
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
  const shinyButtons = document.querySelectorAll(".shiny-button");
  const infoButtons = document.querySelectorAll(".info-button");

  pokemonCards.forEach((card) => {
    card.addEventListener("click", async function () {
      const pokemonID = Number(this.dataset.id);
      const pokemon = pokemonData.find((p) => p.id === pokemonID);
      if (!pokemon) return;

      const oldCaught = pokemon.caught;
      pokemon.caught = !pokemon.caught;

      applyFilters();
      renderPokemonDetails();

      const profileId = getActiveProfileId();
      if (!profileId) return;

      const result = await savePokemonStatus(
        profileId,
        pokemonID,
        pokemon.caught,
        pokemon.shiny
      );

      if (result.error) {
        pokemon.caught = oldCaught;
        applyFilters();
        renderPokemonDetails();
        alert(result.error);
      }
    });
  });

  shinyButtons.forEach((button) => {
    button.addEventListener("click", async function (event) {
      event.stopPropagation();

      const pokemonID = Number(this.dataset.id);
      const pokemon = pokemonData.find((p) => p.id === pokemonID);
      if (!pokemon) return;

      const oldShiny = pokemon.shiny;
      pokemon.shiny = !pokemon.shiny;

      applyFilters();
      renderPokemonDetails();

      const profileId = getActiveProfileId();
      if (!profileId) return;

      const result = await savePokemonStatus(
        profileId,
        pokemonID,
        pokemon.caught,
        pokemon.shiny
      );

      if (result.error) {
        pokemon.shiny = oldShiny;
        applyFilters();
        renderPokemonDetails();
        alert(result.error);
      }
    });
  });

  infoButtons.forEach((button) => {
  button.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();

    selectedPokemonId = Number(this.dataset.id);
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
  if (staticListenersInitialized) return;
  staticListenersInitialized = true;

  clearFiltersBtn.addEventListener("click", () => {
    searchInput.value = "";
    filterSelect.value = "all";

    regionCheckboxes.forEach((cb) => (cb.checked = false));
    typeCheckboxes.forEach((cb) => (cb.checked = false));

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
    checkbox.addEventListener("change", async () => {
      applyFilters();
      await saveOwnedSelections();
    });
  });

  ownedGameCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", async () => {
      applyFilters();
      await saveOwnedSelections();
    });
  });
}

//#########################################
//############### Backend #################
//#########################################

const API_BASE = "";

function setAuthMessage(message, isError = false) {
  if (!authMessage) return;
  authMessage.textContent = message;
  authMessage.style.color = isError ? "red" : "green";
}

function showLoggedOutUI() {
  if (appSection) appSection.style.display = "none";
  if (loggedInSection) loggedInSection.style.display = "none";
}

function showLoggedInUI(username) {
  if (appSection) appSection.style.display = "block";
  if (loggedInSection) loggedInSection.style.display = "block";
  if (currentUsername) currentUsername.textContent = username;
}

async function registerAccount(username, password) {
  const response = await fetch(`${API_BASE}/api/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify({ username, password })
  });

  return await response.json();
}

async function loginAccount(username, password) {
  const response = await fetch(`${API_BASE}/api/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify({ username, password })
  });

  return await response.json();
}

async function logoutAccount() {
  const response = await fetch(`${API_BASE}/api/logout`, {
    method: "POST",
    credentials: "include"
  });

  return await response.json();
}

async function fetchCurrentUser() {
  const response = await fetch(`${API_BASE}/api/me`, {
    credentials: "include"
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.user;
}

async function fetchProfileData(profileId) {
  const response = await fetch(`${API_BASE}/api/profiles/${profileId}/data`, {
    credentials: "include"
  });

  const data = await response.json();
  console.log("fetchProfileData response:", response.status, data);
  return data;
}

async function savePokemonStatus(profileId, pokemonId, caught, shiny) {
  const response = await fetch(`${API_BASE}/api/profiles/${profileId}/pokemon/${pokemonId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify({ caught, shiny })
  });

  return await response.json();
}

async function saveOwnedGamesToBackend(profileId, ownedGames) {
  const response = await fetch(`${API_BASE}/api/profiles/${profileId}/owned-games`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify({ ownedGames })
  });

  return await response.json();
}

async function saveOwnedConsolesToBackend(profileId, ownedConsoles) {
  const response = await fetch(`${API_BASE}/api/profiles/${profileId}/owned-consoles`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify({ ownedConsoles })
  });

  return await response.json();
}

function setupAuthEventListeners() {
  if (registerBtn) {
    registerBtn.addEventListener("click", async () => {
      const username = registerUsername.value.trim();
      const password = registerPassword.value.trim();

      if (!username || !password) {
        setAuthMessage("Enter a username and password.", true);
        return;
      }

      const result = await registerAccount(username, password);

      if (result.error) {
        setAuthMessage(result.error, true);
        return;
      }

      setAuthMessage("Registered and logged in.");

      const me = await fetchCurrentUser();
      if (!me) {
        setAuthMessage("Registered, but session was not available.", true);
        return;
      }

      showLoggedInUI(me.username);

      await populateProfileSelect();
      setupProfileUI();
      setupStaticEventListeners();
      await init();
    });
  }

  if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
      const username = loginUsername.value.trim();
      const password = loginPassword.value.trim();

      if (!username || !password) {
        setAuthMessage("Enter a username and password.", true);
        return;
      }

      const result = await loginAccount(username, password);

      if (result.error) {
        setAuthMessage(result.error, true);
        return;
      }

      setAuthMessage("Logged in.");

      const me = await fetchCurrentUser();
      if (!me) {
        setAuthMessage("Login worked, but session was not available.", true);
        return;
      }

      showLoggedInUI(me.username);

      await populateProfileSelect();
      setupProfileUI();
      setupStaticEventListeners();
      await init();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      const result = await logoutAccount();

      if (result.error) {
        setAuthMessage(result.error, true);
        return;
      }

      setAuthMessage("Logged out.");
      showLoggedOutUI();
    });
  }
}


window.addEventListener("DOMContentLoaded", async () => {
  setupDOMReferences();
  setupAuthEventListeners();

  const currentUser = await fetchCurrentUser();

  if (!currentUser) {
    showLoggedOutUI();
    return;
  }

  showLoggedInUI(currentUser.username);

  await ensureBackendDefaultProfile();
  await populateProfileSelect();
  setupProfileUI();
  setupStaticEventListeners();
  await init();
});