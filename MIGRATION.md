# Migration Guide

This document helps you migrate between versions of `@nomadshiba/codec`.

---

## 0.1.0

### Default Endianness Changed

Numeric codecs previously defaulted to **little-endian (LE)**. They now default
to **big-endian (BE)**.

Use `*LE` variants when little-endian encoding is required:

| Codec  | Before (LE)        | After (LE)           | After (BE, default) |
| ------ | ------------------ | -------------------- | ------------------- |
| 16-bit | `i16.encode(42)`   | `i16LE.encode(42)`   | `i16.encode(42)`    |
|        | `u16.encode(42)`   | `u16LE.encode(42)`   | `u16.encode(42)`    |
| 32-bit | `i32.encode(42)`   | `i32LE.encode(42)`   | `i32.encode(42)`    |
|        | `u32.encode(42)`   | `u32LE.encode(42)`   | `u32.encode(42)`    |
|        | `f32.encode(3.14)` | `f32LE.encode(3.14)` | `f32.encode(3.14)`  |
| 64-bit | `i64.encode(42n)`  | `i64LE.encode(42n)`  | `i64.encode(42n)`   |
|        | `u64.encode(42n)`  | `u64LE.encode(42n)`  | `u64.encode(42n)`   |
|        | `f64.encode(3.14)` | `f64LE.encode(3.14)` | `f64.encode(3.14)`  |

---

### VarInt API Changed

The following functions have been removed:

- `encodeVarInt`
- `decodeVarInt`

**Migration:**

```ts
// Before
import { decodeVarInt, encodeVarInt } from "@nomadshiba/codec";
const bytes = encodeVarInt(123);
const [value, size] = decodeVarInt(bytes);

// After
import { varint } from "@nomadshiba/codec";
const bytes = varint.encode(123);
const [value, size] = varint.decode(bytes);
```

---

### Removed Singletons

The following singletons were removed:

- `str`
- `bytes`

**Migration:**

```ts
// Before
import { bytes, str } from "@nomadshiba/codec";
const encoded = str.encode("hello");
const decoded = bytes.decode(data);

// After
import { BytesCodec, StringCodec } from "@nomadshiba/codec";
const str = new StringCodec();
const bytes = new BytesCodec();
const encoded = str.encode("hello");
const decoded = bytes.decode(data);
```

---

### Codec Class Renaming

All codec classes now include the `Codec` suffix.

| Before    | After          |
| --------- | -------------- |
| `I8`      | `I8Codec`      |
| `U8`      | `U8Codec`      |
| `I16`     | `I16Codec`     |
| `U16`     | `U16Codec`     |
| `I32`     | `I32Codec`     |
| `U32`     | `U32Codec`     |
| `I64`     | `I64Codec`     |
| `U64`     | `U64Codec`     |
| `F32`     | `F32Codec`     |
| `F64`     | `F64Codec`     |
| `VarInt`  | `VarIntCodec`  |
| `String`  | `StringCodec`  |
| `Bytes`   | `BytesCodec`   |
| `Option`  | `OptionCodec`  |
| `Tuple`   | `TupleCodec`   |
| `Struct`  | `StructCodec`  |
| `Array`   | `ArrayCodec`   |
| `Enum`    | `EnumCodec`    |
| `Mapping` | `MappingCodec` |

**Note:** Primitive singleton instances remain unchanged:

```ts
// These still work as before
import {
    bool,
    f32,
    f64,
    i16,
    i32,
    i64,
    i8,
    u16,
    u32,
    u64,
    u8,
    varint,
} from "@nomadshiba/codec";
```

---

### Composite Codec Type Changes

Type inference has been significantly improved. The old namespace-based type helpers have been replaced with direct generic types that work with codec instances:

