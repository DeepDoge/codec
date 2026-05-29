import { Codec, type Stride } from "../codec.ts";
import { VarInt } from "../varint.ts";

// ── Array ─────────────────────────────────────────────────────────────────────

/**
 * Any codec can serve as the element codec for an {@link ArrayCodec}.
 * This is a type alias for {@link Codec} used for clarity in generic constraints.
 */
export type ArrayGeneric = Codec;

/**
 * Derives the encode-side (input) array element type from an element codec.
 *
 * @template T - The element codec type.
 */
export type ArrayInput<T extends ArrayGeneric> = Codec.InferInput<T>[];

/**
 * Derives the decode-side (output) array element type from an element codec.
 *
 * @template T - The element codec type.
 */
export type ArrayOutput<T extends ArrayGeneric> = Codec.InferOutput<T>[];

/**
 * Options for {@link ArrayCodec}.
 */
export type ArrayOptions = {
	/**
	 * Codec used to encode/decode the element count prefix.
	 * Defaults to `VarInt` (variable-length integer).
	 */
	counter?: Codec<number>;
};

/**
 * Codec for a homogeneous variable-length array of elements.
 *
 * **Wire format:** `[elementCount][element_0][element_1]...[element_n-1]`
 *
 * The count prefix is encoded by `options.counter` (default: `VarInt`). Each
 * element is encoded by the `item` codec in sequence.
 *
 * The `stride` is always `"variable"`.
 *
 * @template T - The element codec type (an {@link ArrayGeneric}).
 *
 * @example
 * const U32ArrayCodec = new ArrayCodec(U32);
 *
 * const bytes = U32ArrayCodec.encode([1, 2, 3]);
 * const [arr] = U32ArrayCodec.decode(bytes);
 * // arr === [1, 2, 3]
 *
 * @example
 * // Custom counter codec (e.g. fixed U16 length prefix)
 * const codec = new ArrayCodec(Utf8, { counter: U16 });
 */
export class ArrayCodec<T extends ArrayGeneric> extends Codec<ArrayOutput<T>, ArrayInput<T>> {
	public readonly stride: Stride<"variable"> = { kind: "variable" };
	/** Codec used to encode/decode the element count prefix. */
	public readonly counter: Codec<number>;
	/** Codec used to encode/decode individual array elements. */
	public readonly item: T;

	constructor(item: T, options?: ArrayOptions) {
		super();
		this.item = item;
		this.counter = options?.counter ?? VarInt;
	}

	/**
	 * Encodes an array of values into a length-prefixed byte sequence.
	 *
	 * Encodes each element with `this.item`, then prepends the element count
	 * encoded with `this.counter`.
	 *
	 * @param value - Array of values to encode.
	 * @param target - Optional pre-allocated buffer to write into.
	 * @returns The encoded bytes.
	 *
	 * @example
	 * const bytes = codec.encode([10, 20, 30]);
	 */
	public encode(
		value: ArrayInput<T>,
		target?: Uint8Array<ArrayBuffer>,
	): Uint8Array<ArrayBuffer> {
		const parts: Uint8Array<ArrayBuffer>[] = [];
		for (const item of value) {
			parts.push(this.item.encode(item));
		}

		const combinedLength = parts.reduce((sum, p) => sum + p.length, 0);
		const countPrefix = this.counter.encode(value.length);
		const totalLen = countPrefix.length + combinedLength;
		const result = target ?? new Uint8Array(totalLen);
		result.set(countPrefix, 0);

		let offset = countPrefix.length;
		for (let i = 0; i < parts.length; i++) {
			result.set(parts[i]!, offset);
			offset += parts[i]!.length;
		}
		return result;
	}

	/**
	 * Decodes a length-prefixed byte sequence into an array of values.
	 *
	 * Reads the element count via `this.counter`, then decodes that many
	 * elements sequentially with `this.item`.
	 *
	 * @param data - Byte array to decode from.
	 * @returns A tuple of `[decoded array, bytes consumed]`.
	 *
	 * @example
	 * const [arr, bytesRead] = codec.decode(bytes);
	 */
	public decode(data: Uint8Array): [ArrayOutput<T>, number] {
		const [count, bytesRead] = this.counter.decode(data);
		const result: ArrayOutput<T> = [];
		let offset = bytesRead;

		for (let i = 0; i < count; i++) {
			const [value, size] = this.item.decode(data.subarray(offset));
			result.push(value);
			offset += size;
		}

		return [result, offset];
	}
}
