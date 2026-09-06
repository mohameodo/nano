export const RINK_ALIAS_BY_FILE = {};

const SERVER_NAMES = {
  shiopa: "Shiopa",
  suzu: "Suzu",
};

export function getAliasForFile() {
  return null;
}

export function getPublicCatalogFiles() {
  return [];
}

export function getDisplayNameForId(id) {
  return SERVER_NAMES[id] || null;
}
