import { assertEquals, assertThrows } from "@std/assert";
import {
  ArrayCodec,
  Bool,
  BytesCodec,
  EnumCodec,
  F32,
  F32LE,
  F64,
  F64LE,
  I16,
  I16LE,
  I32,
  I32LE,
  I64,
  I64LE,
  I8,
  MappingCodec,
  NullableCodec,
  StringCodec,
  StructCodec,
  TupleCodec,
  U16,
  U16LE,
  U32,
  U32LE,
  U64,
  U64LE,
  U8,
  VarInt,
} from "./mod.ts";

// VarInt Tests
Deno.test("VarInt - small numbers", () => {
  assertEquals(Array.from(VarInt.encode(0)[0]), [0x00]);
  assertEquals(Array.from(VarInt.encode(127)[0]), [0x7F]);
});

Deno.test("VarInt - multi-byte", () => {
  assertEquals(Array.from(VarInt.encode(128)[0]), [0x80, 0x01]);
  assertEquals(Array.from(VarInt.encode(300)[0]), [0xAC, 0x02]);
});

Deno.test("VarInt - invalid input", () => {
  assertThrows(() => VarInt.encode(-1), RangeError);
  assertThrows(() => VarInt.encode(1.5), RangeError);
});

Deno.test("VarInt - roundtrip", () => {
  const testValues = [0, 1, 127, 128, 255, 256, 300, 16383, 16384, 2097151];
  for (const val of testValues) {
    const [encoded] = VarInt.encode(val);
    const [value, bytesRead] = VarInt.decode(encoded);
    assertEquals(value, val);
    assertEquals(bytesRead, encoded.length);
  }
});

Deno.test("VarInt - incomplete", () => {
  assertThrows(() => VarInt.decode(new Uint8Array([0x80])), Error);
});

// Primitive Number Codecs
Deno.test("I8 - roundtrip", () => {
  const testValues = [-128, -5, 0, 5, 127];
  for (const val of testValues) {
    const [decoded] = I8.decode(I8.encode(val)[0]);
    assertEquals(decoded, val);
  }
  assertEquals(I8.stride, { kind: "fixed", size: 1 });
});

Deno.test("U8 - roundtrip", () => {
  const testValues = [0, 5, 127, 128, 255];
  for (const val of testValues) {
    const [decoded] = U8.decode(U8.encode(val)[0]);
    assertEquals(decoded, val);
  }
  assertEquals(U8.stride, { kind: "fixed", size: 1 });
});

Deno.test("I16 - roundtrip", () => {
  const testValues = [-32768, -2, 0, 2, 32767];
  for (const val of testValues) {
    const [decoded] = I16.decode(I16.encode(val)[0]);
    assertEquals(decoded, val);
  }
  assertEquals(I16.stride, { kind: "fixed", size: 2 });
});

Deno.test("U16 - roundtrip", () => {
  const testValues = [0, 255, 256, 513, 65535];
  for (const val of testValues) {
    const [decoded] = U16.decode(U16.encode(val)[0]);
    assertEquals(decoded, val);
  }
  assertEquals(U16.stride, { kind: "fixed", size: 2 });
});

Deno.test("I32 - roundtrip", () => {
  const testValues = [-2147483648, -123456, 0, 123456, 2147483647];
  for (const val of testValues) {
    const [decoded] = I32.decode(I32.encode(val)[0]);
    assertEquals(decoded, val);
  }
  assertEquals(I32.stride, { kind: "fixed", size: 4 });
});

Deno.test("U32 - roundtrip", () => {
  const testValues = [0, 255, 65536, 16777216, 4294967295];
  for (const val of testValues) {
    const [decoded] = U32.decode(U32.encode(val)[0]);
    assertEquals(decoded, val);
  }
  assertEquals(U32.stride, { kind: "fixed", size: 4 });
});

Deno.test("I64 - roundtrip", () => {
  const testValues = [
    -9223372036854775808n,
    -123n,
    0n,
    123n,
    9223372036854775807n,
  ];
  for (const val of testValues) {
    const [decoded] = I64.decode(I64.encode(val)[0]);
    assertEquals(decoded, val);
  }
  assertEquals(I64.stride, { kind: "fixed", size: 8 });
});

Deno.test("U64 - roundtrip", () => {
  const testValues = [
    0n,
    255n,
    65536n,
    9007199254740991n,
    18446744073709551615n,
  ];
  for (const val of testValues) {
    const [decoded] = U64.decode(U64.encode(val)[0]);
    assertEquals(decoded, val);
  }
  assertEquals(U64.stride, { kind: "fixed", size: 8 });
});

