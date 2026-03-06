# @nomadshiba/codec

Composable binary codecs for **TypeScript and JavaScript**.

Encode and decode structured data to and from `Uint8Array` with a simple,
composable API.

---

## Installation

```bash
deno add jsr:@nomadshiba/codec
```

---

## Breaking Changes

**Note for users upgrading:** This library changed significantly in v0.1.0. See
[MIGRATION.md](./MIGRATION.md) for detailed migration guides.

- **Default endianness**: Changed from little-endian to big-endian
- **VarInt API**: Use `varint` singleton instead of
  `encodeVarInt`/`decodeVarInt` functions
- **Removed singletons**: `str` and `bytes` removed, use `new StringCodec()` and
  `new BytesCodec()`
- **Class names**: All classes now have `Codec` suffix (e.g., `I8` → `I8Codec`)

---

## Quick Start

```ts
import { StringCodec, StructCodec, u32 } from "@nomadshiba/codec";

const str = new StringCodec();

// Encode a number
const encoded = u32.encode(42); // Uint8Array(4)

// Decode a number
const [value, bytesRead] = u32.decode(encoded); // [42, 4]

// Define a struct
const User = new StructCodec({ id: u32, name: str } as const);

const user = { id: 1, name: "Ada" };
const userBytes = User.encode(user);
const [decoded] = User.decode(userBytes); // { id: 1, name: "Ada" }
```

---

## Core Concepts

All codecs extend `Codec<T>` and implement:

| Method   | Signature                           | Description                                        |
| -------- | ----------------------------------- | -------------------------------------------------- |
| `encode` | `(value: T) => Uint8Array`          | Encode value to bytes                              |
| `decode` | `(data: Uint8Array) => [T, number]` | Decode bytes to `[value, bytesRead]`               |
| `stride` | `number`                            | Size hint: `≥0` = fixed size, `<0` = variable size |

---

## Primitive Codecs

**Big-endian is the default.** Use `*LE` variants for little-endian.

| Codec          | Type    | Size     | Description             |
| -------------- | ------- | -------- | ----------------------- |
| `i8`           | number  | 1        | Signed 8-bit integer    |
| `u8`           | number  | 1        | Unsigned 8-bit integer  |
| `i16`, `i16LE` | number  | 2        | Signed 16-bit (BE/LE)   |
| `u16`, `u16LE` | number  | 2        | Unsigned 16-bit (BE/LE) |
| `i32`, `i32LE` | number  | 4        | Signed 32-bit (BE/LE)   |
| `u32`, `u32LE` | number  | 4        | Unsigned 32-bit (BE/LE) |
| `i64`, `i64LE` | bigint  | 8        | Signed 64-bit (BE/LE)   |
| `u64`, `u64LE` | bigint  | 8        | Unsigned 64-bit (BE/LE) |
| `f32`, `f32LE` | number  | 4        | 32-bit float (BE/LE)    |
| `f64`, `f64LE` | number  | 8        | 64-bit float (BE/LE)    |
| `bool`         | boolean | 1        | Boolean (`0x00`/`0x01`) |
| `varint`       | number  | variable | Unsigned LEB128         |

---

## Variable-Length Types

### String

UTF-8 strings with a length prefix.

```ts
import { StringCodec, u32 } from "@nomadshiba/codec";

const str = new StringCodec();
str.encode("hello"); // [0x05, 'h', 'e', 'l', 'l', 'o']

// Custom length codec
const strU32 = new StringCodec({ lengthCodec: u32 });
```

---

### Bytes

Raw byte arrays.

```ts
import { BytesCodec } from "@nomadshiba/codec";

// Variable-length (varint prefix)
const bytes = new BytesCodec();
bytes.encode(new Uint8Array([1, 2, 3]));

// Fixed-length (no prefix)
const fixed4 = new BytesCodec(4);
fixed4.encode(new Uint8Array([1, 2, 3, 4]));
```

---

## Composite Codecs

### Option

Nullable values with a presence byte.

```ts
import { OptionCodec, u8 } from "@nomadshiba/codec";

const maybeU8 = new OptionCodec(u8);

maybeU8.encode(null); // [0x00]
maybeU8.encode(7); // [0x01, 0x07]
```

Format: `0x00` = null, `0x01` = value follows.

---

### Tuple

Fixed-length arrays with mixed types.

```ts
import { StringCodec, TupleCodec, u8 } from "@nomadshiba/codec";

const str = new StringCodec();
const t = new TupleCodec([u8, str] as const);

t.encode([7, "hi"]); // [0x07, 0x02, 'h', 'i']
```

---

### Struct

Objects with named fields. Order matches definition.

```ts
import { StringCodec, StructCodec, u32 } from "@nomadshiba/codec";

const str = new StringCodec();
const User = new StructCodec({ id: u32, name: str } as const);

User.encode({ id: 42, name: "Ada" });
```

---

### Array (Vector)

Variable-length arrays with a count prefix.

```ts
import { ArrayCodec, u16, u32 } from "@nomadshiba/codec";

// Default: varint count
const nums = new ArrayCodec(u16);

// Custom count codec
const numsU32 = new ArrayCodec(u16, { countCodec: u32 });
```

---

### Enum

Tagged unions.

```ts
import { EnumCodec, StringCodec, u8 } from "@nomadshiba/codec";

const str = new StringCodec();
const Event = new EnumCodec(
  {
    Click: u8,
    Message: str,
  } as const,
);

Event.encode({ kind: "Click", value: 5 });
Event.encode({ kind: "Message", value: "hello" });
```

---

### Mapping

Key–value maps.

```ts
import { MappingCodec, StringCodec, u32, u8 } from "@nomadshiba/codec";

const str = new StringCodec();
const Dict = new MappingCodec(str, u8);

Dict.encode(
  new Map([
    ["x", 1],
    ["y", 2],
  ]),
);

// Custom count codec
const DictU32 = new MappingCodec(str, u8, { countCodec: u32 });
```

---

## Custom Codecs

Extend `Codec<T>` to create your own.

```ts
import { Codec, u64 } from "@nomadshiba/codec";

class DateCodec extends Codec<Date> {
  readonly stride = 8;

  encode(d: Date): Uint8Array {
    return u64.encode(BigInt(d.getTime()));
  }

  decode(data: Uint8Array): [Date, number] {
    const [ms] = u64.decode(data);
    return [new Date(Number(ms)), 8];
  }
}
```

---

## Breaking Changes

See [MIGRATION.md](./MIGRATION.md) for detailed migration guides.

### 0.1.0

- **Default endianness**: Changed from LE to BE
- **VarInt API**: Use `varint` singleton instead of
  `encodeVarInt`/`decodeVarInt`
- **Removed singletons**: `str` and `bytes` removed, use constructors
- **Class names**: All classes now have `Codec` suffix (e.g., `I8` → `I8Codec`)

---

## License

LGPL-3.0-only
