async function loadDefaultPokemon() {
    const response = await fetch("pokemon.json");
    const data = await response.json();
    return data;
}

let pokemonData = [];
let selectedPokemonId = null;

async function init() {
  const defaultData = await loadDefaultPokemon();

  const savedData = localStorage.getItem("pokemonData");

  if (savedData) {
    pokemonData = JSON.parse(savedData);
  } else {
    pokemonData = defaultData;
  }

  console.log(pokemonData);
  applyFilters();
}

//localStorage.removeItem("pokemonData");
init();

const pokemonList = document.getElementById("pokemon-list");
const completionText = document.getElementById("completion");
const searchInput = document.getElementById("search");
const filterSelect = document.getElementById("filter");
const clearFiltersBtn = document.getElementById("clear-filters");
const regionCheckboxes = document.querySelectorAll('.region-checkbox');
const typeCheckboxes = document.querySelectorAll('.type-checkbox');
const gameCheckboxes = document.querySelectorAll(".game-checkbox");

function savePokemonData() {
  localStorage.setItem("pokemonData", JSON.stringify(pokemonData));
}

function renderPokemon(pokemonArray) {
  pokemonList.innerHTML = "";

  for (let i = 0; i < pokemonArray.length; i++) {
    const pokemon = pokemonArray[i];

    const card = document.createElement("div");
    card.className = `pokemon-card ${pokemon.caught ? "caught" : ""}`;
    card.dataset.id = pokemon.id;

    card.innerHTML = `
      <div class="dex-number">#${pokemon.id}</div>
      <button class="shiny-button ${pokemon.shiny ? "shiny-active" : ""}" data-id="${pokemon.id}">
        ${pokemon.shiny ? "✨" : "☆"}
      </button>
      <div class="sprite-container">
        <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png" alt="${pokemon.name}">
      </div>
      <div class="pokemon-name">${pokemon.name}</div>
      <button class="info-button" data-id="${pokemon.id}">ℹ️</button>
    `;

    pokemonList.appendChild(card);
  }

  addEventListeners();
  updateCompletion();
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

  let gamesHTML = "";

  if (pokemon.games && pokemon.games.length > 0) {
    for (let i = 0; i < pokemon.games.length; i++) {
      const game = pokemon.games[i];
      gamesHTML += `
        <li class="game-entry">
          <strong>${game.name}</strong><br>
          <span class="game-console">${game.console}</span><br>
          <span class="game-location">${game.location}</span>
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
        src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png" 
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
  gameCheckboxes.forEach(cb => cb.checked = false);

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

function applyFilters(){
    const searchText = searchInput.value.toLowerCase();
    const selectedFilter = filterSelect.value;
    const selectedRegions = Array.from(regionCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
    const selectedTypes = Array.from(typeCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
    const selectedGames = Array.from(gameCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    let filtered = pokemonData;

    filtered = filtered.filter((pokemon) => pokemon.name.toLowerCase().includes(searchText));
    if (selectedFilter === "caught") {
        filtered = filtered.filter((pokemon) => pokemon.caught);
    } else if (selectedFilter === "not-caught") {
        filtered = filtered.filter((pokemon) => !pokemon.caught);
    } else if (selectedFilter === "shiny") {
        filtered = filtered.filter((pokemon) => pokemon.shiny);
    }
    if (selectedRegions.length > 0) {
        filtered = filtered.filter((pokemon) => selectedRegions.includes(pokemon.region));
    }
    if (selectedTypes.length > 0) {
        filtered = filtered.filter(pokemon => selectedTypes.some(type => pokemon.types.includes(type)));
    }
    if (selectedGames.length > 0) {
        filtered = filtered.filter((pokemon) => pokemon.games && pokemon.games.some((game) => selectedGames.includes(game.name)));
}

    renderPokemon(filtered);
}

searchInput.addEventListener("input", applyFilters);

filterSelect.addEventListener("change", applyFilters);

regionCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", applyFilters);
});

typeCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", applyFilters);
});

gameCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", applyFilters);
});