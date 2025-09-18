/**
 * @nomadshiba/codec provides composable binary codecs for TypeScript/JavaScript.
 *
 * Core ideas:
 * - Every codec extends Codec<T> with encode/decode and a stride:
 *   - stride >= 0: fixed-size encoding (bytes)
 *   - stride < 0: variable-size encoding
 * - Numbers use little-endian encoding (DataView LE).
 * - Variable-length fields are prefixed with unsigned LEB128 (varint) length
 *   when nested inside Tuple/Struct/Vector/Mapping as needed.
 *
 * Layout semantics:
 * - Tuple: concatenates each element. Variable-size elements are varint length-prefixed.
 * - Struct: stored exactly as a Tuple in DEFINITION ORDER (order matters).
 * - Vector:
 *   - Fixed-stride element: elements are concatenated (count = totalBytes/stride).
 *   - Variable-stride element: each element is varint length-prefixed.
 * - Enum: 1 byte variant index (sorted by variant name), followed by payload.
 * - Option: 0x00 for null, 0x01 + payload for present.
 * - Mapping: Vector of Tuple [key, value].
 *
 * Quickstart
 * @example
 * ```ts
 * // Primitives
 * import { u32, str } from "@nomadshiba/codec";
 * const b = u32.encode(42);
 * u32.decode(b); // 42
 * ```
 *
 * @example
 * ```ts
 * // Tuple: [u8, str] -> first a byte, then varint length + UTF-8
 * import { u8, str, Tuple } from "@nomadshiba/codec";
 * const T = new Tuple([u8, str] as const);
 * const bytes = T.encode([7, "hi"]); // [0x07, 0x02, 0x68, 0x69]
 * T.decode(bytes); // [7, "hi"]
 * ```
 *
 * @example
 * ```ts
 * // Struct: DEFINITION ORDER MATTERS (serialized exactly as a tuple)
 * import { u32, str, Struct } from "@nomadshiba/codec";
 * const User = new Struct({ id: u32, name: str } as const);
 * const bin = User.encode({ id: 1, name: "Ada" });
 * User.decode(bin); // { id: 1, name: "Ada" }
 * ```
 *
 * @example
 * ```ts
 * // Vector and Mapping
 * import { Vector, Mapping, u16, str } from "@nomadshiba/codec";
 * const Numbers = new Vector(u16);
 * Numbers.decode(Numbers.encode([1, 513])); // [1, 513]
 * const Dict = new Mapping(str, u16);
 * const out = Dict.decode(Dict.encode(new Map([["x", 1], ["y", 2]])));
 * // Map { "x" => 1, "y" => 2 }
 * ```
 *
 * @example
 * ```ts
 * // Enum and Option
 * import { Enum, Option, u8, str } from "@nomadshiba/codec";
 * const MaybeU8 = new Option(u8);
 * MaybeU8.decode(MaybeU8.encode(5)); // 5
 * const MyEnum = new Enum({ A: u8, B: str } as const);
 * const v = MyEnum.decode(MyEnum.encode({ kind: "B", value: "ok" }));
 * // { kind: "B", value: "ok" }
 * ```
 *
 * @example
 * ```ts
 * // Custom codec: Date as u64 milliseconds since epoch
 * import { Codec, u64 } from "@nomadshiba/codec";
 * class DateCodec extends Codec<Date> {
 *   readonly stride = 8;
 *   encode(d: Date) { return u64.encode(BigInt(d.getTime())); }
 *   decode(b: Uint8Array) { return new Date(Number(u64.decode(b))); }
 * }
 * ```
 *
 * Notes
 * - VarInt here is unsigned LEB128 for non-negative JS numbers.
 * - This module does not add container-level length prefixes automatically;
 *   boundaries are determined by stride and varint rules described above.
 *
 * @module
 */