Deno.test("F32 - roundtrip", () => {
  const testValues = [0, -1.5, 1.5, 3.14159, -3.14159];
  for (const val of testValues) {
    const [decoded] = F32.decode(F32.encode(Math.fround(val))[0]);
    assertEquals(decoded, Math.fround(val));
  }
  assertEquals(F32.stride, { kind: "fixed", size: 4 });
});

Deno.test("F64 - roundtrip", () => {
  const testValues = [0, -1.5, 1.5, 3.141592653589793, -3.141592653589793];
  for (const val of testValues) {
    const [decoded] = F64.decode(F64.encode(val)[0]);
    assertEquals(decoded, val);
  }
  assertEquals(F64.stride, { kind: "fixed", size: 8 });
});

// Little-endian variant tests
Deno.test("I16LE - roundtrip", () => {
  const testValues = [-32768, -2, 0, 2, 32767];
  for (const val of testValues) {
    const [decoded] = I16LE.decode(I16LE.encode(val)[0]);
    assertEquals(decoded, val);
  }
  assertEquals(I16LE.stride, { kind: "fixed", size: 2 });
  // Verify little-endian encoding
  const [encoded] = I16LE.encode(513);
  assertEquals(Array.from(encoded), [0x01, 0x02]); // LE: 0x0201 = 513
});

Deno.test("U16LE - roundtrip", () => {
  const testValues = [0, 255, 256, 513, 65535];
  for (const val of testValues) {
    const [decoded] = U16LE.decode(U16LE.encode(val)[0]);
    assertEquals(decoded, val);
  }
  assertEquals(U16LE.stride, { kind: "fixed", size: 2 });
  // Verify little-endian encoding differs from big-endian
  const [encodedLE] = U16LE.encode(513);
  const [encodedBE] = U16.encode(513);
  assertEquals(Array.from(encodedLE), [0x01, 0x02]);
  assertEquals(Array.from(encodedBE), [0x02, 0x01]);
});

Deno.test("I32LE - roundtrip", () => {
  const testValues = [-2147483648, -123456, 0, 123456, 2147483647];
  for (const val of testValues) {
    const [decoded] = I32LE.decode(I32LE.encode(val)[0]);
    assertEquals(decoded, val);
  }
  assertEquals(I32LE.stride, { kind: "fixed", size: 4 });
});

Deno.test("U32LE - roundtrip", () => {
  const testValues = [0, 255, 65536, 16777216, 4294967295];
  for (const val of testValues) {
    const [decoded] = U32LE.decode(U32LE.encode(val)[0]);
    assertEquals(decoded, val);
  }
  assertEquals(U32LE.stride, { kind: "fixed", size: 4 });
});

Deno.test("I64LE - roundtrip", () => {
  const testValues = [
    -9223372036854775808n,
    -123n,
    0n,
    123n,
    9223372036854775807n,
  ];
  for (const val of testValues) {
    const [decoded] = I64LE.decode(I64LE.encode(val)[0]);
    assertEquals(decoded, val);
  }
  assertEquals(I64LE.stride, { kind: "fixed", size: 8 });
});

Deno.test("U64LE - roundtrip", () => {
  const testValues = [
    0n,
    255n,
    65536n,
    9007199254740991n,
    18446744073709551615n,
  ];
  for (const val of testValues) {
    const [decoded] = U64LE.decode(U64LE.encode(val)[0]);
    assertEquals(decoded, val);
  }
  assertEquals(U64LE.stride, { kind: "fixed", size: 8 });
});

Deno.test("F32LE - roundtrip", () => {
  const testValues = [0, -1.5, 1.5, 3.14159, -3.14159];
  for (const val of testValues) {
    const [decoded] = F32LE.decode(F32LE.encode(Math.fround(val))[0]);
    assertEquals(decoded, Math.fround(val));
  }
  assertEquals(F32LE.stride, { kind: "fixed", size: 4 });
});

Deno.test("F64LE - roundtrip", () => {
  const testValues = [0, -1.5, 1.5, 3.141592653589793, -3.141592653589793];
  for (const val of testValues) {
    const [decoded] = F64LE.decode(F64LE.encode(val)[0]);
    assertEquals(decoded, val);
  }
  assertEquals(F64LE.stride, { kind: "fixed", size: 8 });
});

