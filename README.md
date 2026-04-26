# @nomadshiba/codec

Composable binary codecs for **TypeScript and JavaScript**.

Encode and decode structured data to and from `Uint8Array<ArrayBuffer>` with a
simple, type-safe, composable API.

---

## Installation

```bash
deno add jsr:@nomadshiba/codec
```

**Or:**

```bash
npx jsr add @nomadshiba/codec       # npm
pnpm i jsr:@nomadshiba/codec        # pnpm >=10.8
pnpm dlx jsr add @nomadshiba/codec  # pnpm <10.8
yarn add jsr:@nomadshiba/codec      # yarn >=4.8
yarn dlx jsr add @nomadshiba/codec  # yarn <4.8
bunx jsr add @nomadshiba/codec      # bun
vlt install jsr:@nomadshiba/codec   # vlt
```

---

## Breaking Changes

**Note for users upgrading:** The library changed significantly in `0.1.0` and
`0.2.0`.

See the [migrations](./migrations/) folder for upgrade instructions.

---

## Quick Start

```ts
import { StringCodec, StructCodec, U32 } from "@nomadshiba/codec";

const User = new StructCodec({
  id: U32,
  name: new StringCodec(),
});

const bytes = User.encode({ id: 1, name: "Ada" });
const [decoded] = User.decode(bytes);
// { id: 1, name: "Ada" }
```

---

## Core Concepts

All codecs extend `Codec<O, I>` and implement:

| Member   | Signature                                       | Description                                                         |
| -------- | ----------------------------------------------- | ------------------------------------------------------------------- |
| `encode` | `(value: I, target?: Uint8Array) => Uint8Array` | Encode a value. Pass `target` to write into a pre-allocated buffer. |
| `decode` | `(data: Uint8Array) => [O, number]`             | Decode and return `[value, bytesConsumed]`.                         |
| `stride` | `number`                                        | `≥ 0` = fixed byte size; `< 0` = variable size.                     |

The optional `target` parameter on `encode` lets you write into a pre-allocated
`Uint8Array` for performance-sensitive code, avoiding an extra allocation.

### Type Inference

Use the `Codec.Infer*` utilities to derive TypeScript types from a codec:

```ts
import { Codec, StringCodec, StructCodec, U32 } from "@nomadshiba/codec";

const User = new StructCodec({ id: U32, name: new StringCodec() });

type User = Codec.Infer<typeof User>; // { id: number; name: string }
type UserInput = Codec.InferInput<typeof User>; // { id: number; name: string }
type UserOut = Codec.InferOutput<typeof User>; // { id: number; name: string }
```

| Utility                | Description                               |
| ---------------------- | ----------------------------------------- |
| `Codec.Infer<T>`       | Alias for `InferOutput<T>`. Decoded type. |
| `Codec.InferOutput<T>` | Type returned by `decode`.                |
| `Codec.InferInput<T>`  | Type accepted by `encode`.                |

### Generic, Input, and Output Types

Each composite codec exports three companion types useful when writing generic
functions or higher-order codecs:

- **`*Generic`** — a constraint, the upper bound for type parameters. It says
  "this must be a codec/shape that this composite can wrap".

- **`*Input<T>`** — the type accepted by `encode` for a given composite
  instance.

- **`*Output<T>`** — the type returned by `decode` for a given composite
  instance.

```ts
// StructGeneric = { readonly [key: string]: Codec<any> }
// NullableGeneric = Codec<any>
// TupleGeneric = readonly Codec<any>[]
// etc.
```

```ts
import {
  ArrayCodec,
  type ArrayGeneric,
  type ArrayInput,
  type ArrayOutput,
  StringCodec,
  StructCodec,
  type StructGeneric,
  type StructInput,
  type StructOutput,
  U32,
} from "@nomadshiba/codec";

// Accept a struct codec and return its decoded value type
function decodeFirst<T extends StructGeneric>(
  codec: StructCodec<T>,
  buffers: Uint8Array[],
): StructOutput<T> {
  return codec.decode(buffers[0]!)[0];
}

// Accept an array codec and return its element array type
function decodeAll<T extends ArrayGeneric>(
  codec: ArrayCodec<T>,
  data: Uint8Array,
): ArrayOutput<T> {
  return codec.decode(data)[0];
}
```

The full set of pairs exported by the library:

