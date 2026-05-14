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
| `stride` | `Stride`                                        | `{ kind: "fixed"; size: number }` or `{ kind: "variable" }`.        |

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

| Generic type         | Input type         | Output type         | Used by            |
| -------------------- | ------------------ | ------------------- | ------------------ |
| `NullableGeneric`    | `NullableInput<T>` | `NullableOutput<T>` | `NullableCodec`    |
| `TupleGeneric`       | `TupleInput<T>`    | `TupleOutput<T>`    | `TupleCodec`       |
| `FixedTupleGeneric`  | `TupleInput<T>`    | `TupleOutput<T>`    | `FixedTupleCodec`  |
| `StructGeneric`      | `StructInput<T>`   | `StructOutput<T>`   | `StructCodec`      |
| `FixedStructGeneric` | `StructInput<T>`   | `StructOutput<T>`   | `FixedStructCodec` |
| `ArrayGeneric`       | `ArrayInput<T>`    | `ArrayOutput<T>`    | `ArrayCodec`       |
| `EnumGeneric`        | `EnumInput<T>`     | `EnumOutput<T>`     | `EnumCodec`        |
| `FixedEnumGeneric`   | `EnumInput<T>`     | `EnumOutput<T>`     | `FixedEnumCodec`   |
| `MappingGeneric`     | `MappingInput<T>`  | `MappingOutput<T>`  | `MappingCodec`     |

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
const strU32 = new StringCodec({ sizer: U32 });
```

---

### Bytes

Raw byte arrays.

```ts
import { Bytes, BytesCodec, U32 } from "@nomadshiba/codec";

// Variable-length (varint prefix) — pre-built singleton
Bytes.encode(new Uint8Array([1, 2, 3]));

// Variable-length with custom size codec
const bytesU32 = new BytesCodec({ sizer: U32 });

// Fixed-length (no prefix, stride = { kind: "fixed", size: 4 })
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
maybeU8.encode(null); // [0x00, 0x00]  (flag + zero-padded for fixed inner)
maybeU8.encode(7); // [0x01, 0x07]
```

Wire format:

```
0x00 [padding]   → null (padding only for fixed-size inner codecs)
0x01 <value>     → present value
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

`stride` is `{ kind: "fixed", size: n }` (sum of all element strides) when all
elements are fixed-size; `{ kind: "variable" }` if any element is variable.

#### FixedTupleCodec

A fixed-size variant of `TupleCodec`. All element codecs must be fixed-size.
Advertises `Stride<"fixed">`, enabling tighter downstream optimisations.

```ts
import { FixedTupleCodec, U32 } from "@nomadshiba/codec";

const Vec2 = new FixedTupleCodec([U32, U32]);
// stride = { kind: "fixed", size: 8 }

const bytes = Vec2.encode([1, 2]);
const [vec] = Vec2.decode(bytes); // [1, 2]
```

Wire format is identical to `TupleCodec` with all-fixed elements, so the two are
wire-compatible for the same shape.

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

`stride` is `{ kind: "variable" }` when any optional field is present, since
they are inherently variable-length.

**Reordering fields changes the binary layout** and breaks compatibility with
previously encoded data.

Access the codec shape via `User.shape`.

#### partial()

Returns a new `StructCodec` where every field is optional. Required keys
(`"field"`) become `"field?"`. Keys already optional are kept as-is. Field order
and codecs are preserved.

```ts
const User = new StructCodec({ id: U32, name: new StringCodec() });
const PartialUser = User.partial();

PartialUser.encode({}); // all absent
PartialUser.encode({ name: "Ada" }); // only name present
PartialUser.encode({ id: 1, name: "Ada" }); // all present
```

#### FixedStructCodec

A fixed-size variant of `StructCodec`. All field codecs must be fixed-size and
no optional fields are allowed. Advertises `Stride<"fixed">`.