/**
 * Encodes a number as a LEB128-style variable-length integer.
 * Efficient: small numbers use fewer bytes. Uses 7-bit groups with the MSB
 * as a continuation bit, least-significant groups first (little-endian LEB128).
 *
 * Encoding stops when the remaining value fits in 7 bits (MSB = 0).
 *
 * Constraints: value must be a non-negative safe integer (<= Number.MAX_SAFE_INTEGER).
 *
 * @param value - Non-negative integer to encode
 * @returns Encoded bytes
 * @throws {RangeError} If value is negative or not a safe integer
 *
 * @example
 * ```ts
 * // 0..127 encode to a single byte
 * encodeVarInt(0);    // [0x00]
 * encodeVarInt(127);  // [0x7F]
 * ```
 *
 * @example
 * ```ts
 * // 128 = 0b1000_0000 -> two bytes: 0x80 0x01
 * Array.from(encodeVarInt(128)); // [0x80, 0x01]
 * ```
 */
export function encodeVarInt(value: number): Uint8Array {
	if (value < 0 || !Number.isSafeInteger(value)) {
		throw new RangeError("Value must be a non-negative safe integer");
	}
	const parts: number[] = [];
	while (value > 0x7F) {
		parts.push((value & 0x7F) | 0x80);
		value >>>= 7; // shift instead of divide
	}
	parts.push(value & 0x7F);
	return new Uint8Array(parts);
}

/**
 * Decodes a LEB128-style varint from the start of the provided buffer.
 * Returns the decoded value and how many bytes were consumed.
 *
 * The decoder stops at the first byte with MSB = 0. Throws on overflow or
 * if the buffer ends before a terminating byte is found.
 *
 * @param data - Bytes containing the varint
 * @returns { value, bytesRead }
 * @throws {RangeError} If the decoded value exceeds MAX_SAFE_INTEGER
 * @throws {RangeError} If the varint would exceed 53 bits (unsafe for JS number)
 * @throws {Error} If the data ends before the varint terminates
 *
 * @example
 * ```ts
 * const buf = encodeVarInt(300); // e.g. [0xAC, 0x02]
 * const { value, bytesRead } = decodeVarInt(buf);
 * value === 300;      // true
 * bytesRead >= 1;     // true
 * ```
 */
export function decodeVarInt(
	data: Uint8Array,
): { value: number; bytesRead: number } {
	let value = 0;
	let shift = 0;
	let bytesRead = 0;
	for (const byte of data) {
		value |= (byte & 0x7F) << shift;
		bytesRead++;
		if ((byte & 0x80) === 0) {
			if (!Number.isSafeInteger(value)) {
				throw new RangeError("Decoded value exceeds MAX_SAFE_INTEGER");
			}
			return { value, bytesRead };
		}
		shift += 7;
		if (shift > 53) {
			throw new RangeError("VarInt too long for JS safe integer");
		}
	}
	throw new Error("Incomplete VarInt");
}

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
 *   decode(b: Uint8Array) { return new Date(Number(u64.decode(b))); }
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
	 * @returns Decoded value
	 */
	public abstract decode(data: Uint8Array): T;
}

/**
 * Codec for signed 8-bit integers (int8).
 *
 * Endianness: N/A (1 byte)
 *
 * @example
 * ```ts
 * const b = i8.encode(-5);            // [0xFB]
 * i8.decode(b) === -5;                // true
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

	public decode(data: Uint8Array): number {
		const view = new DataView(
			data.buffer,
			data.byteOffset,
			data.byteLength,
		);
		return view.getInt8(0);
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
 * u8.decode(b) === 255;               // true
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

	public decode(data: Uint8Array): number {
		const view = new DataView(
			data.buffer,
			data.byteOffset,
			data.byteLength,
		);
		return view.getUint8(0);
	}
}
/** Singleton instance of U8 codec */
export const u8: U8 = new U8();

/**
 * Codec for signed 16-bit integers (int16), little-endian.
 *
 * @example
 * ```ts
 * const b = i16.encode(-2);           // [0xFE, 0xFF] in LE
 * i16.decode(b) === -2;               // true
 * ```
 */
