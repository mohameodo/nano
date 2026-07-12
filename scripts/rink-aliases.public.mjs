export const RINK_ALIAS_BY_FILE = {};

const SERVER_NAMES = {
  rei: "Rei",
  shiopa: "Shiopa",
  yume: "Yume",
  itsuki: "Itsuki",
  tsuki: "Tsuki",
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
