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
	 * Infers the JavaScript type that a codec can encode/decode
	 *
	 * @template T - The codec type
	 */
	export type Infer<T> = T extends Codec<infer U> ? U : never;
}

/**
 * Base class for all binary data codecs.
 * Codecs encode values to Uint8Array and decode from Uint8Array.
 *
 * - stride >= 0: encoded size is fixed (in bytes)
 * - stride < 0: encoded size is variable
 *
 * @template T - Encoded/decoded value type
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
export abstract class Codec<T> {
	/**
	 * Size in bytes of the encoded data, or -1 if variable length
	 */
	public abstract readonly stride: number;

	/**
	 * Encode a value to binary representation
	 *
	 * @param value - Value to encode
	 * @returns Binary representation as Uint8Array
	 */
	public abstract encode(value: T): Uint8Array;

	/**
	 * Decode a binary representation to a value
	 *
	 * @param data - Binary data to decode
	 * @returns Tuple of [decoded value, bytes consumed]
	 */
	public abstract decode(data: Uint8Array): [T, number];
}
