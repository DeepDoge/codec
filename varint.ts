import { Codec } from "./codec.ts";

/**
 * Codec for non-negative integers using unsigned LEB128 encoding.
 *
 * Each byte stores 7 bits of the value in its low bits. The most-significant
 * bit (`0x80`) is a continuation flag: if set, more bytes follow. Groups are
 * stored least-significant first (little-endian base-128).
 *
 * Size by value:
 * - `0`–`127`        → 1 byte
 * - `128`–`16 383`   → 2 bytes
 * - `16 384`–`2 097 151` → 3 bytes
 * - …up to 8 bytes for values near `Number.MAX_SAFE_INTEGER`
 *
 * @example
 * ```ts
 * import { VarInt, VarIntCodec } from "@nomadshiba/codec";
 *
 * // Using the pre-built singleton
 * const b = VarInt.encode(300);  // Uint8Array [0xAC, 0x02]
 * VarInt.decode(b);              // [300, 2]
 *
 * // Creating a new instance
 * const v = new VarIntCodec();
 * v.encode(127);   // Uint8Array [0x7F]  (1 byte)
 * v.encode(128);   // Uint8Array [0x80, 0x01] (2 bytes)
 * ```
 */
export class VarIntCodec extends Codec<number> {
  /** Always `-1`; VarInt is variable-length. */
  public readonly stride = -1;

  /**
   * Encode a non-negative integer using unsigned LEB128.
   *
   * @param value - A non-negative safe integer (`0 ≤ value ≤ Number.MAX_SAFE_INTEGER`).
   * @param target - Optional pre-allocated buffer. When supplied the bytes are
   *   written at offset 0 and the same buffer is returned.
   * @returns A `Uint8Array<ArrayBuffer>` containing the LEB128 encoding.
   * @throws {RangeError} If `value` is negative or not a safe integer.
   */
  public encode(
    value: number,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    if (value < 0 || !Number.isSafeInteger(value)) {
      throw new RangeError("Value must be a non-negative safe integer");
    }
    const parts: number[] = [];
    while (value > 0x7F) {
      parts.push((value & 0x7F) | 0x80);
      value >>>= 7;
    }
    parts.push(value & 0x7F);

    const result = target ?? new Uint8Array(parts.length);
    result.set(parts);
    return result;
  }

  /**
   * Decode a LEB128-encoded integer from the start of `data`.
   *
   * @param data - Binary data. Only the leading LEB128 bytes are consumed.
   * @returns `[value, bytesConsumed]`.
   * @throws {RangeError} If the decoded value exceeds `Number.MAX_SAFE_INTEGER`
   *   or if the encoding is longer than 8 bytes.
   * @throws {Error} If `data` ends before the final byte (no byte with MSB `0`).
   */
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

/**
 * Pre-built singleton instance of {@link VarIntCodec}.
 *
 * This is the default length/count codec used throughout the library for
 * variable-length types (`StringCodec`, `BytesCodec`, `ArrayCodec`,
 * `MappingCodec`).
 */
export const VarInt: VarIntCodec = new VarIntCodec();
