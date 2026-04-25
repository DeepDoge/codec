import { Codec } from "./codec.ts";

/**
 * Options for multi-byte numeric codecs.
 *
 * Applies to all integer and float codecs wider than one byte
 * (`I16`, `U16`, `I32`, `U32`, `I64`, `U64`, `F32`, `F64`).
 */
export type NumericOptions = {
  /**
   * Byte order used when reading/writing multi-byte values.
   * Defaults to `"be"` (big-endian / network byte order).
   * Use `"le"` for little-endian (x86, Bitcoin, etc.).
   */
  endian?: "be" | "le";
};

/**
 * Codec for signed 8-bit integers (int8, range −128…127).
 *
 * Single-byte, so endianness is not applicable.
 *
 * @example
 * ```ts
 * import { I8 } from "@nomadshiba/codec";
 *
 * I8.encode(-5);  // Uint8Array [0xFB]
 * I8.decode(new Uint8Array([0xFB])); // [-5, 1]
 * ```
 */
export class I8Codec extends Codec<number> {
  /** Always `1`. */
  public readonly stride = 1;

  /**
   * @param value - A signed 8-bit integer (−128…127).
   * @param target - Optional pre-allocated 1-byte buffer.
   * @returns `Uint8Array<ArrayBuffer>` containing the encoded byte.
   */
  public encode(
    value: number,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    const arr = target ?? new Uint8Array(1);
    const view = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
    view.setInt8(0, value);
    return arr;
  }

  /**
   * @param data - Binary data (at least 1 byte).
   * @returns `[value, 1]`.
   */
  public decode(data: Uint8Array): [number, number] {
    const view = new DataView(
      data.buffer,
      data.byteOffset,
      data.byteLength,
    );
    return [view.getInt8(0), 1];
  }
}

/** Pre-built singleton instance of {@link I8Codec}. */
export const I8: I8Codec = new I8Codec();

/**
 * Codec for unsigned 8-bit integers (uint8, range 0…255).
 *
 * Single-byte, so endianness is not applicable.
 *
 * @example
 * ```ts
 * import { U8 } from "@nomadshiba/codec";
 *
 * U8.encode(255); // Uint8Array [0xFF]
 * U8.decode(new Uint8Array([0xFF])); // [255, 1]
 * ```
 */
export class U8Codec extends Codec<number> {
  /** Always `1`. */
  public readonly stride = 1;

  /**
   * @param value - An unsigned 8-bit integer (0…255).
   * @param target - Optional pre-allocated 1-byte buffer.
   * @returns `Uint8Array<ArrayBuffer>` containing the encoded byte.
   */
  public encode(
    value: number,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    const arr = target ?? new Uint8Array(1);
    const view = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
    view.setUint8(0, value);
    return arr;
  }

  /**
   * @param data - Binary data (at least 1 byte).
   * @returns `[value, 1]`.
   */
  public decode(data: Uint8Array): [number, number] {
    const view = new DataView(
      data.buffer,
      data.byteOffset,
      data.byteLength,
    );
    return [view.getUint8(0), 1];
  }
}

/** Pre-built singleton instance of {@link U8Codec} (big-endian). */
export const U8: U8Codec = new U8Codec();

/**
 * Codec for signed 16-bit integers (int16, range −32 768…32 767).
 *
 * Defaults to big-endian. Pass `{ endian: "le" }` for little-endian, or use
 * the pre-built {@link I16LE} singleton.
 *
 * @example
 * ```ts
 * import { I16, I16LE } from "@nomadshiba/codec";
 *
 * I16.encode(-2);   // Uint8Array [0xFF, 0xFE]  (big-endian)
 * I16LE.encode(-2); // Uint8Array [0xFE, 0xFF]  (little-endian)
 * ```
 */
export class I16Codec extends Codec<number> {
  /** Always `2`. */
  public readonly stride = 2;
  readonly #littleEndian: boolean;

  /**
   * @param options - Optional endianness configuration. Defaults to big-endian.
   */
  constructor(options?: NumericOptions) {
    super();
    this.#littleEndian = options?.endian === "le";
  }

