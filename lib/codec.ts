import { StructCodec } from "@nomadshiba/codec";
import { U8 } from "~/primitives.ts";

type StrideGeneric =
	| { readonly kind: "fixed"; readonly size: number }
	| { readonly kind: "variable" };

/**
 * Describes the byte-size behaviour of a codec.
 *
 * - `"fixed"` — every encoded value occupies exactly `size` bytes.
 * - `"variable"` — encoded length depends on the value.
 *
 * @example
 * // Fixed stride of 4 bytes (e.g. U32)
 * const stride: Stride<"fixed"> = { kind: "fixed", size: 4 };
 *
 * // Variable stride (e.g. VarInt)
 * const stride: Stride<"variable"> = { kind: "variable" };
 */
export type Stride<K extends StrideGeneric["kind"] = StrideGeneric["kind"]> = StrideGeneric["kind"] extends K ? StrideGeneric
	: Extract<StrideGeneric, { kind: K }>;

/**
 * Companion namespace for the {@link Codec} abstract class.
 * Provides utility types for extracting the input and output types of a codec
 * without triggering infinite-recursion issues that arise with the `infer` keyword
 * inside `extends` constraints.
 */
export declare namespace Codec {
	// For infers we dont use the `infer` keyword
	// because in some cases the `extends` check causes infinite recursion.

	/**
	 * Extracts the **input** type accepted by `encode` from a codec type.
	 *
	 * @template T - A concrete {@link Codec} subtype.
	 *
	 * @example
	 * type Input = Codec.InferInput<U32Codec>; // number
	 */
	export type InferInput<T extends Codec> = T["_INPUT_"];

	/**
	 * Extracts the **output** type returned by `decode` from a codec type.
	 *
	 * @template T - A concrete {@link Codec} subtype.
	 *
	 * @example
	 * type Output = Codec.InferOutput<U32Codec>; // number
	 */
	export type InferOutput<T extends Codec> = T["_OUTPUT_"];
}

/**
 * Abstract base class for all binary codecs.
 *
 * A codec is a paired encoder/decoder for a single value type. Concrete
 * subclasses define how values are serialised into bytes and deserialised back.
 *
 * Type parameters use a contravariant `I extends O` convention so that a codec
 * that decodes `O` may accept a wider type `I` on encode (e.g. a codec that
 * decodes `string` but accepts `string | Buffer` on encode).
 *
 * @template O - Decoded output type. Must extend `I`. Defaults to `any`.
 * @template I - Encoded input type. Defaults to `O`.
 *
 * @example
 * // Using a built-in codec
 * const bytes = U32.encode(42);          // Uint8Array [0, 0, 0, 42]
 * const [value] = U32.decode(bytes);     // 42
 */
export abstract class Codec<O extends I = any, I = O> {
	/**
	 * Phantom property — never assigned at runtime.
	 * Carries the **input** type for use with {@link Codec.InferInput}.
	 */
	public readonly _INPUT_!: I;

	/**
	 * Phantom property — never assigned at runtime.
	 * Carries the **output** type for use with {@link Codec.InferOutput}.
	 */
	public readonly _OUTPUT_!: O;

	/**
	 * Byte-size descriptor for this codec.
	 * Fixed-size codecs set `{ kind: "fixed", size: N }`;
	 * variable-size codecs set `{ kind: "variable" }`.
	 */
	public abstract readonly stride: Stride;

	/**
	 * Encodes `value` into binary.
	 *
	 * @param value - The value to encode.
	 * @param target - Optional pre-allocated buffer to write into. When provided,
	 *   the implementation writes at offset 0 and returns it. When omitted, a new
	 *   `Uint8Array` of the appropriate size is allocated.
	 * @returns The buffer containing the encoded bytes (same reference as `target`
	 *   when `target` is supplied).
	 *
	 * @example
	 * const buf = U32.encode(0xDEADBEEF);
	 * // buf => Uint8Array [0xDE, 0xAD, 0xBE, 0xEF]
	 */
	public abstract encode(
		value: I,
		target?: Uint8Array<ArrayBuffer>,
	): Uint8Array<ArrayBuffer>;

