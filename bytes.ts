import { Codec, type Stride } from "./codec.ts";
import { VarInt } from "./varint.ts";

/**
 * Options for {@link StringCodec}.
 */
export type StringOptions = {
  /**
   * Codec used to encode the byte-length prefix that precedes the UTF-8
   * payload. Defaults to {@link VarInt} (unsigned LEB128).
   *
   * Use a fixed-width codec (e.g. `U32`) when you need a stable 4-byte length
   * field or interoperability with a specific wire format.
   */
  sizer?: Codec<number>;
};

/**
 * Codec for UTF-8 encoded strings.
 *
 * Wire format: `<length> <utf8-bytes>` where `<length>` is the byte count of
 * the UTF-8 encoding (not the character count), encoded with the configured
 * `sizer` (default: {@link VarInt}).
 *
 * Always variable-length (`stride = { kind: "variable" }`).
 *
 * @example
 * ```ts
 * import { StringCodec, Str, U32 } from "@nomadshiba/codec";
 *
 * const str = new StringCodec();
 * const raw = str.encode("hi");  // Uint8Array [0x02, 0x68, 0x69]
 * str.decode(raw);               // ["hi", 3]
 *
 * // Pre-built singleton — same as new StringCodec()
 * Str.encode("hi");
 *
 * // Custom length codec
 * const strU32 = new StringCodec({ sizer: U32 });
 * strU32.encode("hi"); // [0x00, 0x00, 0x00, 0x02, 0x68, 0x69]
 * ```
 */
export class StringCodec extends Codec<string> {
  /** Always `{ kind: "variable" }`; strings are variable-length. */
  public readonly stride: Stride<"variable"> = { kind: "variable" };
  /**
   * The codec used to encode the byte-length prefix that precedes the UTF-8
   * payload. Defaults to {@link VarInt}.
   */
  public readonly sizer: Codec<number>;
  readonly #encoder = new TextEncoder();
  readonly #decoder = new TextDecoder();

  /**
   * @param options - Optional configuration. Pass `{ sizer }` to use a
   *   codec other than {@link VarInt} for the length prefix.
   */
  constructor(options?: StringOptions) {
    super();
    this.sizer = options?.sizer ?? VarInt;
  }

  /**
   * Encode a string to a length-prefixed UTF-8 byte sequence.
   *
   * @param value - The string to encode as UTF-8.
   * @param target - Optional pre-allocated buffer (must be large enough).
   * @returns `Uint8Array<ArrayBuffer>` containing the length prefix followed
   *   by the UTF-8 bytes.
   */
  public encode(
    value: string,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    const utf8 = this.#encoder.encode(value);
    const lengthPrefix = this.sizer.encode(utf8.length);
    const totalLen = lengthPrefix.length + utf8.length;

    const result = target ?? new Uint8Array(totalLen);
    result.set(lengthPrefix, 0);
    result.set(utf8, lengthPrefix.length);
    return result;
  }

  /**
   * Decode a length-prefixed UTF-8 string from binary data.
   *
   * @param data - Binary data starting with a length-prefixed UTF-8 string.
   * @returns `[string, bytesConsumed]`.
   */
  public decode(data: Uint8Array): [string, number] {
    const [length, bytesRead] = this.sizer.decode(data);
    const utf8 = data.subarray(bytesRead, bytesRead + length);
    const decoded = this.#decoder.decode(utf8);
    return [decoded, bytesRead + length];
  }
}

/**
 * Pre-built singleton instance of {@link StringCodec} with the default
 * {@link VarInt} length prefix.
 */
export const Str: StringCodec = new StringCodec();

/**
 * Options for {@link BytesCodec}.
 *
 * Exactly one of `size` or `sizer` may be specified:
 * - `{ size: n }` — fixed-length mode: encodes/decodes exactly `n` bytes, no
 *   prefix.
 * - `{ sizer }` — variable-length mode with a custom size prefix codec.
 * - No options (or omitting both fields) — variable-length mode with the
 *   default {@link VarInt} prefix.
 */
export type BytesOptions =
  | {
    /**
     * Fixed byte count. When `>= 0` the codec operates in fixed-length mode:
     * no size prefix is written/read, and `stride` equals `size`.
     */
    size: number;
    sizer?: undefined;
  }
  | {
    /**
     * Codec used to encode the size prefix in variable-length mode.
     * Defaults to {@link VarInt} when neither `size` nor `sizer` is
     * provided.
     */
    sizer: Codec<number>;
    size?: undefined;
  };

