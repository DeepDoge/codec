import { Codec } from "./codec.ts";

/**
 * Options for primitive codecs.
 */
export type NumericOptions = {
  /** Endianness. Default is big-endian ("be"). */
  endian?: "be" | "le";
};

/**
 * Codec for signed 8-bit integers (int8).
 *
 * Endianness: N/A (1 byte)
 *
 * @example
 * ```ts
 * I8.encode(-5);              // [0xFB]
 * I8.decode(b);              // [-5, 1]
 * ```
 */
export class I8Codec extends Codec<number> {
  public readonly stride = 1;

  public encode(
    value: number,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    const arr = target ?? new Uint8Array(1);
    const view = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
    view.setInt8(0, value);
    return arr;
  }

  public decode(data: Uint8Array): [number, number] {
    const view = new DataView(
      data.buffer,
      data.byteOffset,
      data.byteLength,
    );
    return [view.getInt8(0), 1];
  }
}
/** Singleton instance of I8 codec */
export const I8: I8Codec = new I8Codec();

/**
 * Codec for unsigned 8-bit integers (uint8).
 *
 * Endianness: N/A (1 byte)
 *
 * @example
 * ```ts
 * U8.encode(255);             // [0xFF]
 * U8.decode(b);              // [255, 1]
 * ```
 */
export class U8Codec extends Codec<number> {
  public readonly stride = 1;

  public encode(
    value: number,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    const arr = target ?? new Uint8Array(1);
    const view = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
    view.setUint8(0, value);
    return arr;
  }

  public decode(data: Uint8Array): [number, number] {
    const view = new DataView(
      data.buffer,
      data.byteOffset,
      data.byteLength,
    );
    return [view.getUint8(0), 1];
  }
}
/** Singleton instance of U8 codec */
export const U8: U8Codec = new U8Codec();

/**
 * Codec for signed 16-bit integers (int16).
 * Default is big-endian. Use `{ endian: "le" }` for little-endian.
 *
 * @example
 * ```ts
 * // Big-endian (default)
 * new I16Codec().encode(-2);   // [0xFF, 0xFE]
 * new I16Codec().decode(b);    // [-2, 2]
 *
 * // Little-endian
 * new I16Codec({ endian: "le" }).encode(-2);  // [0xFE, 0xFF]
 * ```
 */
export class I16Codec extends Codec<number> {
  public readonly stride = 2;
  readonly #littleEndian: boolean;

  constructor(options?: NumericOptions) {
    super();
    this.#littleEndian = options?.endian === "le";
  }

