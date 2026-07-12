export interface StreamSource {
  url: string;
  quality?: string;
  type?: string;
  isM3U8: boolean;
  name?: string;
  headers?: Record<string, string>;
  skipPlayableProbe?: boolean;
}
