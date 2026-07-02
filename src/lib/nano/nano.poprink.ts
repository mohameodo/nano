import { poprinkConfig } from "../../components/poprink/config.poprink";

export interface NanoProvider {
  key: string;
  name: string;
  enabled: boolean;
  rank: number;
  isDirect?: boolean;
}

const pluginProviders: NanoProvider[] = (poprinkConfig.features.videoPlayer.servers || [])
  .map((server, index) => ({
    key: server.id,
    name: server.name,
    enabled: true,
    rank: index + 1,
    isDirect: true,
  }));

const localProvider: NanoProvider[] = poprinkConfig.features.enableLocalLibrary
  ? [{ key: "localFolder", name: "Local Library", enabled: true, rank: 99, isDirect: true }]
  : [];

export const providerList: NanoProvider[] = [...pluginProviders, ...localProvider];
