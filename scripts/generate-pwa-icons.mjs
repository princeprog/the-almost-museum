import { deflateSync } from "node:zlib";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const outputDirectory = resolve(process.cwd(), "public", "icons");

function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let index = 0; index < 8; index += 1) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function chunk(name, data) {
  const type = Buffer.from(name);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([type, data])));
  return Buffer.concat([length, type, data, checksum]);
}

function makeIcon(size) {
  const pixels = Buffer.alloc((size * 4 + 1) * size);
  const border = Math.round(size * 0.09);
  const archWidth = Math.round(size * 0.52);
  const archStart = Math.round((size - archWidth) / 2);
  const archTop = Math.round(size * 0.29);
  const archBottom = Math.round(size * 0.77);
  const archRadius = Math.round(archWidth / 2);

  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    pixels[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const pixel = row + 1 + x * 4;
      const outer = x < border || y < border || x >= size - border || y >= size - border;
      const aboveArch = y < archTop + archRadius;
      const archCurve = (x - size / 2) ** 2 + (y - (archTop + archRadius)) ** 2 <= archRadius ** 2;
      const insideArch = x >= archStart && x <= archStart + archWidth && y >= archTop && y <= archBottom && (!aboveArch || archCurve);
      const color = outer ? [166, 84, 57] : insideArch ? [41, 41, 36] : [243, 237, 223];
      pixels[pixel] = color[0];
      pixels[pixel + 1] = color[1];
      pixels[pixel + 2] = color[2];
      pixels[pixel + 3] = 255;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(pixels)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

await mkdir(outputDirectory, { recursive: true });
await Promise.all([192, 512].map((size) => writeFile(resolve(outputDirectory, `almost-museum-${size}.png`), makeIcon(size))));
