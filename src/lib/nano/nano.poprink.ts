import { getPlugins } from "./plugins-loader";
import { poprinkConfig } from "../../components/poprink/config.poprink";

export interface NanoProvider {
  key: string;
  name: string;
  enabled: boolean;
  rank: number;
  isDirect?: boolean;
}

const baseProviders: NanoProvider[] = [
  { key: "vidzeeWorks", name: "VidZee", enabled: true, rank: 1, isDirect: true },
];

export const providerList: NanoProvider[] = [
  ...baseProviders,
  ...getPlugins().map((p) => ({
    key: p.key,
    name: p.name,
    enabled: p.enabled,
    rank: p.rank,
    isDirect: p.isDirect,
  })),
  { key: "localFolder", name: "Local Library", enabled: poprinkConfig.features.enableLocalLibrary || false, rank: 0, isDirect: true },
];
