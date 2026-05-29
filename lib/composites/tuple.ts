import { Codec, type Stride } from "../codec.ts";

// ── Tuple ─────────────────────────────────────────────────────────────────────

/**
 * A readonly array of codecs, one per tuple position.
 * Used as the generic constraint for {@link TupleCodec}.
 */
export type TupleGeneric = readonly Codec[];

/**
 * Derives the encode-side (input) tuple type from a {@link TupleGeneric} codec
 * array. Each element is typed as the corresponding codec's input type.
 *
 * @template T - Tuple of codecs.
 */
export type TupleInput<T extends TupleGeneric> = {
	-readonly [I in keyof T]: Codec.InferInput<T[I]>;
};

/**
 * Derives the decode-side (output) tuple type from a {@link TupleGeneric}
 * codec array. Each element is typed as the corresponding codec's output type.
 *
 * @template T - Tuple of codecs.
 */
export type TupleOutput<T extends TupleGeneric> = {
	-readonly [I in keyof T]: Codec.InferOutput<T[I]>;
};

/**
 * Codec for a heterogeneous fixed-length sequence of values (a tuple).
 *
 * **Wire format:** elements are encoded in index order as a flat concatenation
 * with no length prefix — `[encoded_0][encoded_1]...[encoded_n-1]`.
 *
 * The `stride` is `"fixed"` only when **all** element codecs have a fixed
 * stride; otherwise it is `"variable"`.
 *
 * @template T - Readonly array of codecs (a {@link TupleGeneric}).
 *
 * @example
 * const RgbCodec = new TupleCodec([U8, U8, U8] as const);
 *
 * const bytes = RgbCodec.encode([255, 128, 0]);
 * const [[r, g, b]] = [RgbCodec.decode(bytes)];
 * // r === 255, g === 128, b === 0
 *
 * @example
 * // Mixed variable/fixed — stride becomes "variable"
 * const codec = new TupleCodec([Utf8, U32] as const);
 */
export class TupleCodec<const T extends TupleGeneric> extends Codec<TupleOutput<T>, TupleInput<T>> {
	/** The array of element codecs in declaration order. */
	public readonly items: T;

	public readonly stride: Stride<"variable"> extends T[number]["stride"] ? Stride<"variable">
		: Stride<"fixed">;

	constructor(items: T) {
		super();
		this.items = items;
		let size = 0;
		let variable = false;
		for (const codec of items) {
			if (codec.stride.kind === "variable") {
				variable = true;
				break;
			}
			size += codec.stride.size;
		}
		this.stride = (variable ? { kind: "variable" } : { kind: "fixed", size }) as typeof this.stride;
	}

	/**
	 * Encodes a tuple of values into bytes.
	 *
	 * Each element is encoded by its corresponding codec in index order and the
	 * results are concatenated.
	 *
	 * @param value - Tuple of values to encode. Must match the codec's arity.
	 * @param target - Optional pre-allocated buffer to write into.
	 * @returns The encoded bytes.
	 *
	 * @example
	 * const bytes = RgbCodec.encode([0, 255, 0]);
	 */
	public encode(
		value: TupleInput<T>,
		target?: Uint8Array<ArrayBuffer>,
	): Uint8Array<ArrayBuffer> {
		const parts = new Array<Uint8Array<ArrayBuffer>>(this.items.length);
		for (let i = 0; i < this.items.length; i++) {
			const item = this.items[i]!;
			const itemValue = value[i]!;
			parts[i] = item.encode(itemValue);
		}
		const byteLength = parts.reduce((sum, p) => sum + p.length, 0);
		const bytes = target ?? new Uint8Array(byteLength);
		let offset = 0;
		for (let i = 0; i < parts.length; i++) {
			const part = parts[i]!;
			bytes.set(part, offset);
			offset += part.length;
		}
		return bytes;
	}

	/**
	 * Decodes bytes into a tuple of values.
	 *
	 * Each element is decoded by its corresponding codec in index order,
	 * advancing the read offset after each element.
	 *
	 * @param data - Byte array to decode from.
	 * @returns A tuple of `[decoded values array, bytes consumed]`.
	 *
	 * @example
	 * const [[r, g, b], bytesRead] = RgbCodec.decode(bytes);
	 */
	public decode(data: Uint8Array): [TupleOutput<T>, number] {
		const values = new Array<unknown>(this.items.length) as TupleOutput<T>;
		let offset = 0;
		for (let i = 0; i < this.items.length; i++) {
			const item = this.items[i]!;
			const [value, size] = item.decode(data.subarray(offset));
			values[i] = value;
			offset += size;
		}
		return [values, offset];
	}
}