| Generic type      | Input type         | Output type         | Used by         |
| ----------------- | ------------------ | ------------------- | --------------- |
| `NullableGeneric` | `NullableInput<T>` | `NullableOutput<T>` | `NullableCodec` |
| `TupleGeneric`    | `TupleInput<T>`    | `TupleOutput<T>`    | `TupleCodec`    |
| `StructGeneric`   | `StructInput<T>`   | `StructOutput<T>`   | `StructCodec`   |
| `ArrayGeneric`    | `ArrayInput<T>`    | `ArrayOutput<T>`    | `ArrayCodec`    |
| `UnionGeneric`    | `UnionInput<T>`    | `UnionOutput<T>`    | `UnionCodec`    |
| `MappingGeneric`  | `MappingInput<T>`  | `MappingOutput<T>`  | `MappingCodec`  |

> **Note:** `*Value<T>` aliases still exist for backwards compatibility but are
> deprecated in favor of the explicit `*Output<T>` types.

For most application code you won't need these directly — `Codec.Infer<T>`
covers the common case. They become useful when writing generic helpers,
higher-order codecs, or libraries built on top of this one.

---

## Primitive Codecs

**Big-endian is the default.** Use `*LE` variants for little-endian.

| Codec          | Type    | Size (bytes) | Description                  |
| -------------- | ------- | ------------ | ---------------------------- |
| `I8`           | number  | 1            | Signed 8-bit integer         |
| `U8`           | number  | 1            | Unsigned 8-bit integer       |
| `I16`, `I16LE` | number  | 2            | Signed 16-bit                |
| `U16`, `U16LE` | number  | 2            | Unsigned 16-bit              |
| `I32`, `I32LE` | number  | 4            | Signed 32-bit                |
| `U32`, `U32LE` | number  | 4            | Unsigned 32-bit              |
| `I64`, `I64LE` | bigint  | 8            | Signed 64-bit                |
| `U64`, `U64LE` | bigint  | 8            | Unsigned 64-bit              |
| `F32`, `F32LE` | number  | 4            | 32-bit float                 |
| `F64`, `F64LE` | number  | 8            | 64-bit float                 |
| `Bool`         | boolean | 1            | Boolean (`0x00`/`0x01`)      |
| `VarInt`       | number  | variable     | Unsigned LEB128              |
| `Void`         | void    | 0            | Zero bytes. Always succeeds. |

All numeric singletons (`U8`, `I32`, `F64`, etc.) are pre-instantiated. You only
need to call `new` when specifying a non-default endianness:

```ts
import { U16Codec } from "@nomadshiba/codec";

const u16le = new U16Codec({ endian: "le" });
// or just use the pre-built singleton:
import { U16LE } from "@nomadshiba/codec";
```

---

## Variable-Length Types

### String

UTF-8 string with a length prefix.

```ts
import { Str, StringCodec, U32 } from "@nomadshiba/codec";

// Default: varint length prefix
const str = new StringCodec();
str.encode("hello"); // [0x05, 0x68, 0x65, 0x6C, 0x6C, 0x6F]

// Pre-built singleton (same as new StringCodec())
Str.encode("hi");

// Custom length codec
const strU32 = new StringCodec({ lengthCodec: U32 });
```

---

### Bytes

Raw byte arrays.

```ts
import { Bytes, BytesCodec, U32 } from "@nomadshiba/codec";

// Variable-length (varint prefix) — pre-built singleton
Bytes.encode(new Uint8Array([1, 2, 3]));

// Variable-length with custom length codec
const bytesU32 = new BytesCodec({ lengthCodec: U32 });

// Fixed-length (no prefix, stride = 4)
const fixed4 = new BytesCodec({ size: 4 });
fixed4.encode(new Uint8Array([1, 2, 3, 4]));
// Throws RangeError if input length != 4
```

---

## Composite Codecs

### Nullable

Nullable values with a presence byte.

```ts
import { NullableCodec, U8 } from "@nomadshiba/codec";

const maybeU8 = new NullableCodec(U8);
maybeU8.encode(null); // [0x00]
maybeU8.encode(7); // [0x01, 0x07]
```

Wire format:

```
0x00         → null
0x01 <value> → present value
```

---

### Tuple

Fixed-count heterogeneous sequences. Elements are concatenated; no wrapper
prefix is added by the tuple itself.

```ts
import { StringCodec, TupleCodec, U8 } from "@nomadshiba/codec";

const t = new TupleCodec([U8, new StringCodec()]);
t.encode([7, "hi"]); // [0x07, 0x02, 0x68, 0x69]
```