export class I16 extends Codec<number> {
	public readonly stride = 2;

	public encode(value: number): Uint8Array {
		const arr = new Uint8Array(2);
		const view = new DataView(arr.buffer);
		view.setInt16(0, value, true);
		return arr;
	}

	public decode(data: Uint8Array): number {
		const view = new DataView(
			data.buffer,
			data.byteOffset,
			data.byteLength,
		);
		return view.getInt16(0, true);
	}
}
/** Singleton instance of I16 codec */
export const i16: I16 = new I16();

/**
 * Codec for unsigned 16-bit integers (uint16), little-endian.
 *
 * @example
 * ```ts
 * const b = u16.encode(513);          // [0x01, 0x02] in LE
 * u16.decode(b) === 513;              // true
 * ```
 */
export class U16 extends Codec<number> {
	public readonly stride = 2;

	public encode(value: number): Uint8Array {
		const arr = new Uint8Array(2);
		const view = new DataView(arr.buffer);
		view.setUint16(0, value, true);
		return arr;
	}

	public decode(data: Uint8Array): number {
		const view = new DataView(
			data.buffer,
			data.byteOffset,
			data.byteLength,
		);
		return view.getUint16(0, true);
	}
}
/** Singleton instance of U16 codec */
export const u16: U16 = new U16();

/**
 * Codec for signed 32-bit integers (int32), little-endian.
 *
 * @example
 * ```ts
 * const b = i32.encode(-123456);      // 4 bytes
 * i32.decode(b) === -123456;          // true
 * ```
 */
export class I32 extends Codec<number> {
	public readonly stride = 4;

	public encode(value: number): Uint8Array {
		const arr = new Uint8Array(4);
		const view = new DataView(arr.buffer);
		view.setInt32(0, value, true);
		return arr;
	}

	public decode(data: Uint8Array): number {
		const view = new DataView(
			data.buffer,
			data.byteOffset,
			data.byteLength,
		);
		return view.getInt32(0, true);
	}
}
/** Singleton instance of I32 codec */
export const i32: I32 = new I32();

/**
 * Codec for unsigned 32-bit integers (uint32), little-endian.
 *
 * @example
 * ```ts
 * const b = u32.encode(4294967295 >>> 1); // fits in 32-bit number
 * u32.decode(b);                          // same value
 * ```
 */
export class U32 extends Codec<number> {
	public readonly stride = 4;

	public encode(value: number): Uint8Array {
		const arr = new Uint8Array(4);
		const view = new DataView(arr.buffer);
		view.setUint32(0, value, true);
		return arr;
	}

	public decode(data: Uint8Array): number {
		const view = new DataView(
			data.buffer,
			data.byteOffset,
			data.byteLength,
		);
		return view.getUint32(0, true);
	}
}
/** Singleton instance of U32 codec */
export const u32: U32 = new U32();

/**
 * Codec for signed 64-bit integers (bigint), little-endian.
 *
 * @example
 * ```ts
 * const b = i64.encode(-123n);
 * i64.decode(b) === -123n;            // true
 * ```
 */
export class I64 extends Codec<bigint> {
	public readonly stride = 8;

	public encode(value: bigint): Uint8Array {
		const arr = new Uint8Array(8);
		const view = new DataView(arr.buffer);
		view.setBigInt64(0, value, true);
		return arr;
	}

	public decode(data: Uint8Array): bigint {
		const view = new DataView(
			data.buffer,
			data.byteOffset,
			data.byteLength,
		);
		return view.getBigInt64(0, true);
	}
}
/** Singleton instance of I64 codec */
export const i64: I64 = new I64();

/**
 * Codec for unsigned 64-bit integers (bigint), little-endian.
 *
 * @example
 * ```ts
 * const b = u64.encode(9007199254740991n); // MAX_SAFE_INTEGER as bigint
 * u64.decode(b) === 9007199254740991n;     // true
 * ```
 */
