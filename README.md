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

**Note for users upgrading:** The library changed significantly in `0.1.0`.

See [MIGRATION.md](./MIGRATION.md) for upgrade instructions.

---

## Quick Start

```ts
import { StringCodec, StructCodec, U32 } from "@nomadshiba/codec";

const User = new StructCodec({
  id: U32,
  name: new StringCodec(),
});

const user = { id: 1, name: "Ada" };

const bytes = User.encode(user);
const [decoded] = User.decode(bytes);
// { id: 1, name: "Ada" }
```

---

## Core Concepts

All codecs extend `Codec<T>` and implement:

| Method   | Signature                           | Description                         |
| -------- | ----------------------------------- | ----------------------------------- |
| `encode` | `(value: T) => Uint8Array`          | Encode a value                      |
| `decode` | `(data: Uint8Array) => [T, number]` | Decode `[value, bytesRead]`         |
| `stride` | `number`                            | `≥0` fixed size, `<0` variable size |

---

## Primitive Codecs

**Big-endian is the default.** Use `*LE` variants for little-endian.

| Codec          | Type    | Size     | Description             |
| -------------- | ------- | -------- | ----------------------- |
| `I8`           | number  | 1        | Signed 8-bit integer    |
| `U8`           | number  | 1        | Unsigned 8-bit integer  |
| `I16`, `I16LE` | number  | 2        | Signed 16-bit           |
| `U16`, `U16LE` | number  | 2        | Unsigned 16-bit         |
| `I32`, `I32LE` | number  | 4        | Signed 32-bit           |
| `U32`, `U32LE` | number  | 4        | Unsigned 32-bit         |
| `I64`, `I64LE` | bigint  | 8        | Signed 64-bit           |
| `U64`, `U64LE` | bigint  | 8        | Unsigned 64-bit         |
| `F32`, `F32LE` | number  | 4        | 32-bit float            |
| `F64`, `F64LE` | number  | 8        | 64-bit float            |
| `Bool`         | boolean | 1        | Boolean (`0x00`/`0x01`) |
| `VarInt`       | number  | variable | Unsigned LEB128         |

---

## Variable-Length Types

### String

UTF-8 string with a length prefix.

```ts
import { StringCodec, U32 } from "@nomadshiba/codec";

const str = new StringCodec();

str.encode("hello");

// Custom length codec
const strU32 = new StringCodec({ lengthCodec: U32 });
```

---

### Bytes

Raw byte arrays.

```ts
import { BytesCodec } from "@nomadshiba/codec";

// Variable length
const bytes = new BytesCodec();
bytes.encode(new Uint8Array([1, 2, 3]));

// Fixed length
const fixed4 = new BytesCodec({ size: 4 });
fixed4.encode(new Uint8Array([1, 2, 3, 4]));
```

---

## Composite Codecs

### Option

Nullable values with a presence byte.

```ts
import { OptionCodec, U8 } from "@nomadshiba/codec";

const maybeU8 = new OptionCodec(U8);

maybeU8.encode(null);
maybeU8.encode(7);
```

Format:

```
0x00 → null
0x01 → value follows
```

---

### Tuple

Fixed-length arrays with mixed types.

```ts
import { StringCodec, TupleCodec, U8 } from "@nomadshiba/codec";

const tuple = new TupleCodec([U8, new StringCodec()]);

tuple.encode([7, "hi"]);
```

---

### Struct

Objects encoded in field order.

```ts
import { StringCodec, StructCodec, U32 } from "@nomadshiba/codec";

const User = new StructCodec({
  id: U32,
  name: new StringCodec(),
});

User.encode({ id: 42, name: "Ada" });
```

---

### Array

Variable-length arrays with a count prefix.

```ts
import { ArrayCodec, U16, U32 } from "@nomadshiba/codec";

// Default: varint count
const nums = new ArrayCodec(U16);

// Custom count codec
const numsU32 = new ArrayCodec(U16, { countCodec: U32 });
```

---

### Enum

Tagged unions.

```ts
import { EnumCodec, StringCodec, U8 } from "@nomadshiba/codec";

const Event = new EnumCodec({
  Click: U8,
  Message: new StringCodec(),
});

Event.encode({ kind: "Click", value: 5 });
Event.encode({ kind: "Message", value: "hello" });
```

---

### Mapping

Key–value maps.

```ts
import { MappingCodec, StringCodec, U32, U8 } from "@nomadshiba/codec";

const Dict = new MappingCodec([new StringCodec(), U8]);

Dict.encode(
  new Map([
    ["x", 1],
    ["y", 2],
  ]),
);

// Custom count codec
const DictU32 = new MappingCodec([new StringCodec(), U8], {
  countCodec: U32,
});
```

---

## Custom Codecs

Extend `Codec<T>` to implement your own.

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

## License

LGPL-3.0-only