// Bool Codec
Deno.test("Bool - roundtrip", () => {
  const [t] = Bool.decode(Bool.encode(true)[0]);
  const [f] = Bool.decode(Bool.encode(false)[0]);
  assertEquals(t, true);
  assertEquals(f, false);
  assertEquals(Array.from(Bool.encode(true)[0]), [0x01]);
  assertEquals(Array.from(Bool.encode(false)[0]), [0x00]);
  assertEquals(Bool.stride, { kind: "fixed", size: 1 });
});

// String Codec
Deno.test("string - roundtrip", () => {
  const testValues = ["", "hi", "hello world", "こんにちは", "🚀"];
  for (const val of testValues) {
    const [decoded] = new StringCodec().decode(
      new StringCodec().encode(val)[0],
    );
    assertEquals(decoded, val);
  }
  assertEquals(new StringCodec().stride, { kind: "variable" });
});

Deno.test("string - custom length codec (U32)", () => {
  const stringU32 = new StringCodec({ sizer: U32 });
  const [decoded] = stringU32.decode(stringU32.encode("hello")[0]);
  assertEquals(decoded, "hello");
  // U32 length prefix is 4 bytes, VarInt would be 1 byte for "hello" (5)
  const [encodedU32] = stringU32.encode("hi");
  const [encodedVarInt] = new StringCodec().encode("hi");
  assertEquals(encodedU32.length, 4 + 2); // 4 byte length + 2 bytes for "hi"
  assertEquals(encodedVarInt.length, 1 + 2); // 1 byte VarInt + 2 bytes for "hi"
});

// Bytes Codec
Deno.test("bytes - roundtrip variable", () => {
  const testValues = [
    new Uint8Array([]),
    new Uint8Array([1, 2, 3]),
    new Uint8Array([0, 255, 128]),
  ];
  for (const val of testValues) {
    const [decoded] = new BytesCodec().decode(new BytesCodec().encode(val)[0]);
    assertEquals(Array.from(decoded), Array.from(val));
  }
  assertEquals(new BytesCodec().stride, { kind: "variable" });
});

Deno.test("bytes - roundtrip fixed size", () => {
  const fixedBytes = new BytesCodec({ size: 4 });
  const val = new Uint8Array([1, 2, 3, 4]);
  const [decoded] = fixedBytes.decode(fixedBytes.encode(val)[0]);
  assertEquals(Array.from(decoded), Array.from(val));
  assertEquals(fixedBytes.stride, { kind: "fixed", size: 4 });
});

Deno.test("bytes - fixed size error", () => {
  const fixedBytes = new BytesCodec({ size: 4 });
  assertThrows(
    () => fixedBytes.encode(new Uint8Array([1, 2])),
    RangeError,
  );
});

Deno.test("bytes - custom size codec (U32)", () => {
  const bytesU32 = new BytesCodec({ sizer: U32 });
  const val = new Uint8Array([1, 2, 3]);
  const [decoded] = bytesU32.decode(bytesU32.encode(val)[0]);
  assertEquals(Array.from(decoded), Array.from(val));
  // U32 size prefix is 4 bytes, VarInt would be 1 byte
  const [encodedU32] = bytesU32.encode(val);
  const [encodedVarInt] = new BytesCodec().encode(val);
  assertEquals(encodedU32.length, 4 + 3); // 4 byte size + 3 bytes data
  assertEquals(encodedVarInt.length, 1 + 3); // 1 byte VarInt + 3 bytes data
});

// Nullable Codec
Deno.test("Nullable - null (fixed inner)", () => {
  const opt = new NullableCodec(U8);
  const [decoded, size] = opt.decode(opt.encode(null)[0]);
  assertEquals(decoded, null);
  assertEquals(size, 2); // flag byte + 1 zero byte
  assertEquals(Array.from(opt.encode(null)[0]), [0x00, 0x00]);
  assertEquals(opt.stride, { kind: "fixed", size: 2 });
});

Deno.test("Nullable - present value (fixed inner)", () => {
  const opt = new NullableCodec(U8);
  const [decoded] = opt.decode(opt.encode(7)[0]);
  assertEquals(decoded, 7);
  assertEquals(Array.from(opt.encode(7)[0]), [0x01, 0x07]);
});

