export const RINK_ALIAS_BY_FILE = {
  "dulo.ts": { id: "rink-d01", name: "Rink D01" },
  "icefy.ts": { id: "rink-d02", name: "Rink D02" },
  "kisskh.ts": { id: "kisskh", name: "KissKH" },
  "lookmovie.ts": { id: "rink-d03", name: "Rink D03" },
  "lordflix.ts": { id: "rink-d04", name: "Rink D04" },
  "nemu.ts": { id: "nemu", name: "Nemu", public: true },
  "notorrent.ts": { id: "rink-d05", name: "Rink D05" },
  "peachify-dark.ts": { id: "rink-d06", name: "Rink D06" },
  "peachify-iron.ts": { id: "rink-d07", name: "Rink D07" },
  "streamvault.ts": { id: "rink-d08", name: "Rink D08" },
  "vidapi.ts": { id: "rink-d09", name: "Rink D09" },
  "vidcore.ts": { id: "rink-d10", name: "Rink D10" },
  "videasy.ts": { id: "rink-d11", name: "Rink D11" },
  "vidking.ts": { id: "rink-d12", name: "Rink D12" },
  "vidnest.ts": { id: "rink-d13", name: "Rink D13" },
  "vidrock.ts": { id: "rink-d14", name: "Rink D14" },
  "vidsuper.ts": { id: "rink-d15", name: "Rink D15" },
  "vixsrc.ts": { id: "rink-d16", name: "Rink D16" },
  "xpass.ts": { id: "rink-d17", name: "Rink D17" },
  "yflix.ts": { id: "rink-d18", name: "Rink D18" },
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
