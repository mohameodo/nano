// Copy to rink-aliases.private.mjs (gitignored) for local source compiles.
export const RINK_ALIAS_BY_FILE = {
  "your-source.ts": { id: "server-id", name: "Server Name" },
};

export function getAliasForFile(fileName) {
  return RINK_ALIAS_BY_FILE[fileName] || null;
}

export function getPublicCatalogFiles() {
  return Object.entries(RINK_ALIAS_BY_FILE)
    .filter(([, alias]) => alias.public)
    .map(([file]) => file);
}

export function getDisplayNameForId(id) {
  for (const alias of Object.values(RINK_ALIAS_BY_FILE)) {
    if (alias.id === id) return alias.name;
  }
  return null;
}