Deno.test("Nullable - null (variable inner)", () => {
  const opt = new NullableCodec(new StringCodec());
  assertEquals(opt.stride, { kind: "variable" });
  const [n, size] = opt.decode(opt.encode(null)[0]);
  assertEquals(n, null);
  assertEquals(size, 1); // variable: just the flag byte
});

Deno.test("Nullable - present value (variable inner)", () => {
  const opt = new NullableCodec(new StringCodec());
  const [s] = opt.decode(opt.encode("hello")[0]);
  assertEquals(s, "hello");
});

// Tuple Codec
Deno.test("Tuple - fixed stride elements", () => {
  const t = new TupleCodec([U8, U16]);
  const val: [number, number] = [5, 513];
  const [decoded] = t.decode(t.encode(val)[0]);
  assertEquals(decoded, val);
  assertEquals(t.stride, { kind: "fixed", size: 3 }); // 1 + 2
});

Deno.test("Tuple - variable stride elements", () => {
  const t = new TupleCodec([U8, new StringCodec()]);
  const val: [number, string] = [7, "hi"];
  const [decoded] = t.decode(t.encode(val)[0]);
  assertEquals(decoded, val);
  assertEquals(t.stride, { kind: "variable" });
});

Deno.test("Tuple - mixed stride elements", () => {
  const t = new TupleCodec([U32, new StringCodec(), U16]);
  const val: [number, string, number] = [42, "test", 1000];
  const [decoded] = t.decode(t.encode(val)[0]);
  assertEquals(decoded, val);
  assertEquals(t.stride, { kind: "variable" });
});

Deno.test("Tuple - all items self-delimit", () => {
  // All variable-stride items now include their own size info
  const t = new TupleCodec([U8, new StringCodec()]);
  const [encoded] = t.encode([5, "hi"]);
  // Should be: [0x05, 0x02, 0x68, 0x69] (string has VarInt prefix)
  assertEquals(Array.from(encoded), [0x05, 0x02, 0x68, 0x69]);
});

Deno.test("Tuple - multiple variable items", () => {
  const t = new TupleCodec([
    new StringCodec(),
    new StringCodec(),
    new StringCodec(),
  ]);
  const val: [string, string, string] = ["a", "bc", "def"];
  const [encoded] = t.encode(val);
  const [decoded] = t.decode(encoded);
  assertEquals(decoded, val);
  // All items have VarInt: [0x01, 'a', 0x02, 'b', 'c', 0x03, 'd', 'e', 'f']
  assertEquals(Array.from(encoded), [
    0x01,
    0x61,
    0x02,
    0x62,
    0x63,
    0x03,
    0x64,
    0x65,
    0x66,
  ]);
});

// Struct Codec
Deno.test("Struct - simple", () => {
  const User = new StructCodec({ id: U32, name: new StringCodec() });
  const val = { id: 42, name: "Ada" };
  const [decoded] = User.decode(User.encode(val)[0]);
  assertEquals(decoded, val);
  assertEquals(User.stride, { kind: "variable" });
});

Deno.test("Struct - all fixed stride", () => {
  const Point = new StructCodec({ x: I32, y: I32, z: I32 });
  const val = { x: 1, y: -2, z: 3 };
  const [decoded] = Point.decode(Point.encode(val)[0]);
  assertEquals(decoded, val);
  assertEquals(Point.stride, { kind: "fixed", size: 12 }); // 3 * 4
});

Deno.test("Struct - nested", () => {
  const Inner = new StructCodec({ value: U8 });
  const Outer = new StructCodec({ inner: Inner, label: new StringCodec() });
  const val = { inner: { value: 5 }, label: "test" };
  const [decoded] = Outer.decode(Outer.encode(val)[0]);
  assertEquals(decoded, val);
});

Deno.test("Struct - definition order matters", () => {
  const S1 = new StructCodec({ a: U8, b: U16 });
  const S2 = new StructCodec({ b: U16, a: U8 });
  // Different order = different binary layout
  const val1 = { a: 1, b: 2 };
  const val2 = { a: 1, b: 2 };
  const [enc1] = S1.encode(val1);
  const [enc2] = S2.encode(val2);
  // Binary should be different due to field order
  assertEquals(Array.from(enc1) !== Array.from(enc2), true);
});