  public encode(
    value: number,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    const arr = target ?? new Uint8Array(2);
    const view = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
    view.setInt16(0, value, this.#littleEndian);
    return arr;
  }

  public decode(data: Uint8Array): [number, number] {
    const view = new DataView(
      data.buffer,
      data.byteOffset,
      data.byteLength,
    );
    return [view.getInt16(0, this.#littleEndian), 2];
  }
}
/** Singleton instance of I16 codec (big-endian) */
export const I16: I16Codec = new I16Codec();

/**
 * Codec for unsigned 16-bit integers (uint16).
 * Default is big-endian. Use `{ endian: "le" }` for little-endian.
 *
 * @example
 * ```ts
 * // Big-endian (default)
 * new U16Codec().encode(513);  // [0x02, 0x01]
 * new U16Codec().decode(b);    // [513, 2]
 *
 * // Little-endian
 * new U16Codec({ endian: "le" }).encode(513);  // [0x01, 0x02]
 * ```
 */
export class U16Codec extends Codec<number> {
  public readonly stride = 2;
  readonly #littleEndian: boolean;

  constructor(options?: NumericOptions) {
    super();
    this.#littleEndian = options?.endian === "le";
  }

  public encode(
    value: number,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    const arr = target ?? new Uint8Array(2);
    const view = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
    view.setUint16(0, value, this.#littleEndian);
    return arr;
  }

  public decode(data: Uint8Array): [number, number] {
    const view = new DataView(
      data.buffer,
      data.byteOffset,
      data.byteLength,
    );
    return [view.getUint16(0, this.#littleEndian), 2];
  }
}
/** Singleton instance of U16 codec (big-endian) */
export const U16: U16Codec = new U16Codec();

/**
 * Codec for signed 32-bit integers (int32).
 * Default is big-endian. Use `{ endian: "le" }` for little-endian.
 *
 * @example
 * ```ts
 * // Big-endian (default)
 * new I32Codec().encode(-123456); // 4 bytes
 * new I32Codec().decode(b);       // [-123456, 4]
 *
 * // Little-endian
 * new I32Codec({ endian: "le" }).encode(-123456);
 * ```
 */
export class I32Codec extends Codec<number> {
  public readonly stride = 4;
  readonly #littleEndian: boolean;

  constructor(options?: NumericOptions) {
    super();
    this.#littleEndian = options?.endian === "le";
  }

  public encode(
    value: number,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    const arr = target ?? new Uint8Array(4);
    const view = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
    view.setInt32(0, value, this.#littleEndian);
    return arr;
  }

  public decode(data: Uint8Array): [number, number] {
    const view = new DataView(
      data.buffer,
      data.byteOffset,
      data.byteLength,
    );
    return [view.getInt32(0, this.#littleEndian), 4];
  }
}
/** Singleton instance of I32 codec (big-endian) */
export const I32: I32Codec = new I32Codec();

/**
 * Codec for unsigned 32-bit integers (uint32).
 * Default is big-endian. Use `{ endian: "le" }` for little-endian.
 *
 * @example
 * ```ts
 * // Big-endian (default)
 * new U32Codec().encode(4294967295 >>> 1);
 * new U32Codec().decode(b);       // [value, 4]
 *
 * // Little-endian
 * new U32Codec({ endian: "le" }).encode(4294967295 >>> 1);
 * ```
 */
export class U32Codec extends Codec<number> {
  public readonly stride = 4;
  readonly #littleEndian: boolean;

  constructor(options?: NumericOptions) {
    super();
    this.#littleEndian = options?.endian === "le";
  }

  public encode(
    value: number,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    const arr = target ?? new Uint8Array(4);
    const view = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
    view.setUint32(0, value, this.#littleEndian);
    return arr;
  }

  public decode(data: Uint8Array): [number, number] {
    const view = new DataView(
      data.buffer,
      data.byteOffset,
      data.byteLength,
    );
    return [view.getUint32(0, this.#littleEndian), 4];
  }
}
/** Singleton instance of U32 codec (big-endian) */
export const U32: U32Codec = new U32Codec();

/**
 * Codec for signed 64-bit integers (bigint).
 * Default is big-endian. Use `{ endian: "le" }` for little-endian.
 *
 * @example
 * ```ts
 * // Big-endian (default)
 * new I64Codec().encode(-123n);
 * new I64Codec().decode(b);       // [-123n, 8]
 *
 * // Little-endian
 * new I64Codec({ endian: "le" }).encode(-123n);
 * ```
 */
export class I64Codec extends Codec<bigint> {
  public readonly stride = 8;
  readonly #littleEndian: boolean;

  constructor(options?: NumericOptions) {
    super();
    this.#littleEndian = options?.endian === "le";
  }

  public encode(
    value: bigint,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    const arr = target ?? new Uint8Array(8);
    const view = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
    view.setBigInt64(0, value, this.#littleEndian);
    return arr;
  }

  public decode(data: Uint8Array): [bigint, number] {
    const view = new DataView(
      data.buffer,
      data.byteOffset,
      data.byteLength,
    );
    return [view.getBigInt64(0, this.#littleEndian), 8];
  }
}
/** Singleton instance of I64 codec (big-endian) */
export const I64: I64Codec = new I64Codec();

/**
 * Codec for unsigned 64-bit integers (bigint).
 * Default is big-endian. Use `{ endian: "le" }` for little-endian.
 *
 * @example
 * ```ts
 * // Big-endian (default)
 * new U64Codec().encode(9007199254740991n);
 * new U64Codec().decode(b);       // [9007199254740991n, 8]
 *
 * // Little-endian
 * new U64Codec({ endian: "le" }).encode(9007199254740991n);
 * ```
 */
export class U64Codec extends Codec<bigint> {
  public readonly stride = 8;
  readonly #littleEndian: boolean;

  constructor(options?: NumericOptions) {
    super();
    this.#littleEndian = options?.endian === "le";
  }

  public encode(
    value: bigint,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    const arr = target ?? new Uint8Array(8);
    const view = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
    view.setBigUint64(0, value, this.#littleEndian);
    return arr;
  }

  public decode(data: Uint8Array): [bigint, number] {
    const view = new DataView(
      data.buffer,
      data.byteOffset,
      data.byteLength,
    );
    return [view.getBigUint64(0, this.#littleEndian), 8];
  }
}
/** Singleton instance of U64 codec (big-endian) */
export const U64: U64Codec = new U64Codec();

/**
 * Codec for 32-bit floating point numbers (float32).
 * Default is big-endian. Use `{ endian: "le" }` for little-endian.
 *
 * @example
 * ```ts
 * // Big-endian (default)
 * new F32Codec().encode(Math.fround(1.5));
 * new F32Codec().decode(b);       // [~1.5, 4]
 *
 * // Little-endian
 * new F32Codec({ endian: "le" }).encode(Math.fround(1.5));
 * ```
 */
export class F32Codec extends Codec<number> {
  public readonly stride = 4;
  readonly #littleEndian: boolean;

  constructor(options?: NumericOptions) {
    super();
    this.#littleEndian = options?.endian === "le";
  }

  public encode(
    value: number,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    const arr = target ?? new Uint8Array(4);
    const view = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
    view.setFloat32(0, value, this.#littleEndian);
    return arr;
  }

  public decode(data: Uint8Array): [number, number] {
    const view = new DataView(
      data.buffer,
      data.byteOffset,
      data.byteLength,
    );
    return [view.getFloat32(0, this.#littleEndian), 4];
  }
}
/** Singleton instance of F32 codec (big-endian) */
export const F32: F32Codec = new F32Codec();

/**
 * Codec for 64-bit floating point numbers (float64).
 * Default is big-endian. Use `{ endian: "le" }` for little-endian.
 *
 * @example
 * ```ts
 * // Big-endian (default)
 * new F64Codec().encode(1.2345);
 * new F64Codec().decode(b);       // [1.2345, 8]
 *
 * // Little-endian
 * new F64Codec({ endian: "le" }).encode(1.2345);
 * ```
 */
export class F64Codec extends Codec<number> {
  public readonly stride = 8;
  readonly #littleEndian: boolean;

  constructor(options?: NumericOptions) {
    super();
    this.#littleEndian = options?.endian === "le";
  }

  public encode(
    value: number,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    const arr = target ?? new Uint8Array(8);
    const view = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
    view.setFloat64(0, value, this.#littleEndian);
    return arr;
  }

  public decode(data: Uint8Array): [number, number] {
    const view = new DataView(
      data.buffer,
      data.byteOffset,
      data.byteLength,
    );
    return [view.getFloat64(0, this.#littleEndian), 8];
  }
}
/** Singleton instance of F64 codec (big-endian) */
export const F64: F64Codec = new F64Codec();

/**
 * Codec for boolean values.
 * Encoded as a single byte: 0x00 = false, 0x01 = true.
 *
 * @example
 * ```ts
 * Bool.encode(true);        // [0x01]
 * Bool.decode(b);                     // [true, 1]
 * ```
 */
export class BoolCodec extends Codec<boolean> {
  public readonly stride = 1;

  public encode(
    value: boolean,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    const arr = target ?? new Uint8Array(1);
    arr[0] = value ? 1 : 0;
    return arr;
  }

  public decode(data: Uint8Array): [boolean, number] {
    return [data[0] !== 0, 1];
  }
}
/** Singleton instance of Bool codec */
export const Bool: BoolCodec = new BoolCodec();

// Little-endian singleton instances for convenience

/**
 * Singleton instance of I16 codec (little-endian).
 * @example
 * ```ts
 * I16LE.encode(-2);  // [0xFE, 0xFF]
 * ```
 */
export const I16LE: I16Codec = new I16Codec({ endian: "le" });

/**
 * Singleton instance of U16 codec (little-endian).
 * @example
 * ```ts
 * U16LE.encode(513);  // [0x01, 0x02]
 * ```
 */
export const U16LE: U16Codec = new U16Codec({ endian: "le" });

/**
 * Singleton instance of I32 codec (little-endian).
 * @example
 * ```ts
 * I32LE.encode(-123456);
 * ```
 */
export const I32LE: I32Codec = new I32Codec({ endian: "le" });

/**
 * Singleton instance of U32 codec (little-endian).
 * @example
 * ```ts
 * U32LE.encode(4294967295 >>> 1);
 * ```
 */
export const U32LE: U32Codec = new U32Codec({ endian: "le" });

/**
 * Singleton instance of I64 codec (little-endian).
 * @example
 * ```ts
 * I64LE.encode(-123n);
 * ```
 */
export const I64LE: I64Codec = new I64Codec({ endian: "le" });

/**
 * Singleton instance of U64 codec (little-endian).
 * @example
 * ```ts
 * U64LE.encode(9007199254740991n);
 * ```
 */
export const U64LE: U64Codec = new U64Codec({ endian: "le" });

/**
 * Singleton instance of F32 codec (little-endian).
 * @example
 * ```ts
 * F32LE.encode(Math.fround(1.5));
 * ```
 */
export const F32LE: F32Codec = new F32Codec({ endian: "le" });

/**
 * Singleton instance of F64 codec (little-endian).
 * @example
 * ```ts
 * F64LE.encode(1.2345);
 * ```
 */
export const F64LE: F64Codec = new F64Codec({ endian: "le" });
