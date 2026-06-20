export interface NanoProvider {
  key: string;
  name: string;
  enabled: boolean;
  rank: number;
  isDirect?: boolean;
}

export const providerList: NanoProvider[] = [
  { key: "vidzeeWorks", name: "VidZee", enabled: true, rank: 1, isDirect: true },
];
