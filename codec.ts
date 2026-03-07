import { TransformCodec } from "./transform.ts";

/**
 * Type inference helper for codecs.
 *
 * @template T - Codec type to infer from
 * @example
 * ```ts
 * type N = Codec.Infer<U32>; // number
 * ```
 */
export declare namespace Codec {
	/**
	 * Infers the JavaScript type that a codec can encode/decode.
	 * This is an alias for {@link InferOutput}.
	 *
	 * @template T - The codec type to infer from
	 * @example
	 * ```ts
	 * const codec = new U32Codec();
	 * type Value = Codec.Infer<typeof codec>; // number
	 * ```
	 */
	export type Infer<T> = InferOutput<T>;

	/**
	 * Infers the input type that a codec accepts for encoding.
	 *
	 * @template T - The codec type to infer from
	 * @example
	 * ```ts
	 * const codec = new U32Codec();
	 * type Input = Codec.InferInput<typeof codec>; // number
	 * ```
	 */
	export type InferInput<T> = T extends Codec<infer O, infer I> ? I : never;

	/**
	 * Infers the output type that a codec returns from decoding.
	 *
	 * @template T - The codec type to infer from
	 * @example
	 * ```ts
	 * const codec = new U32Codec();
	 * type Output = Codec.InferOutput<typeof codec>; // number
	 * ```
	 */
	export type InferOutput<T> = T extends Codec<infer O, infer I> ? O : never;
}

/**
 * Base class for all binary data codecs.
 * Codecs encode values to Uint8Array and decode from Uint8Array.
 *
 * - stride >= 0: encoded size is fixed (in bytes)
 * - stride < 0: encoded size is variable
 *
 * @template I - Encoded/decoded value type
 *
 * @example
 * ```ts
 * // Custom codec: Date as u64 milliseconds since epoch
 * class DateCodec extends Codec<Date> {
 *   readonly stride = 8;
 *   encode(d: Date) { return u64.encode(BigInt(d.getTime())); }
 *   decode(b: Uint8Array) {
 *     const value = new Date(Number(u64.decode(b)[0]));
 *     return [value, 8];
 *   }
 * }
 * ```
 */
export abstract class Codec<O extends I, I = O> {
	/**
	 * Size in bytes of the encoded data, or -1 if variable length
	 */
	public abstract readonly stride: number;

	/**
	 * Encode a value to binary representation
	 *
	 * @param value - Value to encode
	 * @param target - Optional pre-allocated buffer to write into. If provided, must be large enough.
	 * @returns Binary representation as Uint8Array (either the target or a new Uint8Array)
	 */
	public abstract encode(value: I, target?: Uint8Array): Uint8Array;

	/**
	 * Decode a binary representation to a value
	 *
	 * @param data - Binary data to decode
	 * @returns Tuple of [decoded value, bytes consumed]
	 */
	public abstract decode(data: Uint8Array): [O, number];

	/**
	 * Wrap this codec with a transformer that transforms the decoded value.
	 * The transformer receives both the decoded value and the raw bytes.
	 *
	 * @template T - The final output type after transformation
	 * @param transformer - Function to transform the decoded value
	 * @returns A new TransformCodec that applies the transformation
	 *
	 * @example
	 * ```ts
	 * // Add validation to a codec
	 * const validatedU32 = u32.transform((value, bytes) => {
	 *   if (value > 1000) throw new Error('Value too large');
	 *   return value;
	 * });
	 *
	 * // Transform the decoded type
	 * const dateCodec = u64.transform((value) => new Date(Number(value)));
	 * type DateValue = Codec.Infer<typeof dateCodec>; // Date
	 * ```
	 */
	public transform<T extends O>(
		transformer: (value: O, bytes: Uint8Array) => T,
	): TransformCodec<O, I, T> {
		return new TransformCodec(this, transformer);
	}
}
