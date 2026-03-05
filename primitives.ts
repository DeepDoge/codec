import { Codec } from "./codec.ts";

/**
 * Options for primitive codecs.
 */
export interface PrimitiveOptions {
	/** Endianness. Default is big-endian ("be"). */
	endian?: "be" | "le";
}

/**
 * Codec for signed 8-bit integers (int8).
 *
 * Endianness: N/A (1 byte)
 *
 * @example
 * ```ts
 * const b = i8.encode(-5);            // [0xFB]
 * i8.decode(b);                        // [-5, 1]
 * ```
 */
export class I8 extends Codec<number> {
	public readonly stride = 1;

	public encode(value: number): Uint8Array {
		const arr = new Uint8Array(1);
		const view = new DataView(arr.buffer);
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
export const i8: I8 = new I8();

/**
 * Codec for unsigned 8-bit integers (uint8).
 *
 * Endianness: N/A (1 byte)
 *
 * @example
 * ```ts
 * const b = u8.encode(255);           // [0xFF]
 * u8.decode(b);                        // [255, 1]
 * ```
 */
export class U8 extends Codec<number> {
	public readonly stride = 1;

	public encode(value: number): Uint8Array {
		const arr = new Uint8Array(1);
		const view = new DataView(arr.buffer);
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
export const u8: U8 = new U8();

/**
 * Codec for signed 16-bit integers (int16).
 * Default is big-endian. Use `{ endian: "le" }` for little-endian.
 *
 * @example
 * ```ts
 * // Big-endian (default)
 * const b = new I16().encode(-2);     // [0xFF, 0xFE]
 * new I16().decode(b);                // [-2, 2]
 *
 * // Little-endian
 * const le = new I16({ endian: "le" }).encode(-2);  // [0xFE, 0xFF]
 * ```
 */
export class I16 extends Codec<number> {
	public readonly stride = 2;
	readonly #littleEndian: boolean;

	constructor(options?: PrimitiveOptions) {
		super();
		this.#littleEndian = options?.endian === "le";
	}

	public encode(value: number): Uint8Array {
		const arr = new Uint8Array(2);
		const view = new DataView(arr.buffer);
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
export const i16: I16 = new I16();

/**
 * Codec for unsigned 16-bit integers (uint16).
 * Default is big-endian. Use `{ endian: "le" }` for little-endian.
 *
 * @example
 * ```ts
 * // Big-endian (default)
 * const b = new U16().encode(513);     // [0x02, 0x01]
 * new U16().decode(b);                // [513, 2]
 *
 * // Little-endian
 * const le = new U16({ endian: "le" }).encode(513);  // [0x01, 0x02]
 * ```
 */
export class U16 extends Codec<number> {
	public readonly stride = 2;
	readonly #littleEndian: boolean;

	constructor(options?: PrimitiveOptions) {
		super();
		this.#littleEndian = options?.endian === "le";
	}

	public encode(value: number): Uint8Array {
		const arr = new Uint8Array(2);
		const view = new DataView(arr.buffer);
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
export const u16: U16 = new U16();

/**
 * Codec for signed 32-bit integers (int32).
 * Default is big-endian. Use `{ endian: "le" }` for little-endian.
 *
 * @example
 * ```ts
 * // Big-endian (default)
 * const b = new I32().encode(-123456); // 4 bytes
 * new I32().decode(b);                // [-123456, 4]
 *
 * // Little-endian
 * const le = new I32({ endian: "le" }).encode(-123456);
 * ```
 */
export class I32 extends Codec<number> {
	public readonly stride = 4;
	readonly #littleEndian: boolean;

	constructor(options?: PrimitiveOptions) {
		super();
		this.#littleEndian = options?.endian === "le";
	}

	public encode(value: number): Uint8Array {
		const arr = new Uint8Array(4);
		const view = new DataView(arr.buffer);
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
export const i32: I32 = new I32();

/**
 * Codec for unsigned 32-bit integers (uint32).
 * Default is big-endian. Use `{ endian: "le" }` for little-endian.
 *
 * @example
 * ```ts
 * // Big-endian (default)
 * const b = new U32().encode(4294967295 >>> 1);
 * new U32().decode(b);                // [value, 4]
 *
 * // Little-endian
 * const le = new U32({ endian: "le" }).encode(4294967295 >>> 1);
 * ```
 */
export class U32 extends Codec<number> {
	public readonly stride = 4;
	readonly #littleEndian: boolean;

	constructor(options?: PrimitiveOptions) {
		super();
		this.#littleEndian = options?.endian === "le";
	}

	public encode(value: number): Uint8Array {
		const arr = new Uint8Array(4);
		const view = new DataView(arr.buffer);
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
export const u32: U32 = new U32();

/**
 * Codec for signed 64-bit integers (bigint).
 * Default is big-endian. Use `{ endian: "le" }` for little-endian.
 *
 * @example
 * ```ts
 * // Big-endian (default)
 * const b = new I64().encode(-123n);
 * new I64().decode(b);                // [-123n, 8]
 *
 * // Little-endian
 * const le = new I64({ endian: "le" }).encode(-123n);
 * ```
 */
export class I64 extends Codec<bigint> {
	public readonly stride = 8;
	readonly #littleEndian: boolean;

	constructor(options?: PrimitiveOptions) {
		super();
		this.#littleEndian = options?.endian === "le";
	}

	public encode(value: bigint): Uint8Array {
		const arr = new Uint8Array(8);
		const view = new DataView(arr.buffer);
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
export const i64: I64 = new I64();

/**
 * Codec for unsigned 64-bit integers (bigint).
 * Default is big-endian. Use `{ endian: "le" }` for little-endian.
 *
 * @example
 * ```ts
 * // Big-endian (default)
 * const b = new U64().encode(9007199254740991n);
 * new U64().decode(b);                // [9007199254740991n, 8]
 *
 * // Little-endian
 * const le = new U64({ endian: "le" }).encode(9007199254740991n);
 * ```
 */
export class U64 extends Codec<bigint> {
	public readonly stride = 8;
	readonly #littleEndian: boolean;

	constructor(options?: PrimitiveOptions) {
		super();
		this.#littleEndian = options?.endian === "le";
	}

	public encode(value: bigint): Uint8Array {
		const arr = new Uint8Array(8);
		const view = new DataView(arr.buffer);
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
export const u64: U64 = new U64();

/**
 * Codec for 32-bit floating point numbers (float32).
 * Default is big-endian. Use `{ endian: "le" }` for little-endian.
 *
 * @example
 * ```ts
 * // Big-endian (default)
 * const b = new F32().encode(Math.fround(1.5));
 * new F32().decode(b);                // [~1.5, 4]
 *
 * // Little-endian
 * const le = new F32({ endian: "le" }).encode(Math.fround(1.5));
 * ```
 */
export class F32 extends Codec<number> {
	public readonly stride = 4;
	readonly #littleEndian: boolean;

	constructor(options?: PrimitiveOptions) {
		super();
		this.#littleEndian = options?.endian === "le";
	}

	public encode(value: number): Uint8Array {
		const arr = new Uint8Array(4);
		const view = new DataView(arr.buffer);
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
export const f32: F32 = new F32();

/**
 * Codec for 64-bit floating point numbers (float64).
 * Default is big-endian. Use `{ endian: "le" }` for little-endian.
 *
 * @example
 * ```ts
 * // Big-endian (default)
 * const b = new F64().encode(1.2345);
 * new F64().decode(b);                // [1.2345, 8]
 *
 * // Little-endian
 * const le = new F64({ endian: "le" }).encode(1.2345);
 * ```
 */
export class F64 extends Codec<number> {
	public readonly stride = 8;
	readonly #littleEndian: boolean;

	constructor(options?: PrimitiveOptions) {
		super();
		this.#littleEndian = options?.endian === "le";
	}

	public encode(value: number): Uint8Array {
		const arr = new Uint8Array(8);
		const view = new DataView(arr.buffer);
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
export const f64: F64 = new F64();

/**
 * Codec for boolean values.
 * Encoded as a single byte: 0x00 = false, 0x01 = true.
 *
 * @example
 * ```ts
 * const b = bool.encode(true);        // [0x01]
 * bool.decode(b);                     // [true, 1]
 * ```
 */
export class Bool extends Codec<boolean> {
	public readonly stride = 1;

	public encode(value: boolean): Uint8Array {
		return new Uint8Array([value ? 1 : 0]);
	}

	public decode(data: Uint8Array): [boolean, number] {
		return [data[0] !== 0, 1];
	}
}
/** Singleton instance of Bool codec */
export const bool: Bool = new Bool();

// Little-endian singleton instances for convenience

/**
 * Singleton instance of I16 codec (little-endian).
 * @example
 * ```ts
 * i16LE.encode(-2);  // [0xFE, 0xFF]
 * ```
 */
export const i16LE: I16 = new I16({ endian: "le" });

/**
 * Singleton instance of U16 codec (little-endian).
 * @example
 * ```ts
 * u16LE.encode(513);  // [0x01, 0x02]
 * ```
 */
export const u16LE: U16 = new U16({ endian: "le" });

/**
 * Singleton instance of I32 codec (little-endian).
 * @example
 * ```ts
 * i32LE.encode(-123456);
 * ```
 */
export const i32LE: I32 = new I32({ endian: "le" });

/**
 * Singleton instance of U32 codec (little-endian).
 * @example
 * ```ts
 * u32LE.encode(4294967295 >>> 1);
 * ```
 */
export const u32LE: U32 = new U32({ endian: "le" });

/**
 * Singleton instance of I64 codec (little-endian).
 * @example
 * ```ts
 * i64LE.encode(-123n);
 * ```
 */
export const i64LE: I64 = new I64({ endian: "le" });

/**
 * Singleton instance of U64 codec (little-endian).
 * @example
 * ```ts
 * u64LE.encode(9007199254740991n);
 * ```
 */
export const u64LE: U64 = new U64({ endian: "le" });

/**
 * Singleton instance of F32 codec (little-endian).
 * @example
 * ```ts
 * f32LE.encode(Math.fround(1.5));
 * ```
 */
export const f32LE: F32 = new F32({ endian: "le" });

/**
 * Singleton instance of F64 codec (little-endian).
 * @example
 * ```ts
 * f64LE.encode(1.2345);
 * ```
 */
export const f64LE: F64 = new F64({ endian: "le" });