export class U64 extends Codec<bigint> {
	public readonly stride = 8;

	public encode(value: bigint): Uint8Array {
		const arr = new Uint8Array(8);
		const view = new DataView(arr.buffer);
		view.setBigUint64(0, value, true);
		return arr;
	}

	public decode(data: Uint8Array): bigint {
		const view = new DataView(
			data.buffer,
			data.byteOffset,
			data.byteLength,
		);
		return view.getBigUint64(0, true);
	}
}
/** Singleton instance of U64 codec */
export const u64: U64 = new U64();

/**
 * Codec for 32-bit floating point numbers (float32), little-endian.
 *
 * @example
 * ```ts
 * const b = f32.encode(Math.fround(1.5));
 * f32.decode(b);                      // ~1.5
 * ```
 */
export class F32 extends Codec<number> {
	public readonly stride = 4;

	public encode(value: number): Uint8Array {
		const arr = new Uint8Array(4);
		const view = new DataView(arr.buffer);
		view.setFloat32(0, value, true);
		return arr;
	}

	public decode(data: Uint8Array): number {
		const view = new DataView(
			data.buffer,
			data.byteOffset,
			data.byteLength,
		);
		return view.getFloat32(0, true);
	}
}
/** Singleton instance of F32 codec */
export const f32: F32 = new F32();

/**
 * Codec for 64-bit floating point numbers (float64), little-endian.
 *
 * @example
 * ```ts
 * const b = f64.encode(1.2345);
 * f64.decode(b) === 1.2345;           // true
 * ```
 */
export class F64 extends Codec<number> {
	public readonly stride = 8;

	public encode(value: number): Uint8Array {
		const arr = new Uint8Array(8);
		const view = new DataView(arr.buffer);
		view.setFloat64(0, value, true);
		return arr;
	}

	public decode(data: Uint8Array): number {
		const view = new DataView(
			data.buffer,
			data.byteOffset,
			data.byteLength,
		);
		return view.getFloat64(0, true);
	}
}
/** Singleton instance of F64 codec */
export const f64: F64 = new F64();

/**
 * Codec for boolean values.
 * Encoded as a single byte: 0x00 = false, 0x01 = true.
 *
 * @example
 * ```ts
 * const b = bool.encode(true);        // [0x01]
 * bool.decode(b) === true;            // true
 * ```
 */
export class Bool extends Codec<boolean> {
	public readonly stride = 1;

	public encode(value: boolean): Uint8Array {
		return new Uint8Array([value ? 1 : 0]);
	}

	public decode(data: Uint8Array): boolean {
		return data[0] !== 0;
	}
}
/** Singleton instance of Bool codec */
export const bool: Bool = new Bool();

/**
 * Codec for UTF-8 encoded strings.
 * Variable length. No length prefix is added by this codec itself.
 * Use inside Tuple/Vector/etc. to delineate boundaries (via varint length).
 *
 * @example
 * ```ts
 * const raw = str.encode("hi");       // [0x68, 0x69]
 * str.decode(raw) === "hi";           // true
 * ```
 */
export class Str extends Codec<string> {
	public readonly stride = -1;
	private readonly encoder = new TextEncoder();
	private readonly decoder = new TextDecoder();

	public encode(value: string): Uint8Array {
		return this.encoder.encode(value);
	}

	public decode(data: Uint8Array): string {
		return this.decoder.decode(data);
	}
}
/** Singleton instance of Str codec */
export const str: Str = new Str();

/**
 * Codec for raw byte arrays.
 * Variable length. Pass-through of provided bytes.
 *
 * @example
 * ```ts
 * const b = bytes.encode(new Uint8Array([1,2,3]));
 * bytes.decode(b);                    // Uint8Array([1,2,3])
 * ```
 */
export class Bytes extends Codec<Uint8Array> {
	public readonly stride = -1;
	public encode(value: Uint8Array): Uint8Array {
		return value;
	}
	public decode(data: Uint8Array): Uint8Array {
		return data;
	}
}
/** Singleton instance of Bytes codec */
export const bytes: Bytes = new Bytes();