| Before Pattern                 | After Pattern                    |
| ------------------------------ | -------------------------------- |
| `OptionCodec.Value<number>`    | `OptionValue<U8Codec>`           |
| `OptionCodec.Infer<U8Codec>`   | `OptionValue<U8Codec>`           |
| `TupleCodec.Infer<[U8, U16]>`  | `TupleValue<[U8Codec, U16Codec]>` |
| `TupleCodec.Codecs<T>`         | `T` (direct inference)           |
| `StructCodec.Infer<S>`         | `StructValue<S>`                 |
| `StructCodec.Codecs<T>`        | `T` (direct inference)           |
| `ArrayCodec.Value<string>`     | `ArrayValue<StringCodec>`        |
| `ArrayCodec.Infer<StringCodec>`| `ArrayValue<StringCodec>`        |
| `EnumCodec.Value<E>`           | `EnumValue<E>`                   |
| `EnumCodec.Infer<E>`           | `EnumValue<E>`                   |
| `EnumCodec.Codecs<T>`          | `T` (direct inference)           |
| `MappingCodec.Value<K, V>`     | `MappingValue<[K, V]>`           |
| `MappingCodec.Infer<K, V>`     | `MappingValue<[K, V]>`           |

**Key changes:**

1. Types now take codec instances (e.g., `U8Codec`) instead of the raw TypeScript types (e.g., `number`)
2. `MappingCodec` now uses a tuple `[keyCodec, valueCodec]` for both the constructor and its type parameter
3. Helper types are now flat exports rather than nested namespaces

**Migration:**

```ts
// Before
import { OptionCodec, TupleCodec, StructCodec, ArrayCodec, EnumCodec } from "@nomadshiba/codec";

const maybeU8 = new OptionCodec(u8);
type MaybeU8 = OptionCodec.Value<number>;  // number | null

const pointCodec = new TupleCodec([u8, u16] as const);
type Point = TupleCodec.Infer<[U8Codec, U16Codec]>;  // [number, number]

const userCodec = new StructCodec({ id: u32, name: str } as const);
type User = StructCodec.Infer<typeof userCodec.shape>;  // { id: number, name: string }

const namesCodec = new ArrayCodec(str);
type Names = ArrayCodec.Value<string>;  // string[]

const eventCodec = new EnumCodec({ Click: u8, Message: str } as const);
type Event = EnumCodec.Value<{ Click: number, Message: string }>;
// { kind: "Click", value: number } | { kind: "Message", value: string }

const dictCodec = new MappingCodec(str, u8);
type Dict = MappingCodec.Value<string, number>;  // Map<string, number>

// After
import { 
  OptionCodec, OptionValue,
  TupleCodec, TupleValue, 
  StructCodec, StructValue,
  ArrayCodec, ArrayValue,
  EnumCodec, EnumValue,
  MappingCodec, MappingValue
} from "@nomadshiba/codec";

const maybeU8 = new OptionCodec(u8);
type MaybeU8 = OptionValue<typeof maybeU8>;  // number | null

const pointCodec = new TupleCodec([u8, u16]);
type Point = TupleValue<typeof pointCodec>;  // [number, number]

const userCodec = new StructCodec({ id: u32, name: str });
type User = StructValue<typeof userCodec>;  // { id: number, name: string }

const namesCodec = new ArrayCodec(str);
type Names = ArrayValue<typeof namesCodec>;  // string[]

const eventCodec = new EnumCodec({ Click: u8, Message: str });
type Event = EnumValue<typeof eventCodec>;  
// { kind: "Click", value: number } | { kind: "Message", value: string }

const dictCodec = new MappingCodec([str, u8]);
type Dict = MappingValue<typeof dictCodec>;  // Map<string, number>
```

---

### MappingCodec Constructor Signature Changed

`MappingCodec` now takes a tuple of `[keyCodec, valueCodec]` instead of separate arguments.

**Migration:**

```ts
// Before
import { MappingCodec, StringCodec, u8 } from "@nomadshiba/codec";
const Dict = new MappingCodec(new StringCodec(), u8);

// After
import { MappingCodec, StringCodec, u8 } from "@nomadshiba/codec";
const Dict = new MappingCodec([new StringCodec(), u8]);
```

---

### `as const` No Longer Required

TypeScript now infers types correctly without explicit `as const` assertions.

**Migration:**

```ts
// Before
import { TupleCodec, StructCodec, EnumCodec } from "@nomadshiba/codec";
const t = new TupleCodec([u8, u16] as const);
const s = new StructCodec({ id: u32, name: str } as const);
const e = new EnumCodec({ A: u8, B: str } as const);

// After
import { TupleCodec, StructCodec, EnumCodec } from "@nomadshiba/codec";
const t = new TupleCodec([u8, u16]);
const s = new StructCodec({ id: u32, name: str });
const e = new EnumCodec({ A: u8, B: str });
```
