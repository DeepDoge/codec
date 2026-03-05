# @nomadshiba/codec

Composable binary codecs for TypeScript/JavaScript.

## Breaking Changes

### 0.1.0
- **Class names changed**: All codec classes now have a "Codec" suffix:
  - `I8` → `I8Codec`, `U8` → `U8Codec`, `I16` → `I16Codec`, etc.
  - `Str` → `StrCodec`, `Bytes` → `BytesCodec`
  - `Option` → `OptionCodec`, `Tuple` → `TupleCodec`, `Struct` → `StructCodec`
  - `Vector` → `VectorCodec`, `Enum` → `EnumCodec`, `Mapping` → `MappingCodec`
  - `VarInt` → `VarIntCodec`
  - Singleton instances remain unchanged (`i8`, `u8`, `str`, `varint`, etc.)
- **Default endianness changed**: Previously the default was little-endian (LE), now the default is big-endian (BE). Use `*LE` variants for little-endian encoding.
- **VarInt API changed**: Removed `encodeVarInt` and `decodeVarInt` exports. Use the `varint` codec instead:
  ```typescript
  import { varint } from "@nomadshiba/codec";

  const bytes = varint.encode(123);
  const [value, size] = varint.decode(bytes);
  ```

## Installation

```bash
deno add jsr:@nomadshiba/codec
```

## Quick Start

```typescript
import { u32, str, StructCodec, VectorCodec } from "@nomadshiba/codec";

// Encode a number
const bytes = u32.encode(42);  // Uint8Array(4)
const [value, size] = u32.decode(bytes);  // [42, 4]

// Define a struct
const User = new StructCodec({ id: u32, name: str } as const);
const user = { id: 1, name: "Ada" };
const encoded = User.encode(user);
const [decoded] = User.decode(encoded);  // { id: 1, name: "Ada" }
```

## Core Concepts

Every codec extends `Codec<T>` with:
- `encode(value: T): Uint8Array` - encode a value to bytes
- `decode(data: Uint8Array): [T, number]` - decode bytes to `[value, bytesRead]`
- `stride: number` - size hint:
  - `stride >= 0`: fixed-size encoding (bytes)
  - `stride < 0`: variable-size encoding

## Primitive Types

| Codec | Type | Size | Description |
|-------|------|------|-------------|
| `i8` | number | 1 | Signed 8-bit integer |
| `u8` | number | 1 | Unsigned 8-bit integer |
| `i16`, `i16LE` | number | 2 | Signed 16-bit (BE/LE) |
| `u16`, `u16LE` | number | 2 | Unsigned 16-bit (BE/LE) |
| `i32`, `i32LE` | number | 4 | Signed 32-bit (BE/LE) |
| `u32`, `u32LE` | number | 4 | Unsigned 32-bit (BE/LE) |
| `i64`, `i64LE` | bigint | 8 | Signed 64-bit (BE/LE) |
| `u64`, `u64LE` | bigint | 8 | Unsigned 64-bit (BE/LE) |
| `f32`, `f32LE` | number | 4 | 32-bit float (BE/LE) |
| `f64`, `f64LE` | number | 8 | 64-bit float (BE/LE) |
| `bool` | boolean | 1 | Boolean (0x00/0x01) |
| `varint` | number | variable | Unsigned LEB128 |

**Default is big-endian.** Use `*LE` variants for little-endian.

## Variable-Length Types

### Str
UTF-8 strings with varint length prefix:

```typescript
import { str, StrCodec, u32 } from "@nomadshiba/codec";

str.encode("hello");  // [0x05, 'h', 'e', 'l', 'l', 'o']

// Custom length codec
const strU32 = new StrCodec({ lengthCodec: u32 });
```

### Bytes
Raw byte arrays:

```typescript
import { bytes, BytesCodec } from "@nomadshiba/codec";

// Variable-length (varint prefix)
bytes.encode(new Uint8Array([1, 2, 3]));

// Fixed-length (no prefix)
const fixed4 = new BytesCodec(4);
fixed4.encode(new Uint8Array([1, 2, 3, 4]));
```

## Composite Types

### Option
Nullable values:

```typescript
import { OptionCodec, u8 } from "@nomadshiba/codec";

const maybeU8 = new OptionCodec(u8);
maybeU8.encode(null);     // [0x00]
maybeU8.encode(7);        // [0x01, 0x07]
```

### Tuple
Fixed-length heterogeneous arrays:

```typescript
import { TupleCodec, u8, str } from "@nomadshiba/codec";

const t = new TupleCodec([u8, str] as const);
t.encode([7, "hi"]);    // [0x07, 0x02, 'h', 'i']
```

### Struct
Objects with named fields (definition order matters):

```typescript
import { StructCodec, u32, str } from "@nomadshiba/codec";

const User = new StructCodec({ id: u32, name: str } as const);
User.encode({ id: 42, name: "Ada" });
```

### Vector
Variable-length arrays:

```typescript
import { VectorCodec, u16, u32 } from "@nomadshiba/codec";

// Default varint count
const nums = new VectorCodec(u16);

// Custom count codec
const numsU32 = new VectorCodec({ codec: u16, countCodec: u32 });
```

### Enum
Tagged unions:

```typescript
import { EnumCodec, u8, str } from "@nomadshiba/codec";

const Event = new EnumCodec({
  Click: u8,
  Message: str
} as const);

Event.encode({ kind: "Click", value: 5 });
Event.encode({ kind: "Message", value: "hello" });
```

### Mapping
Key-value maps:

```typescript
import { MappingCodec, str, u8, u32 } from "@nomadshiba/codec";

const Dict = new MappingCodec(str, u8);
Dict.encode(new Map([["x", 1], ["y", 2]]));

// Custom count codec
const DictU32 = new MappingCodec(str, u8, { countCodec: u32 });
```

## Custom Codecs

Extend `Codec<T>` to create custom codecs:

```typescript
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

## License

LGPL-3.0-only
