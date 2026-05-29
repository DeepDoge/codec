import { Codec, type Stride } from "../codec.ts";
import { VarInt } from "../varint.ts";

/**
 * Options for constructing a {@link StringCodec}.
 *
 * @example Custom sizer
 * ```ts
 * import { UInt16BE } from "../int.ts";
 * const Str16 = new StringCodec({ sizer: UInt16BE });
 * ```
 */
export type StringOptions = {
	/**
	 * Codec used to encode/decode the UTF-8 byte-length prefix that precedes
	 * the string payload. Defaults to {@link VarInt} when omitted.
	 */
	sizer?: Codec<number>;
};

/**
 * Codec for UTF-8 encoded strings with a variable-length wire format.
 *
 * Wire layout: `[length_prefix][utf8_bytes]`
 *
 * - `length_prefix` — the **byte** length of the UTF-8 representation,
 *   encoded by `sizer` (default: {@link VarInt}).
 * - `utf8_bytes` — the raw UTF-8 bytes of the string.
 *
 * `stride` is always `"variable"` because string byte-lengths differ from
 * their character-lengths for non-ASCII input.
 *
 * @example Basic round-trip
 * ```ts
 * import { Str } from "./string.ts";
 *
 * const encoded = Str.encode("hello");           // [0x05, ...utf8]
 * const [decoded, n] = Str.decode(encoded);
 * // decoded === "hello", n === 6
 * ```
 *
 * @example Multi-byte characters
 * ```ts
 * const encoded = Str.encode("こんにちは");
 * // length prefix reflects 15 UTF-8 bytes, not 5 chars
 * const [decoded] = Str.decode(encoded);
 * // decoded === "こんにちは"
 * ```
 */
export class StringCodec extends Codec<string> {
	/**
	 * Always `{ kind: "variable" }` — string byte-length is not known without
	 * UTF-8 encoding.
	 */
	public readonly stride: Stride<"variable"> = { kind: "variable" };

	/**
	 * Codec used to encode/decode the UTF-8 byte-length prefix.
	 * Defaults to {@link VarInt}.
	 */
	public readonly sizer: Codec<number>;

	readonly #encoder = new TextEncoder();
	readonly #decoder = new TextDecoder();

	constructor(options?: StringOptions) {
		super();
		this.sizer = options?.sizer ?? VarInt;
	}

	/**
	 * Encodes a JavaScript string to its length-prefixed UTF-8 wire form.
	 *
	 * Steps:
	 * 1. UTF-8 encode `value`.
	 * 2. Encode the **byte** length via `this.sizer`.
	 * 3. Write `[length_prefix, utf8_bytes]` into the result buffer.
	 *
	 * @param value - The string to encode.
	 * @param target - Optional pre-allocated buffer. Must hold at least
	 *   `sizer.encode(utf8.length).length + utf8.length` bytes; surplus bytes
	 *   are left unchanged. A new buffer is allocated when omitted.
	 * @returns The encoded bytes (either `target` or a newly allocated buffer).
	 *
	 * @example
	 * ```ts
	 * const codec = new StringCodec();
	 * codec.encode("hi"); // Uint8Array [0x02, 0x68, 0x69]
	 * ```
	 */
	public encode(
		value: string,
		target?: Uint8Array<ArrayBuffer>,
	): Uint8Array<ArrayBuffer> {
		const utf8 = this.#encoder.encode(value);
		const lengthPrefix = this.sizer.encode(utf8.length);
		const totalLen = lengthPrefix.length + utf8.length;

		const result = target ?? new Uint8Array(totalLen);
		result.set(lengthPrefix, 0);
		result.set(utf8, lengthPrefix.length);
		return result;
	}

	/**
	 * Decodes a length-prefixed UTF-8 string from the beginning of `data`.
	 *
	 * Steps:
	 * 1. Read the byte-length prefix via `this.sizer`.
	 * 2. Extract the following `length` bytes as UTF-8.
	 * 3. Decode to a JavaScript string.
	 *
	 * @param data - Source buffer. May contain trailing bytes; they are
	 *   ignored.
	 * @returns A tuple `[value, consumed]` where `value` is the decoded string
	 *   and `consumed` is the total number of bytes read (prefix + UTF-8
	 *   payload).
	 *
	 * @example
	 * ```ts
	 * const codec = new StringCodec();
	 * const [str, n] = codec.decode(new Uint8Array([0x02, 0x68, 0x69, 0xff]));
	 * // str === "hi", n === 3
	 * ```
	 */
	public decode(data: Uint8Array): [string, number] {
		const [length, bytesRead] = this.sizer.decode(data);
		const utf8 = data.subarray(bytesRead, bytesRead + length);
		const decoded = this.#decoder.decode(utf8);
		return [decoded, bytesRead + length];
	}
}

/**
 * Default UTF-8 string codec using {@link VarInt} as the length prefix sizer.
 *
 * Equivalent to `new StringCodec()`. Use this singleton for the common case
 * of encoding arbitrary strings without a custom length codec.
 *
 * @example
 * ```ts
 * import { Str } from "./string.ts";
 *
 * const bytes = Str.encode("opencode");
 * const [text, n] = Str.decode(bytes);
 * // text === "opencode"
 * ```
 */
export const Str: StringCodec = new StringCodec();