	/**
	 * Decodes a value from the beginning of `data`.
	 *
	 * @param data - Source bytes. The codec reads from offset 0 and may read
	 *   fewer bytes than `data.length` for variable-length codecs.
	 * @returns A tuple `[value, bytesConsumed]` where `bytesConsumed` is the
	 *   number of bytes read from `data`.
	 *
	 * @example
	 * const [value, size] = U32.decode(new Uint8Array([0, 0, 0, 42, 0xFF]));
	 * // value => 42, size => 4
	 */
	public abstract decode(
		data: Uint8Array,
	): [O, number];

	/**
	 * Convenience wrapper around {@link decode} that discards the byte-count and
	 * returns only the decoded value.
	 *
	 * @deprecated Use {@link decodeValue} instead.
	 *
	 * @param data - Source bytes, read from offset 0.
	 * @returns The decoded value.
	 *
	 * @example
	 * const value = U32.decodeValue(new Uint8Array([0, 0, 0, 7]));
	 * // value => 7
	 */
	public decodeAndReturnValue(data: Uint8Array): O {
		return this.decodeValue(data);
	}

	/**
	 * Convenience wrapper around {@link decode} that discards the byte-count and
	 * returns only the decoded value.
	 *
	 * @param data - Source bytes, read from offset 0.
	 * @returns The decoded value.
	 *
	 * @example
	 * const value = U32.decodeValue(new Uint8Array([0, 0, 0, 7]));
	 * // value => 7
	 */
	public decodeValue(data: Uint8Array): O {
		const [value] = this.decode(data);
		return value;
	}

	/**
	 * Creates a new {@link TransformCodec} that wraps this codec and applies
	 * `transformer` to every decoded value.
	 *
	 * Encoding is delegated unchanged to the inner codec.
	 *
	 * @template T - The transformed output type. Must extend `O`.
	 * @param transformer - Function called with the raw decoded value and the
	 *   raw bytes that produced it. Returns the final output value.
	 * @returns A new `TransformCodec<this, T, O, I>`.
	 *
	 * @example
	 * // Decode a U8 as a hex string instead of a number
	 * const HexByte = U8.transform((n) => n.toString(16).padStart(2, "0"));
	 * const [hex] = HexByte.decode(new Uint8Array([255]));
	 * // hex => "ff"
	 */
	public transform<T extends O>(
		transformer: (value: O, bytes: Uint8Array) => T,
	): TransformCodec<this, T, O, I> {
		return new TransformCodec(this, transformer);
	}
}

/**
 * Extension of {@link Codec} for codecs that can report per-field byte offsets
 * alongside the encoded/decoded value.
 *
 * Useful for struct-like codecs where callers need to know exactly where each
 * field sits inside the serialised buffer.
 *
 * @template O - Decoded output type.
 * @template I - Encoded input type.
 * @template Offsets - Shape of the offset map produced by this codec.
 */
export abstract class CodecWithOffsets<O extends I = any, I = O, Offsets = any> extends Codec<O, I> {
	/**
	 * Phantom property — never assigned at runtime.
	 * Carries the `Offsets` shape for static type inference.
	 */
	public readonly _OFFSETS_!: Offsets;

	/**
	 * Encodes `value` and returns both the byte buffer and a map of field offsets.
	 *
	 * @param value - The value to encode.
	 * @param target - Optional pre-allocated buffer to write into.
	 * @returns An object with `bytes` (the encoded buffer) and `offsets` (a map
	 *   describing where each field begins within `bytes`).
	 */
	public abstract encodeWithOffsets(value: I, target?: Uint8Array<ArrayBuffer>): { bytes: Uint8Array<ArrayBuffer>; offsets: Offsets };

	/**
	 * Decodes a value from `data` and returns both the value and a field-offset map.
	 *
	 * @param data - Source bytes, read from offset 0.
	 * @returns A tuple `[{ value, offsets }, bytesConsumed]`.
	 */
	public abstract decodeWithOffsets(data: Uint8Array): [{ value: O; offsets: Offsets }, number];
}

