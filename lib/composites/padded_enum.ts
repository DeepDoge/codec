import { Codec, type FixedCodec, type Stride } from "../codec.ts";
import { U8Codec } from "../primitives.ts";
import type { EnumInput, EnumOutput } from "./enum.ts";

// ── PaddedEnum ─────────────────────────────────────────────────────────────────

/**
 * A record mapping variant names to **fixed-size** payload codecs.
 *
 * All variants must have a `"fixed"` stride; this is enforced at construction
 * time. Used with {@link PaddedEnumCodec}.
 */
export type PaddedEnumGeneric = {
	readonly [key: string]: FixedCodec;
};

/**
 * Options for {@link PaddedEnumCodec}.
 */
export type PaddedEnumOptions = {
	/**
	 * Fixed-size codec used to encode/decode the variant index prefix.
	 * Defaults to {@link U8Codec} (0–255 variants).
	 */
	indexer?: FixedCodec<number>;
};

/**
 * Codec for a tagged-union / discriminated enum where **every variant has a
 * fixed-size payload**. Smaller variant payloads are zero-padded to match the
 * size of the largest variant, giving the whole codec a constant `"fixed"`
 * stride.
 *
 * **Wire format:** `[variantIndex (fixed)][variantPayload (padded to maxVariantSize)]`
 *
 * Total byte size = `indexer.stride.size + maxVariantSize`.
 *
 * This is useful when you need a constant-size wire representation for
 * heterogeneous data (e.g. fixed-size network packets, array elements that
 * must be randomly addressable).
 *
 * @template T - The variants map (a {@link PaddedEnumGeneric}).
 *
 * @throws {Error} At construction if any variant codec has a variable stride.
 *   Message: `"PaddedEnumCodec: variant \"<key>\" must have a fixed-size codec"`.
 * @throws {Error} At construction if the `indexer` codec has a variable stride.
 *   Message: `"PaddedEnumCodec: indexer must have a fixed-size codec"`.
 *
 * @example
 * const EventCodec = new PaddedEnumCodec({
 *   KeyPress: new StructCodec({ code: U8, modifiers: U8 }),
 *   MouseMove: new StructCodec({ x: U16, y: U16 }),
 * });
 * // stride is always fixed: 1 (U8 index) + 4 (largest variant) = 5 bytes
 *
 * const bytes = EventCodec.encode({ kind: "KeyPress", value: { code: 65, modifiers: 0 } });
 * const [event] = EventCodec.decode(bytes);
 * // event.kind === "KeyPress", event.value.code === 65
 */
export class PaddedEnumCodec<const T extends PaddedEnumGeneric> extends Codec<EnumOutput<T>, EnumInput<T>> {
	public readonly stride: Stride<"fixed">;

	/** The variants map passed to the constructor. */
	public readonly variants: T;
	/** The fixed-size codec used to encode/decode the variant index. */
	public readonly indexer: FixedCodec<number>;
	/** The size in bytes of the largest variant payload. All variants are padded to this size. */
	public readonly maxVariantSize: number;
	private readonly keys: (keyof T)[];

	constructor(variants: T, options?: PaddedEnumOptions) {
		super();
		this.variants = variants;
		this.keys = Object.keys(this.variants) as (keyof T)[];
		this.indexer = options?.indexer ?? new U8Codec();

		for (const key of this.keys) {
			const codec = this.variants[key]!;
			if (codec.stride.kind !== "fixed") {
				throw new Error(
					`PaddedEnumCodec: variant "${String(key)}" must have a fixed-size codec`,
				);
			}
		}

		if (this.indexer.stride.kind !== "fixed") {
			throw new Error("PaddedEnumCodec: indexer must have a fixed-size codec");
		}

		this.maxVariantSize = this.keys.reduce<number>((max, key) => {
			const s = (this.variants[key as string]!.stride as Stride<"fixed">).size;
			return s > max ? s : max;
		}, 0);

		this.stride = {
			kind: "fixed",
			size: this.indexer.stride.size + this.maxVariantSize,
		};
	}

	/**
	 * Encodes a discriminated-union value into a fixed-size byte buffer.
	 *
	 * Writes the variant index, then the encoded payload into a zero-initialised
	 * region of `maxVariantSize` bytes (smaller payloads are implicitly padded
	 * with zeros).
	 *
	 * @param value - Object with a `kind` discriminant and matching `value`.
	 * @param target - Optional pre-allocated buffer of exactly `stride.size` bytes.
	 * @returns The encoded bytes (always `stride.size` bytes long).
	 *
	 * @throws {Error} If `value.kind` is not a registered variant key.
	 *   Message: `"Invalid union variant: <kind>"`.
	 *
	 * @example
	 * const bytes = EventCodec.encode({ kind: "MouseMove", value: { x: 100, y: 200 } });
	 * // bytes.length === EventCodec.stride.size
	 */
	public encode(
		value: EnumInput<T>,
		target?: Uint8Array<ArrayBuffer>,
	): Uint8Array<ArrayBuffer> {
		const index = this.keys.indexOf(value.kind);
		if (index === -1) {
			throw new Error(`Invalid union variant: ${String(value.kind)}`);
		}
		const codec = this.variants[value.kind]!;
		const indexBytes = this.indexer.encode(index);
		const result = target ?? new Uint8Array(this.stride.size);
		result.set(indexBytes, 0);
		codec.encode(
			value.value as never,
			result.subarray(indexBytes.length) as Uint8Array<ArrayBuffer>,
		);
		return result;
	}

	/**
	 * Decodes a fixed-size byte buffer into a discriminated-union output value.
	 *
	 * Always consumes exactly `stride.size` bytes regardless of the actual
	 * variant payload size (padding is skipped).
	 *
	 * @param data - Byte array to decode from (must be at least `stride.size` bytes).
	 * @returns A tuple of `[{ kind, value }, stride.size]`.
	 *
	 * @throws {Error} If the decoded index is out of range.
	 *   Message: `"Invalid union index: <index>"`.
	 *
	 * @example
	 * const [event, bytesRead] = EventCodec.decode(bytes);
	 * // bytesRead === EventCodec.stride.size
	 */
	public decode(data: Uint8Array): [EnumOutput<T>, number] {
		const indexSize = this.indexer.stride.size;
		const [index] = this.indexer.decode(data);
		if (index >= this.keys.length) {
			throw new Error(`Invalid union index: ${index}`);
		}
		const key = this.keys[index]!;
		const codec = this.variants[key]!;
		const [value] = codec.decode(data.subarray(indexSize));
		return [{ kind: key, value } as never, this.stride.size];
	}
}