Deno.test("Struct - optional field absent", () => {
  const S = new StructCodec({ name: new StringCodec(), "age?": U8 });
  const val = { name: "Ada" };
  const [encoded] = S.encode(val);
  const [decoded] = S.decode(encoded);
  // age absent: presence byte 0x00 appended after name
  assertEquals(decoded.name, "Ada");
  assertEquals(decoded.age, undefined);
  // wire: [varint(3), 'A','d','a', 0x00]
  assertEquals(encoded[encoded.length - 1], 0x00);
  assertEquals(S.stride, { kind: "variable" });
});

Deno.test("Struct - optional field present", () => {
  const S = new StructCodec({ name: new StringCodec(), "age?": U8 });
  const val = { name: "Ada", age: 30 };
  const [encoded] = S.encode(val);
  const [decoded] = S.decode(encoded);
  assertEquals(decoded.name, "Ada");
  assertEquals(decoded.age, 30);
  // wire ends with: 0x01, 0x1e (presence byte + age=30)
  assertEquals(encoded[encoded.length - 2], 0x01);
  assertEquals(encoded[encoded.length - 1], 0x1e);
});

Deno.test("Struct - multiple optional fields", () => {
  const S = new StructCodec({
    id: U32,
    "name?": new StringCodec(),
    "age?": U8,
  });

  // All absent
  const [d1] = S.decode(S.encode({ id: 1 })[0]);
  assertEquals(d1, { id: 1 });

  // One present
  const [d2] = S.decode(S.encode({ id: 2, name: "Bob" })[0]);
  assertEquals(d2, { id: 2, name: "Bob" });

  // All present
  const [d3] = S.decode(S.encode({ id: 3, name: "Ada", age: 42 })[0]);
  assertEquals(d3, { id: 3, name: "Ada", age: 42 });
});

Deno.test("Struct - optional field wire format", () => {
  const S = new StructCodec({ x: U8, "y?": U8 });

  // Absent: [x=5, presence=0x00]
  assertEquals(Array.from(S.encode({ x: 5 })[0]), [0x05, 0x00]);

  // Present: [x=5, presence=0x01, y=9]
  assertEquals(Array.from(S.encode({ x: 5, y: 9 })[0]), [0x05, 0x01, 0x09]);
});

Deno.test("Struct - only optional fields", () => {
  const S = new StructCodec({ "a?": U8, "b?": U8 });

  const [d1] = S.decode(S.encode({})[0]);
  assertEquals(d1, {});

  const [d2] = S.decode(S.encode({ a: 1 })[0]);
  assertEquals(d2, { a: 1 });

  const [d3] = S.decode(S.encode({ a: 1, b: 2 })[0]);
  assertEquals(d3, { a: 1, b: 2 });
});

Deno.test("Struct - optional with complex inner codec", () => {
  const S = new StructCodec({
    id: U32,
    "meta?": new StructCodec({ tag: new StringCodec(), score: U8 }),
  });

  const [d1] = S.decode(S.encode({ id: 7 })[0]);
  assertEquals(d1, { id: 7 });

  const [d2] = S.decode(S.encode({ id: 7, meta: { tag: "hi", score: 99 } })[0]);
  assertEquals(d2, { id: 7, meta: { tag: "hi", score: 99 } });
});

// Array Codec
Deno.test("Array - fixed stride elements", () => {
  const nums = new ArrayCodec(U16);
  const val = [1, 513, 1000];
  const [decoded] = nums.decode(nums.encode(val)[0]);
  assertEquals(decoded, val);
  assertEquals(nums.stride, { kind: "variable" });
});

Deno.test("Array - empty", () => {
  const nums = new ArrayCodec(U32);
  const val: number[] = [];
  const [decoded] = nums.decode(nums.encode(val)[0]);
  assertEquals(decoded, val);
});

Deno.test("Array - variable stride elements", () => {
  const words = new ArrayCodec(new StringCodec());
  const val = ["a", "bc", "def"];
  const [decoded] = words.decode(words.encode(val)[0]);
  assertEquals(decoded, val);
});

Deno.test("Array - single variable item", () => {
  const words = new ArrayCodec(new StringCodec());
  const [decoded] = words.decode(words.encode(["hello"])[0]);
  assertEquals(decoded, ["hello"]);
});

Deno.test("Array - nested arrays", () => {
  const innerArray = new ArrayCodec(U8);
  const outerArray = new ArrayCodec(innerArray);
  const val = [[1, 2], [3, 4, 5], []];
  const [decoded] = outerArray.decode(outerArray.encode(val)[0]);
  assertEquals(decoded, val);
});

