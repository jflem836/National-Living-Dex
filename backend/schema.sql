CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS profile_pokemon (
  profile_id INTEGER NOT NULL,
  pokemon_id INTEGER NOT NULL,
  caught INTEGER NOT NULL DEFAULT 0,
  shiny INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (profile_id, pokemon_id),
  FOREIGN KEY (profile_id) REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS profile_owned_games (
  profile_id INTEGER NOT NULL,
  game_name TEXT NOT NULL,
  PRIMARY KEY (profile_id, game_name),
  FOREIGN KEY (profile_id) REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS profile_owned_consoles (
  profile_id INTEGER NOT NULL,
  console_name TEXT NOT NULL,
  PRIMARY KEY (profile_id, console_name),
  FOREIGN KEY (profile_id) REFERENCES profiles(id)
);