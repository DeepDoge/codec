import { Codec } from "./codec.ts";
import { VarInt } from "./varint.ts";

/**
 * Options for Str codec.
 */
export type StringOptions = {
	/** Codec for encoding the length prefix. Default is varint. */
	lengthCodec?: Codec<number>;
};

/**
 * Codec for UTF-8 encoded strings.
 * Variable length. Encoded with a length prefix (varint by default).
 *
 * @example
 * ```ts
 * // Default: varint length prefix
 * const raw = str.encode("hi");       // [0x02, 0x68, 0x69]
 * str.decode(raw);                    // ["hi", 3]
 *
 * // Custom length codec (e.g., u32 for fixed 4-byte length)
 * import { u32 } from "./primitives.ts";
 * const strU32 = new Str({ lengthCodec: u32 });
 * ```
 */
export class StringCodec extends Codec<string> {
	public readonly stride = -1;
	readonly #lengthCodec: Codec<number>;
	readonly #encoder = new TextEncoder();
	readonly #decoder = new TextDecoder();

	constructor(options?: StringOptions) {
		super();
		this.#lengthCodec = options?.lengthCodec ?? VarInt;
	}

	public encode(value: string): Uint8Array {
		const utf8 = this.#encoder.encode(value);
		const lengthPrefix = this.#lengthCodec.encode(utf8.length);
		const result = new Uint8Array(lengthPrefix.length + utf8.length);
		result.set(lengthPrefix, 0);
		result.set(utf8, lengthPrefix.length);
		return result;
	}

	public decode(data: Uint8Array): [string, number] {
		const [length, bytesRead] = this.#lengthCodec.decode(data);
		const utf8 = data.subarray(bytesRead, bytesRead + length);
		const decoded = this.#decoder.decode(utf8);
		return [decoded, bytesRead + length];
	}
}

/**
 * Options for Bytes codec.
 */
export type BytesOptions = {
	/** Codec for encoding the length prefix when size is -1. Default is varint. */
	lengthCodec?: Codec<number>;
};

/**
 * Codec for raw byte arrays.
 * If size is specified (>= 0), fixed length without prefix.
 * If size is -1 (default), variable length with length prefix (varint by default).
 *
 * @example
 * ```ts
 * // Variable-length bytes (uses varint for length by default)
 * const b = bytes.encode(new Uint8Array([1,2,3])); // [0x03, 0x01, 0x02, 0x03]
 * bytes.decode(b);                                  // [Uint8Array([1,2,3]), 4]
 *
 * // Fixed-length bytes
 * const fixed4 = new Bytes(4);
 * fixed4.encode(new Uint8Array([1,2,3,4]));         // [0x01, 0x02, 0x03, 0x04]
 *
 * // Custom length codec
 * import { u32 } from "./primitives.ts";
 * const bytesU32 = new Bytes({ lengthCodec: u32 });
 * ```
 */
export class BytesCodec extends Codec<Uint8Array> {
	public readonly stride: number;
	readonly #lengthCodec: Codec<number>;

	constructor(size: number = -1, options?: BytesOptions) {
		super();
		this.stride = size;
		this.#lengthCodec = options?.lengthCodec ?? VarInt;
	}

	public encode(value: Uint8Array): Uint8Array {
		if (this.stride >= 0) {
			if (value.length !== this.stride) {
				throw new RangeError(
					`Expected byte array of length ${this.stride}, got ${value.length}`,
				);
			}
			return value;
		} else {
			const lengthPrefix = this.#lengthCodec.encode(value.length);
			const result = new Uint8Array(lengthPrefix.length + value.length);
			result.set(lengthPrefix, 0);
			result.set(value, lengthPrefix.length);
			return result;
		}
	}

	public decode(data: Uint8Array): [Uint8Array, number] {
		if (this.stride >= 0) {
			if (data.length < this.stride) {
				throw new RangeError(
					`Expected at least ${this.stride} bytes, got ${data.length}`,
				);
			}
			return [data.subarray(0, this.stride), this.stride];
		} else {
			const [length, bytesRead] = this.#lengthCodec.decode(data);
			const decoded = data.subarray(bytesRead, bytesRead + length);
			return [decoded, bytesRead + length];
		}
	}
}