Deno.test("Array - custom count codec (U32)", () => {
  const numsU32 = new ArrayCodec(U16, { counter: U32 });
  const val = [1, 513, 1000];
  const [decoded] = numsU32.decode(numsU32.encode(val)[0]);
  assertEquals(decoded, val);
  // U32 count prefix is 4 bytes, VarInt would be 1 byte for 3 items
  const [encodedU32] = numsU32.encode(val);
  assertEquals(encodedU32[0], 0); // First byte of U32(3) is 0
  assertEquals(encodedU32[1], 0);
  assertEquals(encodedU32[2], 0);
  assertEquals(encodedU32[3], 3); // Last byte has the value 3
});

// Enum Codec
Deno.test("Enum - simple variants", () => {
  const MyUnion = new EnumCodec({ A: U8, B: new StringCodec() });

  const valA = { kind: "A", value: 5 } as const;
  const [decodedA] = MyUnion.decode(MyUnion.encode(valA)[0]);
  assertEquals(decodedA, valA);

  const valB = { kind: "B", value: "ok" } as const;
  const [decodedB] = MyUnion.decode(MyUnion.encode(valB)[0]);
  assertEquals(decodedB, valB);

  assertEquals(MyUnion.stride, { kind: "variable" });
});

Deno.test("Enum - variant definition order", () => {
  // Variants use definition order: B=0, A=1
  const MyUnion = new EnumCodec({ B: U8, A: U8 });
  const [encA] = MyUnion.encode({ kind: "A", value: 5 });
  const [encB] = MyUnion.encode({ kind: "B", value: 5 });
  assertEquals(encB[0], 0); // B is first (definition order)
  assertEquals(encA[0], 1); // A is second
});

Deno.test("Enum - invalid variant", () => {
  const MyUnion = new EnumCodec({ A: U8, B: U8 });
  assertThrows(
    () => MyUnion.encode({ kind: "C" as never, value: 5 }),
    Error,
    "Invalid union variant",
  );
});

Deno.test("Enum - complex payloads", () => {
  const UserStruct = new StructCodec({ id: U32, name: new StringCodec() });
  const Event = new EnumCodec({
    Created: UserStruct,
    Deleted: U32,
    Updated: UserStruct,
  });

  const created = {
    kind: "Created",
    value: { id: 1, name: "Alice" },
  } as const;
  const [decodedCreated] = Event.decode(Event.encode(created)[0]);
  assertEquals(decodedCreated, created);

  const deleted = { kind: "Deleted", value: 42 } as const;
  const [decodedDeleted] = Event.decode(Event.encode(deleted)[0]);
  assertEquals(decodedDeleted, deleted);
});

Deno.test("Enum - custom index codec (U32)", () => {
  const MyUnion = new EnumCodec(
    { A: U8, B: new StringCodec() },
    { indexer: U32 },
  );

  const valA = { kind: "A", value: 5 } as const;
  const [decodedA] = MyUnion.decode(MyUnion.encode(valA)[0]);
  assertEquals(decodedA, valA);

  const valB = { kind: "B", value: "ok" } as const;
  const [decodedB] = MyUnion.decode(MyUnion.encode(valB)[0]);
  assertEquals(decodedB, valB);

  // U32 index is 4 bytes, U8 would be 1 byte
  const [encodedA] = MyUnion.encode(valA);
  assertEquals(encodedA[0], 0); // First 3 bytes are 0
  assertEquals(encodedA[1], 0);
  assertEquals(encodedA[2], 0);
  assertEquals(encodedA[3], 0); // A is index 0
  assertEquals(encodedA[4], 5); // Payload follows
});

// Mapping Codec
Deno.test("Mapping - simple", () => {
  const Dict = new MappingCodec([new StringCodec(), U8]);
  const val = new Map([["x", 1], ["y", 2]]);
  const [decoded] = Dict.decode(Dict.encode(val)[0]);
  assertEquals(Array.from(decoded.entries()), Array.from(val.entries()));
  assertEquals(Dict.stride, { kind: "variable" });
});

Deno.test("Mapping - empty", () => {
  const Dict = new MappingCodec([U32, new StringCodec()]);
  const val = new Map<number, string>();
  const [decoded] = Dict.decode(Dict.encode(val)[0]);
  assertEquals(decoded.size, 0);
});

