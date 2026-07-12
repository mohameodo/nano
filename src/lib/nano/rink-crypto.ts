const RINK_KEY_BYTES = new Uint8Array([
  108, 9, 156, 124, 11, 102, 5, 114, 93, 236, 50, 128, 109, 165, 73, 34,
  201, 210, 228, 39, 255, 0, 51, 132, 128, 128, 209, 250, 180, 237, 125, 39,
]);

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function toBytes(content: string | Uint8Array): Uint8Array {
  if (content instanceof Uint8Array) {
    let isBase64 = content.length > 0;
    for (let i = 0; i < content.length; i++) {
      const b = content[i];
      const ok =
        (b >= 65 && b <= 90) ||
        (b >= 97 && b <= 122) ||
        (b >= 48 && b <= 57) ||
        b === 43 ||
        b === 47 ||
        b === 61 ||
        b === 32 ||
        b === 13 ||
        b === 10 ||
        b === 9;
      if (!ok) {
        isBase64 = false;
        break;
      }
    }
    if (isBase64) {
      const text = new TextDecoder("ascii").decode(content).trim();
      if (/^[A-Za-z0-9+/=\s\r\n]+$/.test(text)) {
        return decodeBase64(text);
      }
    }
    return content;
  }

  const clean = content.trim();
  if (/^[A-Za-z0-9+/=\s\r\n]+$/.test(clean)) {
    return decodeBase64(clean);
  }
  const bytes = new Uint8Array(clean.length);
  for (let i = 0; i < clean.length; i++) bytes[i] = clean.charCodeAt(i) & 0xff;
  return bytes;
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value.replace(/\s+/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function decryptRink(content: string | Uint8Array): Promise<string> {
  const buffer = toBytes(content);
  if (buffer.length < 48) throw new Error("Invalid format");

  const iv = buffer.subarray(0, 16);
  const mac = buffer.subarray(16, 48);
  const ciphertext = buffer.subarray(48);
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("Web Crypto unavailable");

  const hmacKey = await subtle.importKey(
    "raw",
    RINK_KEY_BYTES,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const macOk = await subtle.verify("HMAC", hmacKey, mac, concatBytes(iv, ciphertext));
  if (!macOk) throw new Error("Corrupted signature");

  const aesKey = await subtle.importKey(
    "raw",
    RINK_KEY_BYTES,
    { name: "AES-CBC" },
    false,
    ["decrypt"],
  );
  const plain = await subtle.decrypt({ name: "AES-CBC", iv }, aesKey, ciphertext);
  return new TextDecoder().decode(plain);
}