/**
 * Utility type that narrows any {@link Codec} to one with a **fixed** stride.
 *
 * Use this in function signatures that require a codec with a known, constant
 * encoded size (e.g. array elements with a compile-time element size).
 *
 * @template O - Decoded output type.
 * @template I - Encoded input type.
 *
 * @example
 * function readArray<C extends FixedCodec>(codec: C, count: number) { ... }
 */
export type FixedCodec<O extends I = any, I = O> = Codec<O, I> & {
	stride: Stride<"fixed">;
};

/**
 * Utility type that narrows any {@link Codec} to one with a **variable** stride.
 *
 * Use this in function signatures that explicitly handle variable-length codecs
 * (e.g. length-prefixed strings or VarInts).
 *
 * @template O - Decoded output type.
 * @template I - Encoded input type.
 *
 * @example
 * function writeLengthPrefixed<C extends VariableCodec>(codec: C, value: C["_INPUT_"]) { ... }
 */
export type VariableCodec<O extends I = any, I = O> = Codec<O, I> & {
	stride: Stride<"variable">;
};

/**
 * A codec that wraps an **inner** codec and post-processes its decoded output
 * through a `transformer` function.
 *
 * - `encode` is delegated directly to the inner codec (no transformation).
 * - `decode` runs the inner decoder then passes the result through `transformer`.
 * - `stride` mirrors the inner codec's stride unchanged.
 *
 * Instances are typically created via {@link Codec.transform} rather than
 * constructed directly.
 *
 * @template C - The inner codec type.
 * @template T - The final transformed output type (must extend `O`).
 * @template O - The inner codec's raw output type.
 * @template I - The inner codec's input type.
 *
 * @example
 * // Wrap U8 to always return a clamped value
 * const Clamped = new TransformCodec(U8, (n) => Math.min(n, 100));
 * const [v] = Clamped.decode(new Uint8Array([200]));
 * // v => 100
 */
export class TransformCodec<
	C extends Codec<O, I>,
	T extends O,
	O extends I = C["_OUTPUT_"], // O and I are needed here otherwise we get weird type errors if we use Codec.Infer(Output|Input)
	I = C["_INPUT_"],
> extends Codec<T, I> {
	/** Stride inherited from the inner codec. */
	public readonly stride: C["stride"];

	/** The wrapped inner codec. */
	public readonly inner: C;
	private readonly transformer: (value: O, bytes: Uint8Array) => T;

	/**
	 * @param inner - The codec whose `encode`/`decode` this wraps.
	 * @param transformer - Pure function applied to each decoded value. Receives
	 *   the raw decoded `value` and the raw `bytes` slice that produced it.
	 */
	constructor(inner: C, transformer: (value: O, bytes: Uint8Array) => T) {
		super();
		this.inner = inner;
		this.stride = inner.stride;
		this.transformer = transformer;
	}

	/**
	 * Encodes `value` using the inner codec. No transformation applied on encode.
	 *
	 * @param value - Value to encode.
	 * @param target - Optional pre-allocated target buffer.
	 * @returns Encoded bytes.
	 */
	encode(
		value: I,
		target?: Uint8Array<ArrayBuffer>,
	): Uint8Array<ArrayBuffer> {
		return this.inner.encode(value, target);
	}

	/**
	 * Decodes a value via the inner codec then applies `transformer`.
	 *
	 * @param data - Source bytes, read from offset 0.
	 * @returns A tuple `[transformedValue, bytesConsumed]`.
	 *
	 * @example
	 * const UpperStr = Utf8.transform((s) => s.toUpperCase());
	 * const [s] = UpperStr.decode(encoded);
	 * // s => "HELLO"
	 */
	decode(data: Uint8Array): [T, number] {
		const [value, size] = this.inner.decode(data);
		const bytes = data.subarray(0, size);
		const transformed = this.transformer(value, bytes);
		return [transformed, size];
	}
}
