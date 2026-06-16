import { Codec, type Stride } from "../codec.ts";
import { VarInt } from "../varint.ts";

/**
 * Options controlling how {@link StringCodec} frames a string.
 *
 * Exactly one of the two shapes must be used:
 * - **Fixed** — supply `size` to encode/decode a constant number of UTF-8
 *   bytes with no length prefix.
 * - **Variable** — supply `sizer` (a `Codec<number>`) to write a length prefix
 *   before the payload. Defaults to {@link VarInt} when neither option is given.
 *
 * @example Fixed 36-byte UUID string
 * ```ts
 * const UUIDStr = new StringCodec({ size: 36 });
 * ```
 *
 * @example Variable-length with a custom sizer
 * ```ts
 * import { UInt32BE } from "../int.ts";
 * const LongStr = new StringCodec({ sizer: UInt32BE });
 * ```
 */
export type StringOptions =
	| {
		size: number;
		sizer?: undefined;
	}
	| {
		sizer: Codec<number>;
		size?: undefined;
	};

/**
 * Codec for UTF-8 encoded strings.
 *
 * Supports two framing modes determined by the type parameter `O`:
 *
 * - **Fixed** (`O extends { size: number }`) — encodes/decodes exactly
 *   `options.size` UTF-8 bytes. No length prefix is written; `stride` is
 *   `"fixed"`. Throws if the UTF-8 byte length of the string does not match.
 * - **Variable** (default / `O` is `undefined` or `{ sizer }`) — prefixes the
 *   payload with its UTF-8 byte-length encoded by `sizer` (defaults to
 *   {@link VarInt}). `stride` is `"variable"`.
 *
 * @typeParam O - The {@link StringOptions} shape that selects fixed vs. variable
 *   framing, inferred from the constructor argument.
 *
 * @example Fixed-size codec (no length prefix)
 * ```ts
 * const UUIDStr = new StringCodec({ size: 36 });
 * const encoded = UUIDStr.encode("018f1234-5678-7abc-9def-0123456789ab");
 * const [decoded, consumed] = UUIDStr.decode(encoded);
 * // decoded.length === 36, consumed === 36
 * ```
 *
 * @example Variable-length codec (VarInt length prefix)
 * ```ts
 * const encoded = Str.encode("hello");
 * const [decoded, consumed] = Str.decode(encoded);
 * // decoded === "hello", consumed === 6
 * ```
 */
export class StringCodec<const O extends StringOptions | undefined = undefined> extends Codec<string> {
	/**
	 * Describes the memory layout of encoded values.
	 *
	 * - `Stride<"fixed">` when constructed with `{ size: N }`.
	 * - `Stride<"variable">` otherwise.
	 */
	public readonly stride: O extends { size: number } ? Stride<"fixed"> : Stride<"variable">;

	/**
	 * The codec used to encode/decode the UTF-8 byte-length prefix in variable
	 * mode. Defaults to {@link VarInt}. Unused in fixed-size mode.
	 */
	public readonly sizer: Codec<number>;

	readonly #encoder = new TextEncoder();
	readonly #decoder = new TextDecoder();

	constructor(options?: O) {
		super();
		this.stride = (options?.size !== undefined ? { kind: "fixed", size: options.size } : { kind: "variable" }) as typeof this.stride;
		this.sizer = options?.sizer ?? VarInt;
	}

	/**
	 * Encodes a JavaScript string to its wire representation.
	 *
	 * - **Fixed mode** — UTF-8 encodes `value` and copies it verbatim; throws
	 *   if the resulting byte length does not equal `options.size`.
	 * - **Variable mode** — prepends the UTF-8 byte-length of `value` using
	 *   `this.sizer`, then appends the UTF-8 bytes.
	 *
	 * @param value - The string to encode.
	 * @param target - Optional pre-allocated buffer to write into. Must be
	 *   large enough to hold the result; surplus bytes are left unchanged.
	 *   A new `Uint8Array` is allocated when omitted.
	 * @returns The encoded bytes (either `target` or a newly allocated buffer).
	 * @throws {RangeError} In fixed mode, if the UTF-8 byte length of `value`
	 *   does not equal `options.size`.
	 *
	 * @example
	 * ```ts
	 * const codec = new StringCodec({ size: 5 });
	 * codec.encode("hello"); // Uint8Array [0x68, 0x65, 0x6c, 0x6c, 0x6f]
	 * codec.encode("hi");    // throws RangeError
	 * ```
	 */
	public encode(value: string, target?: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
		const utf8 = this.#encoder.encode(value);

		if (this.stride.kind === "fixed") {
			if (utf8.length !== this.stride.size) {
				throw new RangeError(
					`Expected UTF-8 byte length of ${this.stride.size}, got ${utf8.length}`,
				);
			}
			const result = target ?? new Uint8Array(this.stride.size);
			result.set(utf8);
			return result;
		}

		const lengthPrefix = this.sizer.encode(utf8.length);
		const totalLen = lengthPrefix.length + utf8.length;
		const result = target ?? new Uint8Array(totalLen);
		result.set(lengthPrefix, 0);
		result.set(utf8, lengthPrefix.length);
		return result;
	}

	/**
	 * Decodes a string from the beginning of `data`.
	 *
	 * - **Fixed mode** — reads exactly `options.size` bytes and UTF-8 decodes
	 *   them. Returns a zero-copy subarray view into `data`.
	 * - **Variable mode** — reads the byte-length prefix via `this.sizer`,
	 *   then UTF-8 decodes the following `length` bytes.
	 *
	 * @param data - Source buffer to read from. May contain trailing bytes
	 *   beyond the encoded value; they are ignored.
	 * @returns A tuple `[value, consumed]` where `value` is the decoded string
	 *   and `consumed` is the total number of bytes read (prefix + payload).
	 * @throws {RangeError} In fixed mode, if `data.length < options.size`.
	 *
	 * @example
	 * ```ts
	 * const codec = new StringCodec({ size: 2 });
	 * const [str, n] = codec.decode(new Uint8Array([0x68, 0x69, 0xff]));
	 * // str === "hi", n === 2
	 * ```
	 */
	public decode(data: Uint8Array): [string, number] {
		if (this.stride.kind === "fixed") {
			if (data.length < this.stride.size) {
				throw new RangeError(
					`Expected at least ${this.stride.size} bytes, got ${data.length}`,
				);
			}
			return [this.#decoder.decode(data.subarray(0, this.stride.size)), this.stride.size];
		}

		const [length, bytesRead] = this.sizer.decode(data);
		const utf8 = data.subarray(bytesRead, bytesRead + length);
		return [this.#decoder.decode(utf8), bytesRead + length];
	}
}

/**
 * Default UTF-8 string codec using {@link VarInt} as the length prefix sizer.
 *
 * Equivalent to `new StringCodec()`. Use this singleton for the common case
 * of encoding arbitrary strings without a fixed size constraint.
 *
 * @example
 * ```ts
 * import { Str } from "./string.ts";
 *
 * const bytes = Str.encode("hello");
 * const [text, n] = Str.decode(bytes);
 * // text === "hello", n === 6
 * ```
 */
export const Str: StringCodec<undefined> = new StringCodec();
