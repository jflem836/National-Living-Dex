async function loadJSON(filename) {
  const response = await fetch(filename);

  if (!response.ok) {
    throw new Error(`Failed to load ${filename}`);
  }

  return await response.json();
}

function buildEncounterMap(encounters) {
  const map = new Map();

  for (const encounter of encounters) {
    if (!map.has(encounter.pokemonId)) {
      map.set(encounter.pokemonId, []);
    }

    map.get(encounter.pokemonId).push({
      name: encounter.game,
      console: encounter.console,
      location: encounter.location,
      method: encounter.method || "Unknown"
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

async function loadAllEncounters() {
  const files = await loadJSON("encounters/index.json");
  const encounterArrays = await Promise.all(
    files.map((file) => loadJSON(`encounters/${file}`))
  );
  return encounterArrays.flat();
}

async function init() {
  const pokemon = await loadJSON("pokemon.json");
  const encounters = await loadAllEncounters();

  encounterMap = buildEncounterMap(encounters);

  const savedData = localStorage.getItem("pokemonData");

  if (savedData) {
    pokemonData = JSON.parse(savedData);
  } else {
    pokemonData = pokemon.map((p) => ({
      ...p,
      caught: false,
      shiny: false
    }));
  }

  loadOwnedSelections();
  applyFilters();
}

localStorage.removeItem("pokemonData");
localStorage.removeItem("ownedGames");
localStorage.removeItem("ownedConsoles");
init();

const pokemonList = document.getElementById("pokemon-list");
const completionText = document.getElementById("completion");
const progressText = document.getElementById("progress-text");
const progressFill = document.getElementById("progress-fill");
const searchInput = document.getElementById("search");
const ownedConsoleCheckboxes = document.querySelectorAll(".owned-console");
const ownedGameCheckboxes = document.querySelectorAll(".owned-game");
const filterSelect = document.getElementById("filter");
const clearFiltersBtn = document.getElementById("clear-filters");
const regionCheckboxes = document.querySelectorAll('.region-checkbox');
const typeCheckboxes = document.querySelectorAll('.type-checkbox');
const gameCheckboxes = document.querySelectorAll(".game-checkbox");
const consoleCheckboxes = document.querySelectorAll(".console-checkbox");
const shownCount = document.getElementById("shown-count");
const hiddenCount = document.getElementById("hidden-count");
const totalCount = document.getElementById("total-count");
const unavailablePokemonList = document.getElementById("unavailable-pokemon-list");
const obtainableProgressText = document.getElementById("obtainable-progress-text");
const obtainableProgressFill = document.getElementById("obtainable-progress-fill");

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
  container.innerHTML = "";

  for (let i = 0; i < pokemonArray.length; i++) {
    const pokemon = pokemonArray[i];

    const card = document.createElement("div");
    const reasonsHTML = pokemon.unavailableReasons && pokemon.unavailableReasons.length > 0
    ? `<div class="unavailable-reasons">${pokemon.unavailableReasons.join(", ")}</div>` : "";
    card.className = `pokemon-card ${pokemon.caught ? "caught" : ""} ${pokemon.id === selectedPokemonId ? "selected" : ""}`;
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

  if (selectedPokemonId === null) {
    detailsContainer.innerHTML = `<p>Select a Pokémon's info button to see details.</p>`;
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
      <p><strong>Types:</strong> ${pokemon.types.join(", ")}</p>
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

clearFiltersBtn.addEventListener("click", () => {
  searchInput.value = "";
  filterSelect.value = "all";

  regionCheckboxes.forEach(cb => cb.checked = false);
  typeCheckboxes.forEach(cb => cb.checked = false);

  applyFilters();
});

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