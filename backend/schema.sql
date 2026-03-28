CREATE TABLE profile_pokemon (
  profile_id INTEGER NOT NULL,
  pokemon_id INTEGER NOT NULL,
  caught INTEGER NOT NULL DEFAULT 0,
  shiny INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (profile_id, pokemon_id),
  FOREIGN KEY (profile_id) REFERENCES profiles(id)
);

CREATE TABLE profile_owned_games (
  profile_id INTEGER NOT NULL,
  game_name TEXT NOT NULL,
  PRIMARY KEY (profile_id, game_name),
  FOREIGN KEY (profile_id) REFERENCES profiles(id)
);

CREATE TABLE profile_owned_consoles (
  profile_id INTEGER NOT NULL,
  console_name TEXT NOT NULL,
  PRIMARY KEY (profile_id, console_name),
  FOREIGN KEY (profile_id) REFERENCES profiles(id)
);