`stride` is the sum of all element strides if all elements are fixed-size; `-1`
if any element is variable.

---

### Struct

Named-field objects encoded in **definition order** (order matters for the
binary layout). Append `"?"` to any field name to mark it as optional.

```ts
import { StringCodec, StructCodec, U32, U8 } from "@nomadshiba/codec";

const User = new StructCodec({
  id: U32,
  name: new StringCodec(),
  "age?": U8, // optional field
  "bio?": new StringCodec(), // optional field
});

User.encode({ id: 1, name: "Ada" }); // age/bio absent
User.encode({ id: 1, name: "Ada", age: 30 }); // bio absent
User.encode({ id: 1, name: "Ada", age: 30, bio: "Hello" }); // all present
```

Optional fields use a presence byte in the wire format:

```
0x00              → field absent (undefined)
0x01 <value>      → field present, encoded by its inner codec
```

TypeScript types are inferred correctly — optional fields become `?: T` in both
the input and output types:

```ts
type UserInput = Codec.InferInput<typeof User>;
// { id: number; name: string; age?: number; bio?: string }
```

`stride` is always `-1` when any optional field is present, since they are
inherently variable-length.

**Reordering fields changes the binary layout** and breaks compatibility with
previously encoded data.

Access the codec shape via `User.shape`.

---

### Array

Variable-length arrays of the same element type, prefixed with a count.

```ts
import { ArrayCodec, U16, U32 } from "@nomadshiba/codec";

// Default: varint count prefix
const nums = new ArrayCodec(U16);
nums.encode([1, 2, 3]);

// Custom count codec
const numsU32 = new ArrayCodec(U16, { countCodec: U32 });
```

Wire format:

```
<count> <elem0> <elem1> ...
```

---

### Union

Tagged unions. Variant names are sorted alphabetically to assign stable integer
indices. The default index codec is `U8` (supports up to 256 variants).

```ts
import { StringCodec, U32, U8, UnionCodec } from "@nomadshiba/codec";

const Event = new UnionCodec({
  Click: U8,
  Message: new StringCodec(),
});

Event.encode({ kind: "Click", value: 5 });
Event.encode({ kind: "Message", value: "hello" });
// Decodes to: { kind: string, value: T }
```

Wire format:

```
<index> <payload>
```

> **Note:** Variant indices are assigned by sorting variant names
> alphabetically. Adding new variants or renaming them changes existing indices
> and breaks compatibility with previously encoded data.

---

### Mapping

Key–value `Map` encoded as an array of `[key, value]` tuples with a count
prefix.

```ts
import { MappingCodec, StringCodec, U32, U8 } from "@nomadshiba/codec";

const Dict = new MappingCodec([new StringCodec(), U8]);
Dict.encode(new Map([["x", 1], ["y", 2]]));

// Custom count codec
const DictU32 = new MappingCodec([new StringCodec(), U8], { countCodec: U32 });
```

---

## Transform

Every codec has a `.transform()` method that wraps it with a post-decode
transformation. Encoding is unchanged; only decoding is transformed.

```ts
import { U64 } from "@nomadshiba/codec";

// Decode a u64 timestamp directly as a Date
const DateCodec = U64.transform((ms) => new Date(Number(ms)));

type Decoded = Codec.Infer<typeof DateCodec>; // Date

DateCodec.encode(BigInt(Date.now())); // still encodes as u64
const [date] = DateCodec.decode(bytes); // returns Date
```

The transformer also receives the raw bytes that were consumed:

```ts
const validated = U32.transform((value, bytes) => {
  if (value > 1000) throw new Error("value out of range");
  return value;
});
```

---

## Custom Codecs

Extend `Codec<O, I>` to implement your own.

```ts
import { Codec, U64 } from "@nomadshiba/codec";

class DateCodec extends Codec<Date, bigint> {
  readonly stride = 8;

  encode(d: bigint, target?: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
    return U64.encode(d, target);
  }

  decode(data: Uint8Array): [Date, number] {
    const [ms] = U64.decode(data);
    return [new Date(Number(ms)), 8];
  }
}
```

The two type parameters are:

- `O` — the **output** type returned by `decode`
- `I` — the **input** type accepted by `encode` (defaults to `O`)

---

## License

[LGPL v2.1](LICENSE)
