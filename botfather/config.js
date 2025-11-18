const fs = require("fs");
const path = require("path");

function getConfigPath() {
  if (process.env.CONFIG_PATH) {
    return process.env.CONFIG_PATH;
  }
  
  const configPath = path.join(process.cwd(), "config.json");
  return configPath;
}

const CONFIG_FILE = getConfigPath();

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    // Erro silencioso ao carregar config
  }
  return {};
}

function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
    return true;
  } catch (error) {
    return false;
  }
}

function getBotfatherValues() {
  const config = loadConfig();
  return config.telegram?.bot || {};
}

module.exports = {
  loadConfig,
  saveConfig,
  getBotfatherValues
};