/**
 * Codec for raw byte arrays (`Uint8Array`).
 *
 * **Variable-length mode** (default): the byte count is written as a prefix
 * using the configured `sizer` (default: {@link VarInt}).
 *
 * **Fixed-length mode** (`{ size: n }`): no prefix is written; `stride`
 * equals `n` and the input must have exactly `n` bytes.
 *
 * @example
 * ```ts
 * import { BytesCodec, Bytes, U32 } from "@nomadshiba/codec";
 *
 * // Variable-length — pre-built singleton
 * const b = Bytes.encode(new Uint8Array([1, 2, 3])); // [0x03, 0x01, 0x02, 0x03]
 * Bytes.decode(b); // [Uint8Array([1, 2, 3]), 4]
 *
 * // Variable-length with custom size codec
 * const bytesU32 = new BytesCodec({ sizer: U32 });
 *
 * // Fixed-length (stride = 4, no prefix)
 * const fixed4 = new BytesCodec({ size: 4 });
 * fixed4.encode(new Uint8Array([1, 2, 3, 4])); // [0x01, 0x02, 0x03, 0x04]
 * ```
 */
export class BytesCodec<const O extends BytesOptions | undefined = undefined>
  extends Codec<Uint8Array> {
  /**
   * `{ kind: "fixed", size: n }` in fixed-length mode, or
   * `{ kind: "variable" }` in variable-length mode.
   */
  public readonly stride: O extends { size: number } ? Stride<"fixed">
    : Stride<"variable">;
  /**
   * The codec used to encode the byte-size prefix in variable-length mode.
   * Not used in fixed-length mode (`size >= 0`). Defaults to {@link VarInt}.
   */
  public readonly sizer: Codec<number>;

  /**
   * @param options - Optional configuration for fixed or variable length mode.
   */
  constructor(options?: O) {
    super();
    this.stride =
      (options?.size !== undefined
        ? { kind: "fixed", size: options.size }
        : { kind: "variable" }) as typeof this.stride;
    this.sizer = options?.sizer ?? VarInt;
  }

  /**
   * Encode a byte array, writing a length prefix in variable-length mode or
   * copying raw bytes in fixed-length mode.
   *
   * @param value - The byte array to encode.
   * @param target - Optional pre-allocated buffer (must be large enough).
   * @returns `Uint8Array<ArrayBuffer>` containing the encoded bytes (with or
   *   without a length prefix depending on the mode).
   * @throws {RangeError} In fixed-length mode if `value.length !== stride.size`.
   */
  public encode(
    value: Uint8Array,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    if (this.stride.kind === "fixed") {
      if (value.length !== this.stride.size) {
        throw new RangeError(
          `Expected byte array of length ${this.stride.size}, got ${value.length}`,
        );
      }
      const result = target ?? new Uint8Array(this.stride.size);
      result.set(value);
      return result;
    } else {
      const lengthPrefix = this.sizer.encode(value.length);
      const totalLen = lengthPrefix.length + value.length;

      const result = target ?? new Uint8Array(totalLen);
      result.set(lengthPrefix, 0);
      result.set(value, lengthPrefix.length);
      return result;
    }
  }

  /**
   * Decode a byte array, reading a length prefix in variable-length mode or
   * consuming a fixed number of bytes in fixed-length mode.
   *
   * @param data - Binary data to decode.
   * @returns `[bytes, bytesConsumed]` — a subarray view into `data`.
   * @throws {RangeError} In fixed-length mode if `data` is shorter than
   *   `stride.size`.
   */
  public decode(
    data: Uint8Array,
  ): [Uint8Array, number] {
    if (this.stride.kind === "fixed") {
      if (data.length < this.stride.size) {
        throw new RangeError(
          `Expected at least ${this.stride.size} bytes, got ${data.length}`,
        );
      }
      return [data.subarray(0, this.stride.size), this.stride.size];
    } else {
      const [length, bytesRead] = this.sizer.decode(data);
      const decoded = data.subarray(bytesRead, bytesRead + length);
      return [decoded, bytesRead + length];
    }
  }
}

/**
 * Pre-built singleton instance of {@link BytesCodec} in variable-length mode
 * with the default {@link VarInt} length prefix.
 */
export const Bytes: BytesCodec<undefined> = new BytesCodec();