/**
 * Type definitions for Option codec
 *
 * @example
 * ```ts
 * // Value<string> is string | null
 * type V = Option.Value<string>;
 * ```
 */
export declare namespace Option {
	/**
	 * Value that can be either of type T or null
	 */
	export type Value<T> = T | null;

	/**
	 * Infers the JavaScript type from an Option codec
	 */
	export type Infer<T extends Codec<unknown>> = Codec.Infer<T> | null;
}

/**
 * Codec for optional values (present or null).
 *
 * Encoding:
 * - 0x00 => null
 * - 0x01 => followed by payload bytes encoded with the inner codec
 *
 * @template T - The inner value type
 *
 * @example
 * ```ts
 * const maybeU8 = new Option(u8);
 * Array.from(maybeU8.encode(null));        // [0x00]
 * Array.from(maybeU8.encode(7));           // [0x01, 0x07]
 * maybeU8.decode(new Uint8Array([0]))      // null
 * maybeU8.decode(new Uint8Array([1, 9]))   // 9
 * ```
 */
export class Option<T> extends Codec<Option.Value<T>> {
	private readonly codec: Codec<T>;
	public readonly stride = -1;

	constructor(codec: Codec<T>) {
		super();
		this.codec = codec;
	}

	public encode(value: Option.Value<T>): Uint8Array {
		if (value === null) {
			return new Uint8Array([0]);
		} else {
			const encoded = this.codec.encode(value);
			const result = new Uint8Array(1 + encoded.length);
			result[0] = 1;
			result.set(encoded, 1);
			return result;
		}
	}

	public decode(data: Uint8Array): Option.Value<T> {
		if (data[0] === 0) {
			return null;
		} else {
			return this.codec.decode(data.subarray(1));
		}
	}
}

/**
 * Type definitions for Tuple codec
 *
 * @example
 * ```ts
 * // Infer<[U8, Str]> -> [number, string]
 * type T = Tuple.Infer<[U8, Str]>;
 * ```
 */
export declare namespace Tuple {
	/**
	 * Infers the JavaScript tuple type from an array of codecs
	 */
	export type Infer<T extends readonly Codec<unknown>[]> = {
		[K in keyof T]: Codec.Infer<T[K]>;
	};

	/**
	 * Maps tuple elements to their corresponding codecs
	 */
	export type Codecs<T extends readonly unknown[]> =
		| { readonly [I in keyof T]: Codec<T[I]> }
		| { -readonly [I in keyof T]: Codec<T[I]> };
}

/**
 * Codec for fixed-length tuples of potentially different types.
 *
 * Encoding (no overall length):
 * - For each element in order:
 *   - If element codec has fixed stride (>= 0): append raw bytes
 *   - If variable stride (< 0): prefix with VarInt length, then append bytes
 *
 * Decoding reads each element in order using stride or varint length.
 *
 * @template T - Tuple element types
 *
 * @example
 * ```ts
 * // [u8, str]: first byte is u8, then varint length + UTF-8 for str
 * const t = new Tuple([u8, str] as const);
 * const enc = t.encode([5, "hi"]);   // [0x05, 0x02, 0x68, 0x69]
 * t.decode(enc);                     // [5, "hi"]
 * ```
 */
export class Tuple<const T extends readonly unknown[]> extends Codec<T> {
	public readonly codecs: Tuple.Codecs<T>;
	public readonly stride: number;

	constructor(codecs: Tuple.Codecs<T>) {
		super();
		this.codecs = codecs;
		this.stride = 0;
		for (const codec of codecs) {
			if (codec.stride < 0) {
				this.stride = -1;
				break;
			}
			this.stride += codec.stride;
		}
	}

