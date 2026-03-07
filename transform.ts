// deno-lint-ignore-file no-explicit-any
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
export class TransformCodec<
    C extends Codec<any>,
    T extends Codec.InferOutput<C> = Codec.InferOutput<C>,
> extends Codec<T, Codec.InferInput<C>> {
    /**
     * Size in bytes of the encoded data, inherited from the inner codec
     */
    public readonly stride: number;

    public readonly inner: C;
    private readonly transformer: (
        value: Codec.InferOutput<C>,
        bytes: Uint8Array,
    ) => T;

    /**
     * Creates a new TransformCodec
     *
     * @param inner - The codec to wrap
     * @param transformer - Function to transform the decoded value
     */
    constructor(
        inner: C,
        transformer: (value: Codec.InferOutput<C>, bytes: Uint8Array) => T,
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
    encode(value: Codec.InferInput<C>): Uint8Array {
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
