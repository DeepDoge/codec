import { Codec } from "./codec.ts";

/**
 * LEB128-style variable-length integer encoding.
 *
 * Efficient: small numbers use fewer bytes. Uses 7-bit groups with the MSB
 * as a continuation bit, least-significant groups first (little-endian LEB128).
 *
 * Encoding stops when the remaining value fits in 7 bits (MSB = 0).
 *
 * Constraints: value must be a non-negative safe integer (<= Number.MAX_SAFE_INTEGER).
 */

/**
 * VarInt codec for non-negative integers using LEB128 encoding.
 * Extends Codec<number> so it works with other composite codecs.
 *
 * @example
 * ```ts
 * import { VarIntCodec, VarInt } from "@nomadshiba/codec";
 *
 * // Using singleton instance
 * const b = VarInt.encode(300);  // [0xAC, 0x02]
 * VarInt.decode(b);             // [300, 2]
 *
 * // Creating a new instance
 * const v = new VarIntCodec();
 * v.encode(300);                // [0xAC, 0x02]
 * ```
 */
export class VarIntCodec extends Codec<number> {
  public readonly stride = -1;

  public encode(value: number): Uint8Array<ArrayBuffer> {
    if (value < 0 || !Number.isSafeInteger(value)) {
      throw new RangeError("Value must be a non-negative safe integer");
    }
    const parts: number[] = [];
    while (value > 0x7F) {
      parts.push((value & 0x7F) | 0x80);
      value >>>= 7;
    }
    parts.push(value & 0x7F);
    return new Uint8Array(parts);
  }

  public decode(data: Uint8Array): [number, number] {
    let value = 0;
    let shift = 0;
    let bytesRead = 0;
    for (const byte of data) {
      value |= (byte & 0x7F) << shift;
      bytesRead++;
      if ((byte & 0x80) === 0) {
        if (!Number.isSafeInteger(value)) {
          throw new RangeError(
            "Decoded value exceeds MAX_SAFE_INTEGER",
          );
        }
        return [value, bytesRead];
      }
      shift += 7;
      if (shift > 53) {
        throw new RangeError("VarInt too long for JS safe integer");
      }
    }
    throw new Error("Incomplete VarInt");
  }
}

/** Singleton instance of VarInt codec */
export const VarInt: VarIntCodec = new VarIntCodec();