	// if a codec has fixed stride, dont add varint overhead.
	// if a codec has null stride, add varint overhead.
	public encode(value: T): Uint8Array {
		const parts: Uint8Array[] = [];
		for (let i = 0; i < this.codecs.length; i++) {
			const codec = this.codecs[i]!;
			const part = codec.encode(value[i]!);
			if (codec.stride < 0) {
				parts.push(encodeVarInt(part.length));
			}
			parts.push(part);
		}

		const combinedLength = parts.reduce(
			(sum, part) => sum + part.length,
			0,
		);
		const combined = new Uint8Array(combinedLength);
		let offset = 0;
		for (const part of parts) {
			combined.set(part, offset);
			offset += part.length;
		}
		return combined;
	}

	public decode(data: Uint8Array): T {
		const result: unknown[] = [];
		let offset = 0;
		for (let i = 0; i < this.codecs.length; i++) {
			const codec = this.codecs[i]!;
			let length = codec.stride;
			if (length < 0) {
				const { value, bytesRead } = decodeVarInt(
					data.subarray(offset),
				);
				length = value;
				offset += bytesRead;
			}
			const part = data.subarray(offset, offset + length);
			result[i] = codec.decode(part);
			offset += length;
		}
		return result as never;
	}
}

/**
 * Type definitions for Struct codec
 *
 * @example
 * ```ts
 * // Struct.Infer<{ id: U32, name: Str }> -> { id: number, name: string }
 * type S = Struct.Infer<{ id: U32, name: Str }>;
 * ```
 */
export declare namespace Struct {
	/**
	 * Infers the JavaScript object type from a record of codecs
	 */
	export type Infer<T extends Readonly<Record<string, Codec<unknown>>>> = {
		[K in keyof T]: Codec.Infer<T[K]>;
	};

	/**
	 * Maps struct fields to their corresponding codecs
	 */
	export type Codecs<T extends Readonly<Record<string, unknown>>> =
		| { readonly [K in keyof T]: Codec<T[K]> }
		| { -readonly [K in keyof T]: Codec<T[K]> };
}

/**
 * Codec for structured objects with named fields.
 *
 * Layout is the same as a Tuple of fields in DEFINITION ORDER.
 * Definition order matters because the binary is a tuple, not a map.
 *
 * For variable-length fields, each field is prefixed with a VarInt length
 * (handled by Tuple), while fixed-size fields are concatenated directly.
 *
 * @template T - Record mapping field names to codecs
 *
 * @example
 * ```ts
 * // Definition order: id (u32) then name (str)
 * const User = new Struct({ id: u32, name: str } as const);
 * const bin = User.encode({ id: 42, name: "Ada" });
 * // Decodes back to the same object
 * User.decode(bin); // { id: 42, name: "Ada" }
 * ```
 *
 * @example
 * ```ts
 * // Reordering fields changes the binary layout
 * const User2 = new Struct({ name: str, id: u32 } as const);
 * // User.encode(...) is NOT compatible with User2.decode(...)
 * ```
 */
export class Struct<
	const T extends Readonly<Record<string, unknown>>,
> extends Codec<T> {
	public readonly stride: number;
	public readonly shape: Struct.Codecs<T>;

	private readonly keys: (keyof T)[];
	private readonly tuple: Tuple<T[keyof T][]>;

	constructor(shape: Struct.Codecs<T>) {
		super();
		this.shape = shape;
		this.keys = Object.keys(shape) as Extract<keyof T, string>[]; // definition order
		this.tuple = new Tuple(this.keys.map((key) => shape[key])) as never;
		this.stride = this.tuple.stride;
	}

	public encode(value: T): Uint8Array {
		const tupleValue = this.keys.map((key) => value[key]);
		return this.tuple.encode(tupleValue);
	}

	public decode(data: Uint8Array): T {
		const tupleValue = this.tuple.decode(data);
		const result: Partial<T> = {};
		for (let i = 0; i < this.keys.length; i++) {
			const key = this.keys[i]!;
			result[key] = tupleValue[i]!;
		}
		return result as T;
	}
}

