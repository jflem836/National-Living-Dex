const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

// middleware
app.use(express.json());

// create/open database
const db = new sqlite3.Database("./database.db");

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

// test route
app.get("/", (req, res) => {
  res.send("Server running");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});