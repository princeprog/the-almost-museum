import { deflateSync, inflateSync } from "node:zlib";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourcePath = resolve(process.cwd(), "public", "brand", "almost-museum-mark.png");
const outputDirectory = resolve(process.cwd(), "public", "icons");

function paethPredictor(left, above, upperLeft) {
  const estimate = left + above - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const aboveDistance = Math.abs(estimate - above);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
  if (aboveDistance <= upperLeftDistance) return above;
  return upperLeft;
}

function decodePng(buffer) {
  const signature = Buffer.from("89504e470d0a1a0a", "hex");
  if (!buffer.subarray(0, signature.length).equals(signature)) throw new Error("Logo source is not a PNG.");

  let offset = signature.length;
  let width;
  let height;
  let bitDepth;
  let colorType;
  let interlaceMethod;
  const imageData = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const data = buffer.subarray(dataStart, dataEnd);
    offset = dataEnd + 4;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlaceMethod = data[12];
    } else if (type === "IDAT") {
      imageData.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  if (!width || !height || bitDepth !== 8 || colorType !== 6 || interlaceMethod !== 0) {
    throw new Error("Logo source must be a non-interlaced 8-bit RGBA PNG.");
  }

  const bytesPerPixel = 4;
  const rowLength = width * bytesPerPixel;
  const decoded = inflateSync(Buffer.concat(imageData));
  const pixels = Buffer.alloc(width * height * bytesPerPixel);
  let decodedOffset = 0;
  let previousRow = Buffer.alloc(rowLength);

  for (let y = 0; y < height; y += 1) {
    const filterType = decoded[decodedOffset++];
    const row = Buffer.from(decoded.subarray(decodedOffset, decodedOffset + rowLength));
    decodedOffset += rowLength;

    for (let index = 0; index < row.length; index += 1) {
      const left = index >= bytesPerPixel ? row[index - bytesPerPixel] : 0;
      const above = previousRow[index];
      const upperLeft = index >= bytesPerPixel ? previousRow[index - bytesPerPixel] : 0;
      const predictor = filterType === 0
        ? 0
        : filterType === 1
          ? left
          : filterType === 2
            ? above
            : filterType === 3
              ? Math.floor((left + above) / 2)
              : filterType === 4
                ? paethPredictor(left, above, upperLeft)
                : null;
      if (predictor === null) throw new Error(`Unsupported PNG filter type: ${filterType}`);
      row[index] = (row[index] + predictor) & 0xff;
    }

    row.copy(pixels, y * rowLength);
    previousRow = row;
  }

  return { height, pixels, width };
}

function resizeRgba(source, size) {
  const pixels = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    const sourceY = (y + 0.5) * source.height / size - 0.5;
    const top = Math.max(0, Math.floor(sourceY));
    const bottom = Math.min(source.height - 1, top + 1);
    const yWeight = Math.max(0, Math.min(1, sourceY - top));

    for (let x = 0; x < size; x += 1) {
      const sourceX = (x + 0.5) * source.width / size - 0.5;
      const left = Math.max(0, Math.floor(sourceX));
      const right = Math.min(source.width - 1, left + 1);
      const xWeight = Math.max(0, Math.min(1, sourceX - left));
      const outputOffset = (y * size + x) * 4;

      for (let channel = 0; channel < 4; channel += 1) {
        const topLeft = source.pixels[(top * source.width + left) * 4 + channel];
        const topRight = source.pixels[(top * source.width + right) * 4 + channel];
        const bottomLeft = source.pixels[(bottom * source.width + left) * 4 + channel];
        const bottomRight = source.pixels[(bottom * source.width + right) * 4 + channel];
        const topValue = topLeft + (topRight - topLeft) * xWeight;
        const bottomValue = bottomLeft + (bottomRight - bottomLeft) * xWeight;
        pixels[outputOffset + channel] = Math.round(topValue + (bottomValue - topValue) * yWeight);
      }
    }
  }

  return pixels;
}

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

function encodePng(size, rgba) {
  const pixels = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    pixels[row] = 0;
    rgba.copy(pixels, row + 1, y * size * 4, (y + 1) * size * 4);
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

const source = decodePng(await readFile(sourcePath));
await mkdir(outputDirectory, { recursive: true });
await Promise.all(
  [192, 512].map((size) => writeFile(resolve(outputDirectory, `almost-museum-${size}.png`), encodePng(size, resizeRgba(source, size)))),
);
