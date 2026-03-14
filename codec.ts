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
 * Codecs encode values to Uint8Array<ArrayBuffer> and decode from Uint8Array<ArrayBuffer>.
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
 *   decode(b: Uint8Array<ArrayBuffer>) {
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
   * @returns Binary representation as Uint8Array<ArrayBuffer> (either the target or a new Uint8Array)
   */
  public abstract encode(
    value: I,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer>;

  /**
   * Decode a binary representation to a value
   *
   * @param data - Binary data to decode
   * @returns Tuple of [decoded value, bytes consumed]
   */
  public abstract decode(data: Uint8Array<ArrayBuffer>): [O, number];

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
  public transform<T extends Codec.InferOutput<Codec<O, I>>>(
    transformer: (value: O, bytes: Uint8Array<ArrayBuffer>) => T,
  ): TransformCodec<O, I, T, this> {
    return new TransformCodec(this, transformer);
  }
}

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
  O extends I,
  I = O,
  T extends O = O,
  C extends Codec<O, I> = Codec<O, I>,
> extends Codec<T, I> {
  /**
   * Size in bytes of the encoded data, inherited from the inner codec
   */
  public readonly stride: number;

  public readonly inner: C;
  private readonly transformer: (value: O, bytes: Uint8Array<ArrayBuffer>) => T;

  /**
   * Creates a new TransformCodec
   *
   * @param inner - The codec to wrap
   * @param transformer - Function to transform the decoded value
   */
  constructor(
    inner: C,
    transformer: (value: O, bytes: Uint8Array<ArrayBuffer>) => T,
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
   * @returns Binary representation as Uint8Array<ArrayBuffer>
   */
  encode(value: I): Uint8Array<ArrayBuffer> {
    return this.inner.encode(value);
  }

  /**
   * Decode binary data and apply the transformer
   *
   * @param data - Binary data to decode
   * @returns Tuple of [transformed value, bytes consumed]
   */
  decode(data: Uint8Array<ArrayBuffer>): [T, number] {
    const [value, size] = this.inner.decode(data);
    const bytes = data.subarray(0, size);
    const transformed = this.transformer(value, bytes);
    return [transformed, size];
  }
}