```ts
import { FixedStructCodec, U32 } from "@nomadshiba/codec";

const Point = new FixedStructCodec({ x: U32, y: U32 });
// stride = { kind: "fixed", size: 8 }

const bytes = Point.encode({ x: 1, y: 2 });
const [point] = Point.decode(bytes); // { x: 1, y: 2 }
```

Wire format is identical to `StructCodec` with all-required fixed fields, so the
two are wire-compatible for the same shape.

---

### Array

Variable-length arrays of the same element type, prefixed with a count.

```ts
import { ArrayCodec, U16, U32 } from "@nomadshiba/codec";

// Default: varint count prefix
const nums = new ArrayCodec(U16);
nums.encode([1, 2, 3]);

// Custom count codec
const numsU32 = new ArrayCodec(U16, { counter: U32 });
```

Wire format:

```
<count> <elem0> <elem1> ...
```

---

### Enum

Tagged unions. Variant indices are assigned in **definition order**. The default
index codec is `U8` (supports up to 256 variants).

```ts
import { EnumCodec, StringCodec, U8 } from "@nomadshiba/codec";

const Event = new EnumCodec({
  Click: U8,
  Message: new StringCodec(),
});
// "Click" → index 0, "Message" → index 1

Event.encode({ kind: "Click", value: 5 });
Event.encode({ kind: "Message", value: "hello" });
// Decodes to: { kind: string, value: T }
```

Wire format:

```
<index> <payload>
```

> **Note:** Variant indices are assigned in **definition order**. Adding or
> removing variants changes existing indices and breaks compatibility with
> previously encoded data. Renaming variants is safe and does not affect indices.

#### FixedEnumCodec

A fixed-size variant of `EnumCodec`. All variant codecs must be fixed-size. The
encoded size is constant: `indexer.stride.size + max(variant.stride.size)`.
Shorter variant payloads are zero-padded to the maximum variant size.

```ts
import { FixedEnumCodec, U16, U8 } from "@nomadshiba/codec";

const Event = new FixedEnumCodec({ Click: U8, Scroll: U16 });
// stride = { kind: "fixed", size: 3 }  (1 byte index + 2 byte max payload)

Event.encode({ kind: "Click", value: 5 }); // [0x00, 0x05, 0x00] (padded)
Event.encode({ kind: "Scroll", value: 300 }); // [0x01, 0x01, 0x2c]
```

---

### Mapping

Key–value `Map` encoded as an array of `[key, value]` tuples with a count
prefix.

```ts
import { MappingCodec, StringCodec, U32, U8 } from "@nomadshiba/codec";

const Dict = new MappingCodec([new StringCodec(), U8]);
Dict.encode(new Map([["x", 1], ["y", 2]]));

// Custom count codec
const DictU32 = new MappingCodec([new StringCodec(), U8], { counter: U32 });
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

The result is a `TransformCodec` instance. Its `.inner` property holds the
original wrapped codec.

The transformed type `T` must extend the codec's base decoded type `O`. This
means the transformer can produce any subtype of `O` — narrowing values,
attaching methods or getters, computing a hash, or capturing the raw bytes —
but cannot return something entirely unrelated to `O`.

```ts
// Narrow with a branded type
type UserId = string & { readonly brand: "UserId" };
const UserIdCodec = Str.transform((s): UserId => {
  if (!s.startsWith("usr_")) throw new Error("invalid user id");
  return s as UserId;
});

// Attach methods and expose raw bytes
const Point = StructCodec({ x: F32, y: F32 });
const RichPoint = Point.transform((p, bytes) => ({
  ...p,
  raw: bytes,
  distanceFromOrigin() {
    return Math.sqrt(this.x ** 2 + this.y ** 2);
  },
}));
```

---

## Custom Codecs

Extend `Codec<O, I>` to implement your own.

```ts
import { Codec, Stride, U64 } from "@nomadshiba/codec";

class DateCodec extends Codec<Date, bigint> {
  readonly stride: Stride<"fixed"> = { kind: "fixed", size: 8 };

  encode(
    ms: bigint,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    return U64.encode(ms, target);
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