/**
 * Type definitions for Vector codec
 *
 * @example
 * ```ts
 * // Vector.Infer<U16> -> number[]
 * type V = Vector.Infer<U16>;
 * ```
 */
export declare namespace Vector {
	/**
	 * Array of values of type T
	 */
	export type Value<T> = T[];

	/**
	 * Infers the JavaScript array type from a codec
	 */
	export type Infer<T extends Codec<unknown>> = Codec.Infer<T>[];
}

/**
 * Codec for variable-length arrays of the same element type.
 *
 * Encoding:
 * - If element codec has fixed stride: elements are concatenated with no length
 *   prefix (count is implied by total bytes / stride)
 * - If variable stride: each element is prefixed with a VarInt length
 * No array length prefix is written by this codec.
 *
 * @template T - Element type
 *
 * @example
 * ```ts
 * // Fixed-stride elements
 * const nums = new Vector(u16);
 * const b = nums.encode([1, 513]);         // [0x01,0x00, 0x01,0x02]
 * nums.decode(b);                           // [1, 513]
 * ```
 *
 * @example
 * ```ts
 * // Variable-stride elements
 * const words = new Vector(str);
 * const wb = words.encode(["a", "bc"]);    // [0x01, 'a', 0x02, 'b', 'c']
 * words.decode(wb);                         // ["a", "bc"]
 * ```
 */
export class Vector<T> extends Codec<Vector.Value<T>> {
	public readonly stride = -1;
	public readonly codec: Codec<T>;

	constructor(codec: Codec<T>) {
		super();
		this.codec = codec;
	}

	public encode(value: Vector.Value<T>): Uint8Array {
		if (this.codec.stride >= 0) {
			const parts = new Uint8Array(value.length * this.codec.stride);
			for (let i = 0; i < value.length; i++) {
				const part = this.codec.encode(value[i]!);
				parts.set(part, i * this.codec.stride);
			}
			return parts;
		} else {
			const parts: Uint8Array[] = [];
			for (const item of value) {
				const part = this.codec.encode(item);
				parts.push(encodeVarInt(part.length));
				parts.push(part);
			}

			const combinedLength = parts.reduce(
				(sum, part) => sum + part.length,
				0,
			);
			const combined = new Uint8Array(combinedLength);
			let offset = 0;
			for (const part of parts) {
				combined.set(part, offset);
				offset += part.length;
			}
			return combined;
		}
	}

	public decode(data: Uint8Array): Vector.Value<T> {
		const result: T[] = [];
		let offset = 0;
		if (this.codec.stride >= 0) {
			while (offset + this.codec.stride <= data.length) {
				const part = data.subarray(offset, offset + this.codec.stride);
				result.push(this.codec.decode(part));
				offset += this.codec.stride;
			}
		} else {
			while (offset < data.length) {
				const { value: length, bytesRead } = decodeVarInt(
					data.subarray(offset),
				);
				offset += bytesRead;
				const part = data.subarray(offset, offset + length);
				result.push(this.codec.decode(part));
				offset += length;
			}
		}
		return result;
	}
}

/**
 * Type definitions for Enum codec
 *
 * @example
 * ```ts
 * // Value<{ A: number, B: string }> -> { kind: "A", value: number } | ...
 * type E = Enum.Value<{ A: number, B: string }>;
 * ```
 */
export declare namespace Enum {
	/**
	 * Tagged union type representing an enum variant
	 */
	export type Value<T extends Readonly<Record<string, unknown>>> = {
		[K in keyof T]: { kind: K; value: T[K] };
	}[keyof T];

	/**
	 * Infers the JavaScript tagged union type from a record of codecs
	 */
	export type Infer<T extends Readonly<Record<string, Codec<unknown>>>> = {
		[K in keyof T]: { kind: K; value: Codec.Infer<T[K]> };
	}[keyof T];

