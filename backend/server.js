const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const session = require("express-session");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(
  cors({
    origin: "http://127.0.0.1:5500",
    credentials: true
  })
);

// middleware
app.use(express.json());

app.use(
  session({
    secret: "replace-this-with-a-random-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, sameSite: "lax" }
  })
);



// create/open database
const db = new sqlite3.Database(path.join(__dirname, "database.db"));

// run schema automatically
const schemaPath = path.join(__dirname, "schema.sql");
const schema = fs.readFileSync(schemaPath, "utf-8");

db.exec(schema, (err) => {
  if (err) {
    console.error("Error creating tables:", err);
  } else {
    console.log("Database ready");
  }
});

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

async function fetchProfileData(profileId) {
  const response = await fetch(`${API_BASE}/api/profiles/${profileId}/data`, {
    credentials: "include"
  });
  return await response.json();
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

app.use(express.static(path.join(__dirname, "../frontend")));

// test route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.post("/api/register", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  db.get("SELECT id FROM users WHERE username = ?", [username], async (err, existingUser) => {
    if (err) {
      return res.status(500).json({ error: "Database error." });
    }

    if (existingUser) {
      return res.status(400).json({ error: "Username already exists." });
    }

    try {
      const passwordHash = await bcrypt.hash(password, 10);
      const createdAt = new Date().toISOString();

      db.run(
        "INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)",
        [username, passwordHash, createdAt],
        function (insertErr) {
          if (insertErr) {
            return res.status(500).json({ error: "Failed to create user." });
          }

          req.session.userId = this.lastID;
          req.session.username = username;

          res.json({
            message: "User registered successfully.",
            user: {
              id: this.lastID,
              username
            }
          });
        }
      );
    } catch {
      res.status(500).json({ error: "Failed to hash password." });
    }
  });
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  db.get(
    "SELECT id, username, password_hash FROM users WHERE username = ?",
    [username],
    async (err, user) => {
      if (err) {
        return res.status(500).json({ error: "Database error." });
      }

      if (!user) {
        return res.status(401).json({ error: "Invalid username or password." });
      }

      const matches = await bcrypt.compare(password, user.password_hash);

      if (!matches) {
        return res.status(401).json({ error: "Invalid username or password." });
      }

      req.session.userId = user.id;
      req.session.username = user.username;

      res.json({
        message: "Login successful.",
        user: {
          id: user.id,
          username: user.username
        }
      });
    }
  );
});

app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to log out." });
    }

    res.json({ message: "Logged out successfully." });
  });
});

app.get("/api/me", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not logged in." });
  }

  res.json({
    user: {
      id: req.session.userId,
      username: req.session.username
    }
  });
});

app.get("/api/profiles", requireAuth, (req, res) => {
  db.all(
    "SELECT * FROM profiles WHERE user_id = ?",
    [req.session.userId],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to fetch profiles" });
      }

      res.json(rows);
    }
  );
});

app.post("/api/profiles", requireAuth, (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name required" });
  }

  const now = new Date().toISOString();

  db.run(
    "INSERT INTO profiles (user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
    [req.session.userId, name, now, now],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to create profile" });
      }

      res.json({
        id: this.lastID,
        name
      });
    }
  );
});

app.patch("/api/profiles/:id", requireAuth, (req, res) => {
  const { name } = req.body;
  const profileId = req.params.id;

  db.run(
    "UPDATE profiles SET name = ?, updated_at = ? WHERE id = ? AND user_id = ?",
    [name, new Date().toISOString(), profileId, req.session.userId],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to update profile" });
      }

      res.json({ success: true });
    }
  );
});

app.delete("/api/profiles/:id", requireAuth, (req, res) => {
  const profileId = req.params.id;

  db.run(
    "DELETE FROM profiles WHERE id = ? AND user_id = ?",
    [profileId, req.session.userId],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to delete profile" });
      }

      res.json({ success: true });
    }
  );
});

