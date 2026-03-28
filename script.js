async function loadDefaultPokemon() {
    const response = await fetch("pokemon.json");
    const data = await response.json();
    return data;
}

let pokemonData = [];

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
const regionFilter = document.getElementById("region-filter");
const typeFilter = document.getElementById("type-filter");

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
    `;

    pokemonList.appendChild(card);
  }

  addEventListeners();
  updateCompletion();
}

function addEventListeners() {
  const pokemonCards = document.querySelectorAll(".pokemon-card");
  const shinyButton = document.querySelectorAll(".shiny-button");

  pokemonCards.forEach((card) => {
    card.addEventListener("click", function () {
      const pokemonID = Number(this.dataset.id);
      const pokemon = pokemonData.find(p => p.id === pokemonID);
      pokemon.caught = !pokemon.caught;
      savePokemonData();
      applyFilters();
    });
  });

  shinyButton.forEach((button) => {
    button.addEventListener("click", function () {
      event.stopPropagation();
      const pokemonID = Number(this.dataset.id);
      const pokemon = pokemonData.find(p => p.id === pokemonID);
      pokemon.shiny = !pokemon.shiny;
      savePokemonData();
      applyFilters();
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

function applyFilters(){
    const searchText = searchInput.value.toLowerCase();
    const selectedFilter = filterSelect.value;
    const selectedRegion = regionFilter.value;
    const selectedType = typeFilter.value;

    let filtered = pokemonData;

    filtered = filtered.filter((pokemon) => pokemon.name.toLowerCase().includes(searchText));
    if (selectedFilter === "caught") {
        filtered = filtered.filter((pokemon) => pokemon.caught);
    } else if (selectedFilter === "shiny") {
        filtered = filtered.filter((pokemon) => pokemon.shiny);
    }
    if (selectedRegion !== "all") {
        filtered = filtered.filter((pokemon) => pokemon.region === selectedRegion);
    }
    if (selectedType !== "all"){
        filtered = filtered.filter((pokemon) => pokemon.types.includes(selectedType));
    }

    renderPokemon(filtered);
}

searchInput.addEventListener("input", applyFilters);

filterSelect.addEventListener("change", applyFilters);

regionFilter.addEventListener("change", applyFilters);

typeFilter.addEventListener("change", applyFilters);