	/**
	 * Maps enum variants to their corresponding codecs
	 */
	export type Codecs<T extends Readonly<Record<string, unknown>>> =
		| { readonly [K in keyof T]: Codec<T[K]> }
		| { -readonly [K in keyof T]: Codec<T[K]> };
}

/**
 * Codec for tagged unions (enums).
 *
 * Variant index is determined by sorting variant names ascending
 * (Object.keys(variants).sort()).
 *
 * Encoding:
 * - 1 byte: variant index (sorted by name)
 * - payload: bytes encoded by the variant's codec
 *
 * Decoding returns { kind, value }.
 *
 * @template T - Record mapping variant names to codecs
 *
 * @example
 * ```ts
 * const MyEnum = new Enum({ A: u8, B: str } as const);
 * const b = MyEnum.encode({ kind: "B", value: "ok" });
 * const v = MyEnum.decode(b); // { kind: "B", value: "ok" }
 * ```
 */
export class Enum<
	const T extends Readonly<Record<string, unknown>>,
> extends Codec<Enum.Value<T>> {
	public readonly stride = -1;
	public readonly variants: Enum.Codecs<T>;
	private readonly keys: (keyof T)[];

	constructor(variants: Enum.Codecs<T>) {
		super();
		this.variants = variants;
		this.keys = Object.keys(variants).sort() as (keyof T)[];
	}

	public encode(value: Enum.Value<T>): Uint8Array {
		const index = this.keys.indexOf(value.kind);
		if (index === -1) {
			throw new Error(`Invalid enum variant: ${String(value.kind)}`);
		}
		const codec = this.variants[value.kind]!;
		const encodedValue = codec.encode(value.value as never);
		return new Uint8Array([index, ...encodedValue]);
	}

	public decode(data: Uint8Array): Enum.Value<T> {
		const index = data[0]!;
		if (index >= this.keys.length) {
			throw new Error(`Invalid enum index: ${index}`);
		}
		const key = this.keys[index]!;
		const codec = this.variants[key]!;
		const value = codec.decode(data.subarray(1));
		return { kind: key, value } as never;
	}
}

/**
 * Type definitions for Mapping codec
 *
 * @example
 * ```ts
 * // Infer<Str, U8> -> Map<string, number>
 * type M = Mapping.Infer<Str, U8>;
 * ```
 */
export declare namespace Mapping {
	/**
	 * Map from keys of type K to values of type V
	 */
	export type Value<K, V> = Map<K, V>;

	/**
	 * Infers the JavaScript Map type from key and value codecs
	 */
	export type Infer<K extends Codec<unknown>, V extends Codec<unknown>> = Map<
		Codec.Infer<K>,
		Codec.Infer<V>
	>;
}

/**
 * Codec for key-value mappings.
 *
 * Encoded as a Vector of Tuple [key, value].
 * - If [key,value] is fixed-stride: entries are concatenated (count implied)
 * - If variable: each entry is prefixed with a VarInt length (via Tuple rules)
 *
 * @template K - Key type
 * @template V - Value type
 *
 * @example
 * ```ts
 * const Dict = new Mapping(str, u8);
 * const map = new Map<string, number>([["x", 1], ["y", 2]]);
 * const b = Dict.encode(map);
 * const out = Dict.decode(b);   // Map { "x" => 1, "y" => 2 }
 * ```
 */
export class Mapping<K, V> extends Codec<Mapping.Value<K, V>> {
	public readonly stride = -1;
	#entriesCodec: Vector<[K, V]>;

	constructor(keyCodec: Codec<K>, valueCodec: Codec<V>) {
		super();
		this.#entriesCodec = new Vector(new Tuple([keyCodec, valueCodec]));
	}

	public encode(value: Mapping.Value<K, V>): Uint8Array {
		// Use standard iteration to array conversion
		return this.#entriesCodec.encode(Array.from(value.entries()));
	}

	public decode(data: Uint8Array): Mapping.Value<K, V> {
		const entries = this.#entriesCodec.decode(data);
		return new Map(entries);
	}
}
