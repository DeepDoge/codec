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