  /**
   * @param value - A signed 16-bit integer.
   * @param target - Optional pre-allocated 2-byte buffer.
   * @returns `Uint8Array<ArrayBuffer>` of length 2.
   */
  public encode(
    value: number,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    const arr = target ?? new Uint8Array(2);
    const view = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
    view.setInt16(0, value, this.#littleEndian);
    return arr;
  }

  /**
   * @param data - Binary data (at least 2 bytes).
   * @returns `[value, 2]`.
   */
  public decode(data: Uint8Array): [number, number] {
    const view = new DataView(
      data.buffer,
      data.byteOffset,
      data.byteLength,
    );
    return [view.getInt16(0, this.#littleEndian), 2];
  }
}

/** Pre-built singleton instance of {@link I16Codec} (big-endian). */
export const I16: I16Codec = new I16Codec();

/**
 * Codec for unsigned 16-bit integers (uint16, range 0…65 535).
 *
 * Defaults to big-endian. Pass `{ endian: "le" }` for little-endian, or use
 * the pre-built {@link U16LE} singleton.
 *
 * @example
 * ```ts
 * import { U16, U16LE } from "@nomadshiba/codec";
 *
 * U16.encode(513);   // Uint8Array [0x02, 0x01]  (big-endian)
 * U16LE.encode(513); // Uint8Array [0x01, 0x02]  (little-endian)
 * ```
 */
export class U16Codec extends Codec<number> {
  /** Always `2`. */
  public readonly stride = 2;
  readonly #littleEndian: boolean;

  /**
   * @param options - Optional endianness configuration. Defaults to big-endian.
   */
  constructor(options?: NumericOptions) {
    super();
    this.#littleEndian = options?.endian === "le";
  }

  /**
   * @param value - An unsigned 16-bit integer.
   * @param target - Optional pre-allocated 2-byte buffer.
   * @returns `Uint8Array<ArrayBuffer>` of length 2.
   */
  public encode(
    value: number,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    const arr = target ?? new Uint8Array(2);
    const view = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
    view.setUint16(0, value, this.#littleEndian);
    return arr;
  }

  /**
   * @param data - Binary data (at least 2 bytes).
   * @returns `[value, 2]`.
   */
  public decode(data: Uint8Array): [number, number] {
    const view = new DataView(
      data.buffer,
      data.byteOffset,
      data.byteLength,
    );
    return [view.getUint16(0, this.#littleEndian), 2];
  }
}

/** Pre-built singleton instance of {@link U16Codec} (big-endian). */
export const U16: U16Codec = new U16Codec();

/**
 * Codec for signed 32-bit integers (int32).
 *
 * Defaults to big-endian. Pass `{ endian: "le" }` for little-endian, or use
 * the pre-built {@link I32LE} singleton.
 *
 * @example
 * ```ts
 * import { I32, I32LE } from "@nomadshiba/codec";
 *
 * I32.encode(-123456);   // 4 bytes, big-endian
 * I32LE.encode(-123456); // 4 bytes, little-endian
 * ```
 */
export class I32Codec extends Codec<number> {
  /** Always `4`. */
  public readonly stride = 4;
  readonly #littleEndian: boolean;

  /**
   * @param options - Optional endianness configuration. Defaults to big-endian.
   */
  constructor(options?: NumericOptions) {
    super();
    this.#littleEndian = options?.endian === "le";
  }

  /**
   * @param value - A signed 32-bit integer.
   * @param target - Optional pre-allocated 4-byte buffer.
   * @returns `Uint8Array<ArrayBuffer>` of length 4.
   */
  public encode(
    value: number,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    const arr = target ?? new Uint8Array(4);
    const view = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
    view.setInt32(0, value, this.#littleEndian);
    return arr;
  }

  /**
   * @param data - Binary data (at least 4 bytes).
   * @returns `[value, 4]`.
   */
  public decode(data: Uint8Array): [number, number] {
    const view = new DataView(
      data.buffer,
      data.byteOffset,
      data.byteLength,
    );
    return [view.getInt32(0, this.#littleEndian), 4];
  }
}

/** Pre-built singleton instance of {@link I32Codec} (big-endian). */
export const I32: I32Codec = new I32Codec();

/**
 * Codec for unsigned 32-bit integers (uint32, range 0…4 294 967 295).
 *
 * Defaults to big-endian. Pass `{ endian: "le" }` for little-endian, or use
 * the pre-built {@link U32LE} singleton.
 *
 * @example
 * ```ts
 * import { U32, U32LE } from "@nomadshiba/codec";
 *
 * U32.encode(0xDEADBEEF);   // 4 bytes, big-endian
 * U32LE.encode(0xDEADBEEF); // 4 bytes, little-endian
 * ```
 */
export class U32Codec extends Codec<number> {
  /** Always `4`. */
  public readonly stride = 4;
  readonly #littleEndian: boolean;

  /**
   * @param options - Optional endianness configuration. Defaults to big-endian.
   */
  constructor(options?: NumericOptions) {
    super();
    this.#littleEndian = options?.endian === "le";
  }

  /**
   * @param value - An unsigned 32-bit integer.
   * @param target - Optional pre-allocated 4-byte buffer.
   * @returns `Uint8Array<ArrayBuffer>` of length 4.
   */
  public encode(
    value: number,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    const arr = target ?? new Uint8Array(4);
    const view = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
    view.setUint32(0, value, this.#littleEndian);
    return arr;
  }

  /**
   * @param data - Binary data (at least 4 bytes).
   * @returns `[value, 4]`.
   */
  public decode(data: Uint8Array): [number, number] {
    const view = new DataView(
      data.buffer,
      data.byteOffset,
      data.byteLength,
    );
    return [view.getUint32(0, this.#littleEndian), 4];
  }
}

/** Pre-built singleton instance of {@link U32Codec} (big-endian). */
export const U32: U32Codec = new U32Codec();

/**
 * Codec for signed 64-bit integers represented as `bigint`.
 *
 * Defaults to big-endian. Pass `{ endian: "le" }` for little-endian, or use
 * the pre-built {@link I64LE} singleton.
 *
 * @example
 * ```ts
 * import { I64, I64LE } from "@nomadshiba/codec";
 *
 * I64.encode(-123n);   // 8 bytes, big-endian
 * I64LE.encode(-123n); // 8 bytes, little-endian
 * I64.decode(bytes);   // [-123n, 8]
 * ```
 */
export class I64Codec extends Codec<bigint> {
  /** Always `8`. */
  public readonly stride = 8;
  readonly #littleEndian: boolean;

  /**
   * @param options - Optional endianness configuration. Defaults to big-endian.
   */
  constructor(options?: NumericOptions) {
    super();
    this.#littleEndian = options?.endian === "le";
  }

  /**
   * @param value - A signed 64-bit integer as `bigint`.
   * @param target - Optional pre-allocated 8-byte buffer.
   * @returns `Uint8Array<ArrayBuffer>` of length 8.
   */
  public encode(
    value: bigint,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    const arr = target ?? new Uint8Array(8);
    const view = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
    view.setBigInt64(0, value, this.#littleEndian);
    return arr;
  }

  /**
   * @param data - Binary data (at least 8 bytes).
   * @returns `[value, 8]`.
   */
  public decode(data: Uint8Array): [bigint, number] {
    const view = new DataView(
      data.buffer,
      data.byteOffset,
      data.byteLength,
    );
    return [view.getBigInt64(0, this.#littleEndian), 8];
  }
}

/** Pre-built singleton instance of {@link I64Codec} (big-endian). */
export const I64: I64Codec = new I64Codec();

/**
 * Codec for unsigned 64-bit integers represented as `bigint`.
 *
 * Defaults to big-endian. Pass `{ endian: "le" }` for little-endian, or use
 * the pre-built {@link U64LE} singleton.
 *
 * @example
 * ```ts
 * import { U64, U64LE } from "@nomadshiba/codec";
 *
 * U64.encode(9007199254740991n);   // 8 bytes, big-endian
 * U64LE.encode(9007199254740991n); // 8 bytes, little-endian
 * U64.decode(bytes);               // [9007199254740991n, 8]
 * ```
 */
export class U64Codec extends Codec<bigint> {
  /** Always `8`. */
  public readonly stride = 8;
  readonly #littleEndian: boolean;

  /**
   * @param options - Optional endianness configuration. Defaults to big-endian.
   */
  constructor(options?: NumericOptions) {
    super();
    this.#littleEndian = options?.endian === "le";
  }

  /**
   * @param value - An unsigned 64-bit integer as `bigint`.
   * @param target - Optional pre-allocated 8-byte buffer.
   * @returns `Uint8Array<ArrayBuffer>` of length 8.
   */
  public encode(
    value: bigint,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    const arr = target ?? new Uint8Array(8);
    const view = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
    view.setBigUint64(0, value, this.#littleEndian);
    return arr;
  }

  /**
   * @param data - Binary data (at least 8 bytes).
   * @returns `[value, 8]`.
   */
  public decode(data: Uint8Array): [bigint, number] {
    const view = new DataView(
      data.buffer,
      data.byteOffset,
      data.byteLength,
    );
    return [view.getBigUint64(0, this.#littleEndian), 8];
  }
}

/** Pre-built singleton instance of {@link U64Codec} (big-endian). */
export const U64: U64Codec = new U64Codec();

/**
 * Codec for 32-bit IEEE 754 floating-point numbers (float32).
 *
 * Note that JavaScript `number` values are 64-bit floats. Values are
 * truncated to 32-bit precision on encode. Use `Math.fround` to check the
 * representable value before encoding.
 *
 * Defaults to big-endian. Pass `{ endian: "le" }` for little-endian, or use
 * the pre-built {@link F32LE} singleton.
 *
 * @example
 * ```ts
 * import { F32, F32LE } from "@nomadshiba/codec";
 *
 * F32.encode(Math.fround(1.5));   // 4 bytes, big-endian
 * F32LE.encode(Math.fround(1.5)); // 4 bytes, little-endian
 * F32.decode(bytes);              // [~1.5, 4]
 * ```
 */
export class F32Codec extends Codec<number> {
  /** Always `4`. */
  public readonly stride = 4;
  readonly #littleEndian: boolean;

  /**
   * @param options - Optional endianness configuration. Defaults to big-endian.
   */
  constructor(options?: NumericOptions) {
    super();
    this.#littleEndian = options?.endian === "le";
  }

  /**
   * @param value - A number, encoded as a 32-bit float (precision is reduced).
   * @param target - Optional pre-allocated 4-byte buffer.
   * @returns `Uint8Array<ArrayBuffer>` of length 4.
   */
  public encode(
    value: number,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    const arr = target ?? new Uint8Array(4);
    const view = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
    view.setFloat32(0, value, this.#littleEndian);
    return arr;
  }

  /**
   * @param data - Binary data (at least 4 bytes).
   * @returns `[value, 4]` where `value` is a 32-bit float promoted to `number`.
   */
  public decode(data: Uint8Array): [number, number] {
    const view = new DataView(
      data.buffer,
      data.byteOffset,
      data.byteLength,
    );
    return [view.getFloat32(0, this.#littleEndian), 4];
  }
}

/** Pre-built singleton instance of {@link F32Codec} (big-endian). */
export const F32: F32Codec = new F32Codec();

/**
 * Codec for 64-bit IEEE 754 floating-point numbers (float64 / JavaScript `number`).
 *
 * Defaults to big-endian. Pass `{ endian: "le" }` for little-endian, or use
 * the pre-built {@link F64LE} singleton.
 *
 * @example
 * ```ts
 * import { F64, F64LE } from "@nomadshiba/codec";
 *
 * F64.encode(1.2345);   // 8 bytes, big-endian
 * F64LE.encode(1.2345); // 8 bytes, little-endian
 * F64.decode(bytes);    // [1.2345, 8]
 * ```
 */
export class F64Codec extends Codec<number> {
  /** Always `8`. */
  public readonly stride = 8;
  readonly #littleEndian: boolean;

  /**
   * @param options - Optional endianness configuration. Defaults to big-endian.
   */
  constructor(options?: NumericOptions) {
    super();
    this.#littleEndian = options?.endian === "le";
  }

  /**
   * @param value - A JavaScript `number` (64-bit float).
   * @param target - Optional pre-allocated 8-byte buffer.
   * @returns `Uint8Array<ArrayBuffer>` of length 8.
   */
  public encode(
    value: number,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    const arr = target ?? new Uint8Array(8);
    const view = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
    view.setFloat64(0, value, this.#littleEndian);
    return arr;
  }

  /**
   * @param data - Binary data (at least 8 bytes).
   * @returns `[value, 8]`.
   */
  public decode(data: Uint8Array): [number, number] {
    const view = new DataView(
      data.buffer,
      data.byteOffset,
      data.byteLength,
    );
    return [view.getFloat64(0, this.#littleEndian), 8];
  }
}

/** Pre-built singleton instance of {@link F64Codec} (big-endian). */
export const F64: F64Codec = new F64Codec();

/**
 * Codec for boolean values.
 *
 * Encoded as a single byte: `0x00` = `false`, `0x01` = `true`.
 * Any non-zero byte decodes as `true`.
 *
 * @example
 * ```ts
 * import { Bool } from "@nomadshiba/codec";
 *
 * Bool.encode(true);  // Uint8Array [0x01]
 * Bool.encode(false); // Uint8Array [0x00]
 * Bool.decode(new Uint8Array([0x01])); // [true, 1]
 * ```
 */
export class BoolCodec extends Codec<boolean> {
  /** Always `1`. */
  public readonly stride = 1;

  /**
   * @param value - A boolean value.
   * @param target - Optional pre-allocated 1-byte buffer.
   * @returns `Uint8Array<ArrayBuffer>` containing `0x00` or `0x01`.
   */
  public encode(
    value: boolean,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    const arr = target ?? new Uint8Array(1);
    arr[0] = value ? 1 : 0;
    return arr;
  }

  /**
   * @param data - Binary data (at least 1 byte).
   * @returns `[value, 1]` where any non-zero byte decodes as `true`.
   */
  public decode(data: Uint8Array): [boolean, number] {
    return [data[0] !== 0, 1];
  }
}

/** Pre-built singleton instance of {@link BoolCodec}. */
export const Bool: BoolCodec = new BoolCodec();

// ── Little-endian singletons ─────────────────────────────────────────────────

/**
 * Pre-built little-endian instance of {@link I16Codec}.
 * @example
 * ```ts
 * I16LE.encode(-2); // Uint8Array [0xFE, 0xFF]
 * ```
 */
export const I16LE: I16Codec = new I16Codec({ endian: "le" });

/**
 * Pre-built little-endian instance of {@link U16Codec}.
 * @example
 * ```ts
 * U16LE.encode(513); // Uint8Array [0x01, 0x02]
 * ```
 */
export const U16LE: U16Codec = new U16Codec({ endian: "le" });

/**
 * Pre-built little-endian instance of {@link I32Codec}.
 * @example
 * ```ts
 * I32LE.encode(-123456); // 4 bytes, little-endian
 * ```
 */
export const I32LE: I32Codec = new I32Codec({ endian: "le" });

/**
 * Pre-built little-endian instance of {@link U32Codec}.
 * @example
 * ```ts
 * U32LE.encode(0xDEADBEEF); // 4 bytes, little-endian
 * ```
 */
export const U32LE: U32Codec = new U32Codec({ endian: "le" });

/**
 * Pre-built little-endian instance of {@link I64Codec}.
 * @example
 * ```ts
 * I64LE.encode(-123n); // 8 bytes, little-endian
 * ```
 */
export const I64LE: I64Codec = new I64Codec({ endian: "le" });

/**
 * Pre-built little-endian instance of {@link U64Codec}.
 * @example
 * ```ts
 * U64LE.encode(9007199254740991n); // 8 bytes, little-endian
 * ```
 */
export const U64LE: U64Codec = new U64Codec({ endian: "le" });

/**
 * Pre-built little-endian instance of {@link F32Codec}.
 * @example
 * ```ts
 * F32LE.encode(Math.fround(1.5)); // 4 bytes, little-endian
 * ```
 */
export const F32LE: F32Codec = new F32Codec({ endian: "le" });

/**
 * Pre-built little-endian instance of {@link F64Codec}.
 * @example
 * ```ts
 * F64LE.encode(1.2345); // 8 bytes, little-endian
 * ```
 */
export const F64LE: F64Codec = new F64Codec({ endian: "le" });

/**
 * Codec for the `void` type, also accepting `null` and `undefined`.
 *
 * Encodes to zero bytes and decodes from zero bytes. Useful as a placeholder
 * or for optional fields where the absence of data is the signal.
 *
 * @example
 * ```ts
 * Void.encode(undefined); // Uint8Array(0)
 * Void.decode(new Uint8Array(0)); // [undefined, 0]
 * ```
 */
export class VoidCodec extends Codec<void, null | undefined | void> {
  public override readonly stride = 0;

  /**
   * Encode a void-like value into the target buffer.
   *
   * Since void occupies zero bytes, the target is returned unchanged.
   *
   * @param _value - Ignored. Accepts `void`, `null`, or `undefined`.
   * @param target - Optional pre-allocated buffer. Defaults to an empty array.
   * @returns `target`, unchanged.
   */
  public override encode(
    _value: void | null | undefined,
    target = new Uint8Array(0),
  ): Uint8Array<ArrayBuffer> {
    return target;
  }

  /**
   * Decode zero bytes from `data` and return `undefined`.
   *
   * Consumes no bytes regardless of `data` length. This is intentional —
   * void should always decode successfully without advancing the cursor.
   *
   * @param _data - Binary data. Ignored.
   * @returns `[undefined, 0]` — the void value and zero bytes consumed.
   */
  public override decode(_data: Uint8Array): [void, number] {
    return [void 0, 0];
  }
}

/** Singleton {@link VoidCodec} instance. */
export const Void = new VoidCodec();