app.get("/api/profiles/:id/data", requireAuth, (req, res) => {
  const profileId = req.params.id;

  db.get(
    "SELECT id FROM profiles WHERE id = ? AND user_id = ?",
    [profileId, req.session.userId],
    (err, profile) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to verify profile" });
      }

      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      db.all(
        "SELECT pokemon_id, caught, shiny FROM profile_pokemon WHERE profile_id = ?",
        [profileId],
        (pokemonErr, pokemonRows) => {
          if (pokemonErr) {
            console.error(pokemonErr);
            return res.status(500).json({ error: "Failed to load pokemon data" });
          }

          db.all(
            "SELECT game_name FROM profile_owned_games WHERE profile_id = ?",
            [profileId],
            (gamesErr, gameRows) => {
              if (gamesErr) {
                console.error(gamesErr);
                return res.status(500).json({ error: "Failed to load owned games" });
              }

              db.all(
                "SELECT console_name FROM profile_owned_consoles WHERE profile_id = ?",
                [profileId],
                (consolesErr, consoleRows) => {
                  if (consolesErr) {
                    console.error(consolesErr);
                    return res.status(500).json({ error: "Failed to load owned consoles" });
                  }

                  res.json({
                    pokemon: pokemonRows,
                    ownedGames: gameRows.map((row) => row.game_name),
                    ownedConsoles: consoleRows.map((row) => row.console_name)
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

app.put("/api/profiles/:id/pokemon/:pokemonId", requireAuth, (req, res) => {
  const profileId = req.params.id;
  const pokemonId = Number(req.params.pokemonId);
  const { caught, shiny } = req.body;
  const now = new Date().toISOString();

  db.get(
    "SELECT id FROM profiles WHERE id = ? AND user_id = ?",
    [profileId, req.session.userId],
    (err, profile) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to verify profile" });
      }

      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      db.run(
        `INSERT INTO profile_pokemon (profile_id, pokemon_id, caught, shiny, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(profile_id, pokemon_id)
         DO UPDATE SET
           caught = excluded.caught,
           shiny = excluded.shiny,
           updated_at = excluded.updated_at`,
        [profileId, pokemonId, caught ? 1 : 0, shiny ? 1 : 0, now],
        function (saveErr) {
          if (saveErr) {
            console.error(saveErr);
            return res.status(500).json({ error: "Failed to save pokemon data" });
          }

          res.json({ success: true });
        }
      );
    }
  );
});

app.put("/api/profiles/:id/owned-games", requireAuth, (req, res) => {
  const profileId = req.params.id;
  const { ownedGames } = req.body;

  db.get(
    "SELECT id FROM profiles WHERE id = ? AND user_id = ?",
    [profileId, req.session.userId],
    (err, profile) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to verify profile" });
      }

      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      db.serialize(() => {
        db.run("DELETE FROM profile_owned_games WHERE profile_id = ?", [profileId], (deleteErr) => {
          if (deleteErr) {
            console.error(deleteErr);
            return res.status(500).json({ error: "Failed to clear owned games" });
          }

          if (!Array.isArray(ownedGames) || ownedGames.length === 0) {
            return res.json({ success: true });
          }

          const stmt = db.prepare(
            "INSERT OR IGNORE INTO profile_owned_games (profile_id, game_name) VALUES (?, ?)"
          );

          for (const game of ownedGames) {
            stmt.run(profileId, game);
          }

          stmt.finalize((finalizeErr) => {
            if (finalizeErr) {
              console.error(finalizeErr);
              return res.status(500).json({ error: "Failed to save owned games" });
            }

            res.json({ success: true });
          });
        });
      });
    }
  );
});

app.put("/api/profiles/:id/owned-consoles", requireAuth, (req, res) => {
  const profileId = req.params.id;
  const { ownedConsoles } = req.body;

  db.get(
    "SELECT id FROM profiles WHERE id = ? AND user_id = ?",
    [profileId, req.session.userId],
    (err, profile) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to verify profile" });
      }

      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      db.serialize(() => {
        db.run("DELETE FROM profile_owned_consoles WHERE profile_id = ?", [profileId], (deleteErr) => {
          if (deleteErr) {
            console.error(deleteErr);
            return res.status(500).json({ error: "Failed to clear owned consoles" });
          }

          if (!Array.isArray(ownedConsoles) || ownedConsoles.length === 0) {
            return res.json({ success: true });
          }

          const stmt = db.prepare(
            "INSERT OR IGNORE INTO profile_owned_consoles (profile_id, console_name) VALUES (?, ?)"
          );

          for (const consoleName of ownedConsoles) {
            stmt.run(profileId, consoleName);
          }

          stmt.finalize((finalizeErr) => {
            if (finalizeErr) {
              console.error(finalizeErr);
              return res.status(500).json({ error: "Failed to save owned consoles" });
            }

            res.json({ success: true });
          });
        });
      });
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

