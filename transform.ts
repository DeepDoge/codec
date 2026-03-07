import { Codec } from "./codec.ts";

/**
 * A codec wrapper that applies a transformation to the decoded value.
 * Allows post-processing decoded data while maintaining the same encoding behavior.
 *
 * @template O - Base output type from inner codec
 * @template I - Input type (what can be encoded)
 * @template T - Final output type after transformation (extends O)
 *
 * @example
 * ```ts
 * // Add checksum validation to a codec
 * const checksumCodec = u32.transform((value, bytes) => {
 *   const expected = calculateChecksum(bytes);
 *   if (value !== expected) throw new Error('Checksum mismatch');
 *   return value;
 * });
 * ```
 */
export class TransformCodec<O extends I, I = O, T extends O = O>
    extends Codec<T, I> {
    /**
     * Size in bytes of the encoded data, inherited from the inner codec
     */
    public readonly stride: number;

    private readonly inner: Codec<O, I>;
    private readonly transformer: (value: O, bytes: Uint8Array) => T;

    /**
     * Creates a new TransformCodec
     *
     * @param inner - The codec to wrap
     * @param transformer - Function to transform the decoded value
     */
    constructor(
        inner: Codec<O, I>,
        transformer: (value: O, bytes: Uint8Array) => T,
    ) {
        super();
        this.stride = inner.stride;
        this.inner = inner;
        this.transformer = transformer;
    }

    /**
     * Encode a value using the inner codec
     *
     * @param value - Value to encode
     * @returns Binary representation as Uint8Array
     */
    encode(value: I): Uint8Array {
        return this.inner.encode(value);
    }

    /**
     * Decode binary data and apply the transformer
     *
     * @param data - Binary data to decode
     * @returns Tuple of [transformed value, bytes consumed]
     */
    decode(data: Uint8Array): [T, number] {
        const [value, size] = this.inner.decode(data);
        const bytes = data.subarray(0, size);
        const transformed = this.transformer(value, bytes);
        return [transformed, size];
    }
}
