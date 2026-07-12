import { shiopaConfig } from "../../components/shiopa/config.shiopa";

export interface NanoProvider {
  key: string;
  name: string;
  enabled: boolean;
  rank: number;
  isDirect?: boolean;
}

const pluginProviders: NanoProvider[] = (shiopaConfig.features.videoPlayer.servers || [])
  .map((server, index) => ({
    key: server.id,
    name: server.name,
    enabled: true,
    rank: index + 1,
    isDirect: true,
  }));

const localProvider: NanoProvider[] = shiopaConfig.features.enableLocalLibrary
  ? [{ key: "localFolder", name: "Local Library", enabled: true, rank: 99, isDirect: true }]
  : [];

export const providerList: NanoProvider[] = [...pluginProviders, ...localProvider];
