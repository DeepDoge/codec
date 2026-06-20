import { Codec, type Stride } from "./codec.ts";

/**
 * Codec for unsigned variable-length integers using the LEB128 encoding scheme.
 *
 * Each byte contributes 7 bits of data; the most-significant bit (MSB) is a
 * continuation flag (`1` = more bytes follow, `0` = final byte). Smaller values
 * occupy fewer bytes:
 *
 * | Value range        | Bytes used |
 * |--------------------|------------|
 * | 0 – 127            | 1          |
 * | 128 – 16383        | 2          |
 * | 16384 – 2097151    | 3          |
 * | …                  | …          |
 *
 * Values must be non-negative safe integers (`0 ≤ value ≤ Number.MAX_SAFE_INTEGER`).
 * The decoded integer is capped at `Number.MAX_SAFE_INTEGER`; exceeding it throws.
 *
 * @example
 * const bytes = VarInt.encode(300); // Uint8Array [0xAC, 0x02]
 * const [val, size] = VarInt.decode(bytes); // [300, 2]
 */
export class VarIntCodec extends Codec<number> {
	/** Variable stride: byte length depends on the encoded value. */
	public readonly stride: Stride<"variable"> = { kind: "variable" };

	/**
	 * Encodes a non-negative safe integer as a variable-length LEB128 byte sequence.
	 *
	 * @param value - Non-negative safe integer (`0 ≤ value ≤ Number.MAX_SAFE_INTEGER`).
	 * @param target - Optional pre-allocated buffer. Must be large enough for the encoded output.
	 * @returns `Uint8Array` containing the LEB128-encoded bytes.
	 * @throws {RangeError} If `value` is negative or not a safe integer.
	 *
	 * @example
	 * VarInt.encode(1)   // Uint8Array [0x01]  — 1 byte
	 * VarInt.encode(128) // Uint8Array [0x80, 0x01] — 2 bytes
	 */
	public encode(value: number): Uint8Array<ArrayBuffer> {
		if (value < 0 || !Number.isSafeInteger(value)) {
			throw new RangeError("Value must be a non-negative safe integer");
		}
		const parts: number[] = [];
		while (value > 0x7F) {
			parts.push((value & 0x7F) | 0x80);
			value = Math.floor(value / 128);
		}
		parts.push(value & 0x7F);
		const result = new Uint8Array(parts.length);
		result.set(parts);
		return result;
	}

	public encodeInto(value: number, target: Uint8Array, offset: number = 0): number {
		if (value < 0 || !Number.isSafeInteger(value)) {
			throw new RangeError("Value must be a non-negative safe integer");
		}
		let i = offset;
		while (value > 0x7F) {
			target[i++] = (value & 0x7F) | 0x80;
			value = Math.floor(value / 128);
		}
		target[i++] = value & 0x7F;
		return i - offset;
	}

	/**
	 * Decodes a variable-length LEB128 integer from the start of `data`.
	 *
	 * Reads bytes until a byte with a clear MSB is encountered (end of varint).
	 * At most 8 bytes are consumed before the 53-bit JS safe-integer limit is
	 * reached; further bytes trigger a `RangeError`.
	 *
	 * @param data - Buffer to read from. Must contain at least one complete varint.
	 * @returns Tuple of `[value, bytesConsumed]`.
	 * @throws {RangeError} If the decoded value exceeds `Number.MAX_SAFE_INTEGER`.
	 * @throws {RangeError} If the varint encoding is longer than 53 bits (corrupt data).
	 * @throws {Error} If `data` ends before a terminating byte is found (`"Incomplete VarInt"`).
	 *
	 * @example
	 * VarInt.decode(new Uint8Array([0x01]))        // [1, 1]
	 * VarInt.decode(new Uint8Array([0x80, 0x01]))  // [128, 2]
	 */
	public decode(data: Uint8Array): [number, number] {
		let value = 0;
		let shift = 0;
		let bytesRead = 0;
		for (const byte of data) {
			value += (byte & 0x7F) * Math.pow(2, shift);
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

/** Singleton {@link VarIntCodec} instance for unsigned variable-length integer encoding. */
export const VarInt: VarIntCodec = new VarIntCodec();
