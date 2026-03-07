import { Codec } from "./codec.ts";

/**
 * A codec wrapper that applies a transformation to the decoded value.
 * Allows post-processing decoded data while maintaining the same encoding behavior.
 *
 * @template A - Input type (what can be encoded)
 * @template B - Base output type from inner codec
 * @template C - Final output type after transformation (extends B)
 *
 * @example
 * ```ts
 * // Add checksum validation to a codec
 * const checksumCodec = u32.finalize(({ value, bytes }) => {
 *   const expected = calculateChecksum(bytes);
 *   if (value !== expected) throw new Error('Checksum mismatch');
 *   return value;
 * });
 * ```
 */
export class FinalizeCodec<A, B extends A, C extends B = B>
    extends Codec<A, C> {
    /**
     * Size in bytes of the encoded data, inherited from the inner codec
     */
    public readonly stride: number;

    private readonly inner: Codec<A, B>;
    private readonly finalizer: (
        params: { value: B; bytes: Uint8Array },
    ) => C;

    /**
     * Creates a new FinalizeCodec
     *
     * @param inner - The codec to wrap
     * @param finalizer - Function to transform the decoded value
     */
    constructor(
        inner: Codec<A, B>,
        finalizer: (params: { value: B; bytes: Uint8Array }) => C,
    ) {
        super();
        this.stride = inner.stride;
        this.inner = inner;
        this.finalizer = finalizer;
    }

    /**
     * Encode a value using the inner codec
     *
     * @param value - Value to encode
     * @returns Binary representation as Uint8Array
     */
    encode(value: A): Uint8Array {
        return this.inner.encode(value);
    }

    /**
     * Decode binary data and apply the finalizer transformation
     *
     * @param data - Binary data to decode
     * @returns Tuple of [transformed value, bytes consumed]
     */
    decode(data: Uint8Array): [C, number] {
        const [value, size] = this.inner.decode(data);
        const bytes = data.subarray(0, size);
        const transformed = this.finalizer({ value, bytes });
        return [transformed, size];
    }
}