Deno.test("Mapping - complex types", () => {
  const UserStruct = new StructCodec({ id: U32, name: new StringCodec() });
  const UserMap = new MappingCodec([U32, UserStruct]);
  const val = new Map([
    [1, { id: 1, name: "Alice" }],
    [2, { id: 2, name: "Bob" }],
  ]);
  const [decoded] = UserMap.decode(UserMap.encode(val)[0]);
  assertEquals(Array.from(decoded.entries()), Array.from(val.entries()));
});

Deno.test("Mapping - custom count codec (U32)", () => {
  const DictU32 = new MappingCodec([new StringCodec(), U8], {
    counter: U32,
  });
  const val = new Map([["x", 1], ["y", 2]]);
  const [decoded] = DictU32.decode(DictU32.encode(val)[0]);
  assertEquals(Array.from(decoded.entries()), Array.from(val.entries()));
  // U32 count prefix is 4 bytes, VarInt would be 1 byte for 2 entries
  const [encodedU32] = DictU32.encode(val);
  assertEquals(encodedU32[0], 0); // First 3 bytes are 0
  assertEquals(encodedU32[1], 0);
  assertEquals(encodedU32[2], 0);
  assertEquals(encodedU32[3], 2); // Count is 2
});

// Complex Integration Tests
Deno.test("Complex - nested structures", () => {
  const Address = new StructCodec({
    street: new StringCodec(),
    city: new StringCodec(),
    zipCode: U32,
  });

  const Person = new StructCodec({
    id: U32,
    name: new StringCodec(),
    age: U8,
    address: Address,
    tags: new ArrayCodec(new StringCodec()),
  });

  const val = {
    id: 123,
    name: "Alice",
    age: 30,
    address: {
      street: "123 Main St",
      city: "Springfield",
      zipCode: 12345,
    },
    tags: ["developer", "rust", "typescript"],
  };

  const [decoded] = Person.decode(Person.encode(val)[0]);
  assertEquals(decoded, val);
});

Deno.test("Complex - nullable nested structures", () => {
  const Config = new StructCodec({
    enabled: Bool,
    timeout: new NullableCodec(U32),
    endpoints: new ArrayCodec(new StringCodec()),
  });

  const val1 = {
    enabled: true,
    timeout: 5000,
    endpoints: ["http://localhost:8080", "http://api.example.com"],
  };
  const [decoded1] = Config.decode(Config.encode(val1)[0]);
  assertEquals(decoded1, val1);

  const val2 = {
    enabled: false,
    timeout: null,
    endpoints: [],
  };
  const [decoded2] = Config.decode(Config.encode(val2)[0]);
  assertEquals(decoded2, val2);
});

Deno.test("Complex - mapping with tuples", () => {
  const coordMap = new MappingCodec([
    new StringCodec(),
    new TupleCodec([F64, F64]),
  ]);

  const val = new Map<string, [number, number]>([
    ["home", [40.7128, -74.0060]],
    ["work", [37.7749, -122.4194]],
  ]);

  const [decoded] = coordMap.decode(coordMap.encode(val)[0]);
  assertEquals(Array.from(decoded.entries()), Array.from(val.entries()));
});

Deno.test("Complex - array of unions", () => {
  const Message = new EnumCodec({
    Text: new StringCodec(),
    Number: I32,
    Flag: Bool,
  });

  const Messages = new ArrayCodec(Message);

  const val = [
    { kind: "Text", value: "hello" } as const,
    { kind: "Number", value: 42 } as const,
    { kind: "Flag", value: true } as const,
  ];

  const [decoded] = Messages.decode(Messages.encode(val)[0]);
  assertEquals(decoded, val);
});

Deno.test("Complex - struct with optional fields in real schema", () => {
  const UserProfile = new StructCodec({
    id: U32,
    username: new StringCodec(),
    "bio?": new StringCodec(),
    "avatarUrl?": new StringCodec(),
    "age?": U8,
  });

  // Minimal user
  const minimal = { id: 1, username: "ada" };
  const [d1] = UserProfile.decode(UserProfile.encode(minimal)[0]);
  assertEquals(d1, minimal);

  // Fully populated user
  const full = {
    id: 2,
    username: "bob",
    bio: "Hello world",
    avatarUrl: "https://example.com/avatar.png",
    age: 28,
  };
  const [d2] = UserProfile.decode(UserProfile.encode(full)[0]);
  assertEquals(d2, full);

  // Partial optional fields
  const partial = { id: 3, username: "carol", age: 35 };
  const [d3] = UserProfile.decode(UserProfile.encode(partial)[0]);
  assertEquals(d3, partial);
});
