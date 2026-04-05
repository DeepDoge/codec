/**
 * `@nomadshiba/codec` — composable binary codecs for TypeScript and JavaScript.
 *
 * Every codec is an instance of `Codec<O, I>` with three members:
 * - `encode(value, target?)` — serialise a value to a `Uint8Array<ArrayBuffer>`.
 *   Pass an optional `target` buffer to avoid allocation.
 * - `decode(data)` — deserialise and return `[value, bytesConsumed]`.
 * - `stride` — `>= 0` for fixed-size types, `< 0` for variable-size types.
 *
 * Primitives default to big-endian (network byte order). Little-endian
 * singletons (`U16LE`, `I32LE`, etc.) are available for x86/Bitcoin use cases.
 *
 * Variable-length types are self-delimiting: they prefix their payload with an
 * unsigned LEB128 count or length so the decoder knows where they end.
 *
 * Wire-format summary:
 * - Primitives (`U8`, `I32`, `F64`, …) — raw fixed-width bytes.
 * - `VarInt` — unsigned LEB128, 1–8 bytes, non-negative JS safe integers only.
 * - `Str` / `StringCodec` — `VarInt` length prefix + UTF-8 bytes.
 * - `Bytes` / `BytesCodec` (variable) — `VarInt` length prefix + raw bytes.
 * - `BytesCodec` (fixed) — raw bytes only; size is known from `stride`.
 * - `TupleCodec` — elements concatenated in order, no wrapper prefix.
 * - `StructCodec` — same as Tuple, fields in **definition order**.
 * - `ArrayCodec` — `VarInt` (or custom) count prefix + concatenated elements.
 * - `UnionCodec` — `U8` (or custom) variant index + payload. Variants sorted
 *   alphabetically for stable indices.
 * - `NullableCodec` / `OptionalCodec` — `0x00` for absent, `0x01` + payload
 *   for present.
 * - `MappingCodec` — encoded as an array of `[key, value]` tuples.
 *
 * Use `Codec.Infer<T>`, `Codec.InferInput<T>`, and `Codec.InferOutput<T>` to
 * derive TypeScript types from codec instances.
 *
 * Use `.transform(fn)` on any codec to wrap it with a post-decode
 * transformation without changing the encoding behaviour.
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
