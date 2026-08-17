export function encodeArticleId(id: string): string {
  const bytes = new TextEncoder().encode(id);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

export function decodeArticleId(encodedId: string): string | null {
  try {
    const padded = padBase64(
      encodedId.replaceAll("-", "+").replaceAll("_", "/"),
    );
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0),
    );

    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

function padBase64(value: string): string {
  const remainder = value.length % 4;

  if (remainder === 0) {
    return value;
  }

  return value + "=".repeat(4 - remainder);
}
