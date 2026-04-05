# Migration Guide

Breaking changes introduced in `@nomadshiba/codec` **0.1.0**.

---

# Constructor API Changes

Composite codecs now use **positional parameters for required arguments**.
Optional arguments remain in an options object.

| Before                                                 | After                                          |
| ------------------------------------------------------ | ---------------------------------------------- |
| `new ArrayCodec({ codec: U16 })`                       | `new ArrayCodec(U16)`                          |
| `new ArrayCodec({ codec: U16, countCodec: U32 })`      | `new ArrayCodec(U16, { countCodec: U32 })`     |
| `new EnumCodec({ variants: { A: U8, B: str } })`       | `new EnumCodec({ A: U8, B: str })`             |
| `new EnumCodec({ variants: {...}, indexCodec: U32 })`  | `new EnumCodec({...}, { indexCodec: U32 })`    |
| `new MappingCodec({ codecs: [str, U8] })`              | `new MappingCodec([str, U8])`                  |
| `new MappingCodec({ codecs: [...], countCodec: U32 })` | `new MappingCodec([...], { countCodec: U32 })` |

Example:

```ts
// Before
new ArrayCodec({ codec: U16 });
new EnumCodec({ variants: { A: U8 } });

// After
new ArrayCodec(U16);
new EnumCodec({ A: U8 });
```

---

# Numeric Endianness

Numeric codecs now default to **big-endian**.

Use `*LE` codecs for little-endian encoding.

| Before             | After                |
| ------------------ | -------------------- |
| `u16.encode(42)`   | `U16LE.encode(42)`   |
| `i32.encode(42)`   | `I32LE.encode(42)`   |
| `f64.encode(3.14)` | `F64LE.encode(3.14)` |

`U16`, `I32`, `F64`, etc. now encode using **big-endian**.

---

# VarInt API

Functions were replaced with a codec.

```ts
// Before
encodeVarInt(123);
decodeVarInt(bytes);

// After
VarInt.encode(123);
VarInt.decode(bytes);
```

---

# Removed Singletons

`str` and `bytes` singletons were removed.

```ts
// Before
import { bytes, str } from "@nomadshiba/codec";

str.encode("hello");

// After
import { BytesCodec, StringCodec } from "@nomadshiba/codec";

const str = new StringCodec();
const bytes = new BytesCodec();
```

---

# Codec Class Renaming

All codec classes now use the `Codec` suffix.

| Before    | After          |
| --------- | -------------- |
| `String`  | `StringCodec`  |
| `Bytes`   | `BytesCodec`   |
| `Option`  | `OptionCodec`  |
| `Tuple`   | `TupleCodec`   |
| `Struct`  | `StructCodec`  |
| `Array`   | `ArrayCodec`   |
| `Enum`    | `EnumCodec`    |
| `Mapping` | `MappingCodec` |

---

# Type Inference Changes

Namespace-based helpers were replaced with direct type utilities.

| Before                    | After                 |
| ------------------------- | --------------------- |
| `TupleCodec.Infer<T>`     | `TupleValue<T>`       |
| `StructCodec.Infer<S>`    | `StructValue<S>`      |
| `EnumCodec.Infer<E>`      | `EnumValue<E>`        |
| `ArrayCodec.Infer<C>`     | `ArrayValue<C>`       |
| `MappingCodec.Infer<K,V>` | `MappingValue<[K,V]>` |

Example:

```ts
// Before
type User = StructCodec.Infer<typeof userCodec.shape>;

// After
type User = StructValue<typeof userCodec>;
```

---

# Other Constructor Changes

### BytesCodec

```ts
// Before
new BytesCodec(4);

// After
new BytesCodec({ size: 4 });
```

### MappingCodec

```ts
// Before
new MappingCodec(new StringCodec(), U8);

// After
new MappingCodec([new StringCodec(), U8]);
```
