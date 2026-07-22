export const RINK_ALIAS_BY_FILE = {
  "dulo.ts": { id: "haru", name: "Haru" },
  "icefy.ts": { id: "sora", name: "Sora" },
  "kisskh.ts": { id: "suzu", name: "Suzu" },
  "lookmovie.ts": { id: "yuki", name: "Yuki" },
  "lordflix.ts": { id: "aoi", name: "Aoi" },
  "nemu.ts": { id: "itsuki", name: "Itsuki" },
  "notorrent.ts": { id: "ren", name: "Ren" },
  "peachify-dark.ts": { id: "nagi", name: "Nagi" },
  "peachify-iron.ts": { id: "kaede", name: "Kaede" },
  "streamvault.ts": { id: "rei", name: "Rei", public: true },
  "vidapi.ts": { id: "hina", name: "Hina" },
  "vidcore.ts": { id: "riku", name: "Riku" },
  "yflix.ts": { id: "kaze", name: "Kaze" },
  "vidking.ts": { id: "noa", name: "Noa" },
  "vidnest.ts": { id: "akari", name: "Akari" },
  "vidrock.ts": { id: "yume", name: "Yume", public: true },
  "vidsuper.ts": { id: "hana", name: "Hana" },
  "cineby.ts": { id: "momo", name: "Momo" },
  "xpass.ts": { id: "tsuki", name: "Tsuki" },
  "vidfast.ts": { id: "shiopa", name: "Shiopa", public: true },
  "vidcodin.ts": { id: "var", name: "Var", public: true },
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
