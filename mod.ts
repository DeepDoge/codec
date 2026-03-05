/**
 * @nomadshiba/codec provides composable binary codecs for TypeScript/JavaScript.
 *
 * Core ideas:
 * - Every codec extends Codec<T> with encode/decode and a stride:
 *   - stride >= 0: fixed-size encoding (bytes)
 *   - stride < 0: variable-size encoding
 * - Numbers default to big-endian encoding (DataView). Little-endian variants available.
 * - Variable-length types encode their own size using unsigned LEB128 (varint) prefix.
 * - Composite types (Tuple, Struct, Vector, etc.) handle boundaries via element stride
 *
 * Layout semantics:
 * - Primitive types (u8, i32, f64, etc.): fixed-size, use stride.
 * - Str: varint length prefix + UTF-8 bytes.
 * - Bytes (variable): varint length prefix + raw bytes.
 * - Bytes (fixed): raw bytes only, size known from stride.
 * - Tuple: concatenates each element (no wrapper prefix). Fixed-size elements use stride,
 *   variable-size elements include their own size info.
 * - Struct: stored exactly as a Tuple in DEFINITION ORDER (order matters).
 * - Vector: varint count prefix (number of items) + concatenated elements.
 *   Elements determine their own boundaries via stride.
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
 * u32.decode(b); // [42, 4]
 * ```
 *
 * @example
 * ```ts
 * // Tuple: [u8, str] -> first a byte, then str with varint length
 * import { u8, str, Tuple } from "@nomadshiba/codec";
 * const T = new Tuple([u8, str] as const);
 * const bytes = T.encode([7, "hi"]); // [0x07, 0x02, 0x68, 0x69]
 * T.decode(bytes); // [[7, "hi"], 4]
 * ```
 *
 * @example
 * ```ts
 * // Struct: DEFINITION ORDER MATTERS (serialized exactly as a tuple)
 * import { u32, str, Struct } from "@nomadshiba/codec";
 * const User = new Struct({ id: u32, name: str } as const);
 * const bin = User.encode({ id: 1, name: "Ada" });
 * User.decode(bin); // [{ id: 1, name: "Ada" }, size]
 * ```
 *
 * @example
 * ```ts
 * // Vector and Mapping
 * import { Vector, Mapping, u16, str } from "@nomadshiba/codec";
 * const Numbers = new Vector(u16);
 * Numbers.decode(Numbers.encode([1, 513])); // [[1, 513], size]
 * const Dict = new Mapping(str, u16);
 * const out = Dict.decode(Dict.encode(new Map([["x", 1], ["y", 2]])));
 * // [Map { "x" => 1, "y" => 2 }, size]
 * ```
 *
 * @example
 * ```ts
 * // Enum and Option
 * import { Enum, Option, u8, str } from "@nomadshiba/codec";
 * const MaybeU8 = new Option(u8);
 * MaybeU8.decode(MaybeU8.encode(5)); // [5, 2]
 * const MyEnum = new Enum({ A: u8, B: str } as const);
 * const v = MyEnum.decode(MyEnum.encode({ kind: "B", value: "ok" }));
 * // [{ kind: "B", value: "ok" }, size]
 * ```
 *
 * @example
 * ```ts
 * // Custom codec: Date as u64 milliseconds since epoch
 * import { Codec, u64 } from "@nomadshiba/codec";
 * class DateCodec extends Codec<Date> {
 *   readonly stride = 8;
 *   encode(d: Date) { return u64.encode(BigInt(d.getTime())); }
 *   decode(b: Uint8Array) { return [new Date(Number(u64.decode(b)[0])), 8]; }
 * }
 * ```
 *
 * Notes
 * - VarInt here is unsigned LEB128 for non-negative JS numbers.
 * - Self-delimiting types (Str, variable Bytes, Vector) encode their own size.
 * - Big-endian is the default for primitives (network byte order).
 * - Little-endian variants are available for x86 systems and Bitcoin.
 *
 * @module
 */

// Base codec class
export { Codec } from "./codec.ts";

// VarInt (LEB128 encoding for non-negative integers)
export {
	/** VarInt codec class */
	VarInt,
	/** Singleton instance of VarInt codec */
	varint,
} from "./varint.ts";

// Primitives (big-endian default, little-endian variants available)
export {
	Bool,
	bool,
	F32,
	f32,
	f32LE,
	F64,
	f64,
	f64LE,
	I16,
	i16,
	// Little-endian singleton instances
	i16LE,
	I32,
	i32,
	i32LE,
	I64,
	i64,
	i64LE,
	I8,
	i8,
	U16,
	u16,
	u16LE,
	U32,
	u32,
	u32LE,
	U64,
	u64,
	u64LE,
	U8,
	u8,
} from "./primitives.ts";
export type { PrimitiveOptions } from "./primitives.ts";

// Bytes & Strings
export { Bytes, bytes, Str, str } from "./bytes.ts";
export type { BytesOptions, StrOptions } from "./bytes.ts";

// Composites
export { Enum, Mapping, Option, Struct, Tuple, Vector } from "./composites.ts";
export type {
	EnumOptions,
	MappingOptions,
	VectorOptions,
} from "./composites.ts";
