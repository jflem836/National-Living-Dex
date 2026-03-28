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
    card.className = "pokemon-card";

    card.innerHTML = `
      <div class="pokemon-name">#${pokemon.id} ${pokemon.name}</div>
      <label>
        <input type="checkbox" class="caught-checkbox" data-id="${pokemon.id}" ${pokemon.caught ? "checked" : ""}>
        Caught
      </label>
      <label>
        <input type="checkbox" class="shiny-checkbox" data-id="${pokemon.id}" ${pokemon.shiny ? "checked" : ""}>
        Shiny
      </label>
    `;

    pokemonList.appendChild(card);
  }

  addEventListeners();
  updateCompletion();
}

function addEventListeners() {
  const caughtCheckboxes = document.querySelectorAll(".caught-checkbox");
  const shinyCheckboxes = document.querySelectorAll(".shiny-checkbox");

  caughtCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", function () {
      const pokemonID = Number(this.dataset.id);
      const pokemon = pokemonData.find(p => p.id === pokemonID);
      pokemon.caught = this.checked
      savePokemonData();
      applyFilters();
    });
  });

  shinyCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", function () {
      const pokemonID = Number(this.dataset.id);
      const pokemon = pokemonData.find(p => p.id === pokemonID);
      pokemon.shiny = this.checked
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