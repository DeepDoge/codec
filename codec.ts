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
 * Abstract base class for all binary codecs.
 *
 * A codec converts between a JavaScript value and its binary
 * `Uint8Array<ArrayBuffer>` representation.
 *
 * - `stride >= 0` — the encoded size is always exactly `stride` bytes.
 * - `stride < 0` — the encoded size is variable; the codec is self-delimiting.
 *
 * @template O - The output type returned by `decode`.
 * @template I - The input type accepted by `encode`. Defaults to `O`.
 *
 * @example
 * ```ts
 * import { Codec, U64 } from "@nomadshiba/codec";
 *
 * // Custom codec: Date stored as a u64 millisecond timestamp
 * class DateCodec extends Codec<Date, bigint> {
 *   readonly stride = 8;
 *
 *   encode(ms: bigint, target?: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
 *     return U64.encode(ms, target);
 *   }
 *
 *   decode(data: Uint8Array): [Date, number] {
 *     const [ms] = U64.decode(data);
 *     return [new Date(Number(ms)), 8];
 *   }
 * }
 * ```
 */
export abstract class Codec<O extends I, I = O> {
  /**
   * The fixed byte size of encoded values, or a negative number for
   * variable-length codecs.
   *
   * Composite codecs (`TupleCodec`, `StructCodec`) derive their stride from
   * their elements: the sum of all element strides when all are fixed, or `-1`
   * if any element is variable.
   */
  public abstract readonly stride: number;

  /**
   * Encode `value` to its binary representation.
   *
   * @param value - The value to encode.
   * @param target - Optional pre-allocated buffer to write into. When provided
   *   it must be large enough to hold the encoded bytes. The same buffer is
   *   returned, which avoids a heap allocation in hot paths.
   * @returns A `Uint8Array<ArrayBuffer>` containing the encoded bytes. Returns
   *   `target` when one is supplied, otherwise a freshly allocated buffer.
   */
  public abstract encode(
    value: I,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer>;

  /**
   * Decode binary data and return the value together with the number of bytes
   * consumed.
   *
   * The returned byte count lets callers advance a cursor when decoding
   * multiple values from a single buffer (e.g. inside composite codecs).
   *
   * @param data - Binary data to decode. May be longer than needed; only the
   *   leading bytes required by this codec are consumed.
   * @returns `[value, bytesConsumed]` — the decoded value and the number of
   *   bytes read from `data`.
   */
  public abstract decode(data: Uint8Array): [O, number];

  /**
   * Wrap this codec with a post-decode transformation.
   *
   * `encode` is unchanged — the inner codec handles serialisation as usual.
   * Only `decode` is affected: after the inner codec decodes a value the
   * `transformer` function is called with that value and the raw bytes that
   * were consumed, and its return value becomes the final decoded result.
   *
   * @template T - The final output type after transformation.
   * @param transformer - Function applied to the decoded value. Receives
   *   `(value: O, bytes: Uint8Array)` and must return the transformed value.
   * @returns A new {@link TransformCodec} that wraps this codec.
   *
   * @example
   * ```ts
   * import { U64, Codec } from "@nomadshiba/codec";
   *
   * // Decode a u64 timestamp as a Date
   * const DateCodec = U64.transform((ms) => new Date(Number(ms)));
   * type Decoded = Codec.Infer<typeof DateCodec>; // Date
   * ```
   *
   * @example
   * ```ts
   * import { U32 } from "@nomadshiba/codec";
   *
   * // Validate on decode
   * const bounded = U32.transform((value) => {
   *   if (value > 1000) throw new RangeError("value out of range");
   *   return value;
   * });
   * ```
   */
  public transform<T extends Codec.InferOutput<Codec<O, I>>>(
    transformer: (value: O, bytes: Uint8Array) => T,
  ): TransformCodec<O, I, T, this> {
    return new TransformCodec(this, transformer);
  }
}

/**
 * A codec wrapper that applies a transformation to the decoded value.
 *
 * `encode` delegates directly to the inner codec, so the wire format is
 * unchanged. `decode` calls the inner codec then passes the decoded value
 * through the transformer function.
 *
 * Obtain a `TransformCodec` via {@link Codec.transform} rather than
 * instantiating this class directly.
 *
 * @template O - Base output type produced by the inner codec.
 * @template I - Input type accepted by `encode`.
 * @template T - Final output type after the transformer is applied (extends `O`).
 * @template C - Concrete type of the inner codec.
 *
 * @example
 * ```ts
 * import { U32 } from "@nomadshiba/codec";
 *
 * const validated = U32.transform((value, bytes) => {
 *   if (value > 0xFFFF) throw new RangeError("value exceeds u16 range");
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
   * The fixed byte size of encoded values, inherited from the inner codec.
   */
  public readonly stride: number;

  /**
   * The wrapped inner codec that handles encoding and the initial decoding
   * step before the transformer is applied.
   */
  public readonly inner: C;

  private readonly transformer: (value: O, bytes: Uint8Array) => T;

  /**
   * @param inner - The codec to wrap.
   * @param transformer - Function applied to each decoded value.
   */
  constructor(
    inner: C,
    transformer: (value: O, bytes: Uint8Array) => T,
  ) {
    super();
    this.stride = inner.stride;
    this.inner = inner;
    this.transformer = transformer;
  }

  /**
   * Encode a value using the inner codec.
   *
   * @param value - Value to encode.
   * @param target - Optional pre-allocated buffer to write into.
   * @returns Binary representation as `Uint8Array<ArrayBuffer>`.
   */
  encode(
    value: I,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    return this.inner.encode(value, target);
  }

  /**
   * Decode binary data using the inner codec, then apply the transformer.
   *
   * @param data - Binary data to decode.
   * @returns `[transformedValue, bytesConsumed]`.
   */
  decode(data: Uint8Array): [T, number] {
    const [value, size] = this.inner.decode(data);
    const bytes = data.subarray(0, size);
    const transformed = this.transformer(value, bytes);
    return [transformed, size];
  }
}
