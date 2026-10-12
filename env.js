// Loads .env into process.env using Node's built-in loader (Node 20.12+).
// Variables already set in the environment win; a missing .env is fine (CI).
try {
  process.loadEnvFile();
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
