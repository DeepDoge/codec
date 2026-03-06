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

**Note for users upgrading:** This library changed significantly in v0.1.0.

See [MIGRATION.md](./MIGRATION.md) for detailed migration guides.

## Quick Start

```ts
import { StringCodec, StructCodec, U32 } from "@nomadshiba/codec";

const str = new StringCodec();

// Encode a number
const encoded = U32.encode(42); // Uint8Array(4)

// Decode a number
const [value, bytesRead] = U32.decode(encoded); // [42, 4]

// Define a struct
const User = new StructCodec({ id: U32, name: str });

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
| `I8`           | number  | 1        | Signed 8-bit integer    |
| `U8`           | number  | 1        | Unsigned 8-bit integer  |
| `I16`, `I16LE` | number  | 2        | Signed 16-bit (BE/LE)   |
| `U16`, `U16LE` | number  | 2        | Unsigned 16-bit (BE/LE) |
| `I32`, `I32LE` | number  | 4        | Signed 32-bit (BE/LE)   |
| `U32`, `U32LE` | number  | 4        | Unsigned 32-bit (BE/LE) |
| `I64`, `I64LE` | bigint  | 8        | Signed 64-bit (BE/LE)   |
| `U64`, `U64LE` | bigint  | 8        | Unsigned 64-bit (BE/LE) |
| `F32`, `F32LE` | number  | 4        | 32-bit float (BE/LE)    |
| `F64`, `F64LE` | number  | 8        | 64-bit float (BE/LE)    |
| `Bool`         | boolean | 1        | Boolean (`0x00`/`0x01`) |
| `VarInt`       | number  | variable | Unsigned LEB128         |

---

## Variable-Length Types

### String

UTF-8 strings with a length prefix.

```ts
import { StringCodec, U32 } from "@nomadshiba/codec";

const str = new StringCodec();
str.encode("hello"); // [0x05, 'h', 'e', 'l', 'l', 'o']

// Custom length codec
const strU32 = new StringCodec({ lengthCodec: U32 });
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
import { OptionCodec, U8 } from "@nomadshiba/codec";

const maybeU8 = new OptionCodec(U8);

maybeU8.encode(null); // [0x00]
maybeU8.encode(7); // [0x01, 0x07]
```

Format: `0x00` = null, `0x01` = value follows.

---

### Tuple

Fixed-length arrays with mixed types.

```ts
import { StringCodec, TupleCodec, U8 } from "@nomadshiba/codec";

const str = new StringCodec();
const t = new TupleCodec([U8, str]);

t.encode([7, "hi"]); // [0x07, 0x02, 'h', 'i']
```

---

### Struct

Objects with named fields. Order matches definition.

```ts
import { StringCodec, StructCodec, U32 } from "@nomadshiba/codec";

const str = new StringCodec();
const User = new StructCodec({ id: U32, name: str });

User.encode({ id: 42, name: "Ada" });
```

---

### Array (Vector)

Variable-length arrays with a count prefix.

```ts
import { ArrayCodec, U16, U32 } from "@nomadshiba/codec";

// Default: varint count
const nums = new ArrayCodec({ codec: U16 });

// Custom count codec
const numsU32 = new ArrayCodec({ codec: U16, countCodec: U32 });
```

---

### Enum

Tagged unions.

```ts
import { EnumCodec, StringCodec, U8 } from "@nomadshiba/codec";

const str = new StringCodec();
const Event = new EnumCodec({
  variants: {
    Click: U8,
    Message: str,
  },
});

Event.encode({ kind: "Click", value: 5 });
Event.encode({ kind: "Message", value: "hello" });
```

---

### Mapping

Key–value maps.

```ts
import { MappingCodec, StringCodec, U32, U8 } from "@nomadshiba/codec";

const str = new StringCodec();
const Dict = new MappingCodec({ codecs: [str, U8] });

Dict.encode(
  new Map([
    ["x", 1],
    ["y", 2],
  ]),
);

// Custom count codec
const DictU32 = new MappingCodec({ codecs: [str, U8], countCodec: U32 });
```

---

## Custom Codecs

Extend `Codec<T>` to create your own.

```ts
import { Codec, U64 } from "@nomadshiba/codec";

class DateCodec extends Codec<Date> {
  readonly stride = 8;

  encode(d: Date): Uint8Array {
    return U64.encode(BigInt(d.getTime()));
  }

  decode(data: Uint8Array): [Date, number] {
    const [ms] = U64.decode(data);
    return [new Date(Number(ms)), 8];
  }
}
```

---

## Breaking Changes

See [MIGRATION.md](./MIGRATION.md) for detailed migration guides.

### 0.1.0

- **Default endianness**: Changed from LE to BE
- **VarInt API**: Use `VarInt` singleton instead of
  `encodeVarInt`/`decodeVarInt`
- **Removed singletons**: `str` and `bytes` removed, use constructors
- **Class names**: All classes now have `Codec` suffix (e.g., `I8` → `I8Codec`)

---

## License

LGPL-3.0-only
