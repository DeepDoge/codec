/**
 * @nomadshiba/codec provides composable binary codecs for TypeScript/JavaScript.
 *
 * Core ideas:
 * - Every codec extends Codec<T> with encode/decode and a stride:
 *   - stride >= 0: fixed-size encoding (bytes)
 *   - stride < 0: variable-size encoding
 * - Numbers default to big-endian encoding (DataView). Little-endian variants available.
 * - Variable-length types encode their own size using unsigned LEB128 (VarInt) prefix.
 * - Composite types (Tuple, Struct, Vector, etc.) handle boundaries via element stride
 *
 * Layout semantics:
 * - Primitive types (U8, I32, F64, etc.): fixed-size, use stride.
 * - Str: VarInt length prefix + UTF-8 bytes.
 * - Bytes (variable): VarInt length prefix + raw bytes.
 * - Bytes (fixed): raw bytes only, size known from stride.
 * - Tuple: concatenates each element (no wrapper prefix). Fixed-size elements use stride,
 *   variable-size elements include their own size info.
 * - Struct: stored exactly as a Tuple in DEFINITION ORDER (order matters).
 * - Vector: VarInt count prefix (number of items) + concatenated elements.
 *   Elements determine their own boundaries via stride.
 * - Enum: 1 byte variant index (sorted by variant name), followed by payload.
 * - Option: 0x00 for null, 0x01 + payload for present.
 * - Mapping: Vector of Tuple [key, value].
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
export * from "./codec.ts";

// VarInt (LEB128 encoding for non-negative integers)
export * from "./varint.ts";

// Primitives (big-endian default, little-endian variants available)
export * from "./primitives.ts";

// Bytes & Strings
export * from "./bytes.ts";

// Composites
export * from "./composites.ts";
