import fs from "node:fs";
import crypto from "node:crypto";

const RINK_KEY = (() => {
  const parts = [
    [112, 111, 112, 114, 105, 110, 107],
    [110, 97, 110, 111],
    [115, 101, 99, 117, 114, 101],
    [107, 101, 121],
    [50, 48, 50, 54],
  ];
  const combined = parts.map((p) => String.fromCharCode(...p)).join("-");
  return crypto.scryptSync(combined, "rink-salt-nano-67", 32);
})();

function decryptRinkBuffer(buffer) {
  if (buffer.length < 48) throw new Error("Invalid rink format");
  const iv = buffer.subarray(0, 16);
  const mac = buffer.subarray(16, 48);
  const ciphertext = buffer.subarray(48);
  const hmac = crypto.createHmac("sha256", RINK_KEY);
  hmac.update(iv);
  hmac.update(ciphertext);
  if (!hmac.digest().equals(mac)) throw new Error("Corrupted rink signature");
  const decipher = crypto.createDecipheriv("aes-256-cbc", RINK_KEY, iv);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/** Decrypt .rink at build time into a real ESM module (CF Workers block new Function). */
export function rinkPluginLoader() {
  return {
    name: "rink-plugin-loader",
    enforce: "pre",
    load(id) {
      if (!id.includes(".rink") || !id.includes("?plugin")) return;
      const filePath = id.split("?")[0].replace(/\0.*$/, "");
      const buffer = fs.readFileSync(filePath);
      const code = decryptRinkBuffer(buffer);
      return `
const module = { exports: {} };
const exports = module.exports;
const require = (name) => {
  throw new Error("require is not supported in rink plugins: " + name);
};
${code}
export default module.exports.default || module.exports;
`;
    },
  };
}
