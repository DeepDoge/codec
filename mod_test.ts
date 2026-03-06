import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import {
    ArrayCodec,
    bool,
    BytesCodec,
    EnumCodec,
    f32,
    f32LE,
    f64,
    f64LE,
    i16,
    i16LE,
    i32,
    i32LE,
    i64,
    i64LE,
    i8,
    MappingCodec,
    OptionCodec,
    StringCodec,
    StructCodec,
    TupleCodec,
    u16,
    u16LE,
    u32,
    u32LE,
    u64,
    u64LE,
    u8,
    varint,
} from "./mod.ts";

// VarInt Tests
Deno.test("varint - small numbers", () => {
    assertEquals(Array.from(varint.encode(0)), [0x00]);
    assertEquals(Array.from(varint.encode(127)), [0x7F]);
});

Deno.test("varint - multi-byte", () => {
    assertEquals(Array.from(varint.encode(128)), [0x80, 0x01]);
    assertEquals(Array.from(varint.encode(300)), [0xAC, 0x02]);
});

Deno.test("varint - invalid input", () => {
    assertThrows(() => varint.encode(-1), RangeError);
    assertThrows(() => varint.encode(1.5), RangeError);
});

Deno.test("varint - roundtrip", () => {
    const testValues = [0, 1, 127, 128, 255, 256, 300, 16383, 16384, 2097151];
    for (const val of testValues) {
        const encoded = varint.encode(val);
        const [value, bytesRead] = varint.decode(encoded);
        assertEquals(value, val);
        assertEquals(bytesRead, encoded.length);
    }
});

Deno.test("varint - incomplete", () => {
    assertThrows(() => varint.decode(new Uint8Array([0x80])), Error);
});

// Primitive Number Codecs
Deno.test("i8 - roundtrip", () => {
    const testValues = [-128, -5, 0, 5, 127];
    for (const val of testValues) {
        const [decoded] = i8.decode(i8.encode(val));
        assertEquals(decoded, val);
    }
    assertEquals(i8.stride, 1);
});

Deno.test("u8 - roundtrip", () => {
    const testValues = [0, 5, 127, 128, 255];
    for (const val of testValues) {
        const [decoded] = u8.decode(u8.encode(val));
        assertEquals(decoded, val);
    }
    assertEquals(u8.stride, 1);
});

Deno.test("i16 - roundtrip", () => {
    const testValues = [-32768, -2, 0, 2, 32767];
    for (const val of testValues) {
        const [decoded] = i16.decode(i16.encode(val));
        assertEquals(decoded, val);
    }
    assertEquals(i16.stride, 2);
});

Deno.test("u16 - roundtrip", () => {
    const testValues = [0, 255, 256, 513, 65535];
    for (const val of testValues) {
        const [decoded] = u16.decode(u16.encode(val));
        assertEquals(decoded, val);
    }
    assertEquals(u16.stride, 2);
});

Deno.test("i32 - roundtrip", () => {
    const testValues = [-2147483648, -123456, 0, 123456, 2147483647];
    for (const val of testValues) {
        const [decoded] = i32.decode(i32.encode(val));
        assertEquals(decoded, val);
    }
    assertEquals(i32.stride, 4);
});

Deno.test("u32 - roundtrip", () => {
    const testValues = [0, 255, 65536, 16777216, 4294967295];
    for (const val of testValues) {
        const [decoded] = u32.decode(u32.encode(val));
        assertEquals(decoded, val);
    }
    assertEquals(u32.stride, 4);
});

Deno.test("i64 - roundtrip", () => {
    const testValues = [
        -9223372036854775808n,
        -123n,
        0n,
        123n,
        9223372036854775807n,
    ];
    for (const val of testValues) {
        const [decoded] = i64.decode(i64.encode(val));
        assertEquals(decoded, val);
    }
    assertEquals(i64.stride, 8);
});

Deno.test("u64 - roundtrip", () => {
    const testValues = [
        0n,
        255n,
        65536n,
        9007199254740991n,
        18446744073709551615n,
    ];
    for (const val of testValues) {
        const [decoded] = u64.decode(u64.encode(val));
        assertEquals(decoded, val);
    }
    assertEquals(u64.stride, 8);
});

Deno.test("f32 - roundtrip", () => {
    const testValues = [0, -1.5, 1.5, 3.14159, -3.14159];
    for (const val of testValues) {
        const [decoded] = f32.decode(f32.encode(Math.fround(val)));
        assertEquals(decoded, Math.fround(val));
    }
    assertEquals(f32.stride, 4);
});

Deno.test("f64 - roundtrip", () => {
    const testValues = [0, -1.5, 1.5, 3.141592653589793, -3.141592653589793];
    for (const val of testValues) {
        const [decoded] = f64.decode(f64.encode(val));
        assertEquals(decoded, val);
    }
    assertEquals(f64.stride, 8);
});

// Little-endian variant tests
Deno.test("i16LE - roundtrip", () => {
    const testValues = [-32768, -2, 0, 2, 32767];
    for (const val of testValues) {
        const [decoded] = i16LE.decode(i16LE.encode(val));
        assertEquals(decoded, val);
    }
    assertEquals(i16LE.stride, 2);
    // Verify little-endian encoding
    const encoded = i16LE.encode(513);
    assertEquals(Array.from(encoded), [0x01, 0x02]); // LE: 0x0201 = 513
});

Deno.test("u16LE - roundtrip", () => {
    const testValues = [0, 255, 256, 513, 65535];
    for (const val of testValues) {
        const [decoded] = u16LE.decode(u16LE.encode(val));
        assertEquals(decoded, val);
    }
    assertEquals(u16LE.stride, 2);
    // Verify little-endian encoding differs from big-endian
    const encodedLE = u16LE.encode(513);
    const encodedBE = u16.encode(513);
    assertEquals(Array.from(encodedLE), [0x01, 0x02]);
    assertEquals(Array.from(encodedBE), [0x02, 0x01]);
});

Deno.test("i32LE - roundtrip", () => {
    const testValues = [-2147483648, -123456, 0, 123456, 2147483647];
    for (const val of testValues) {
        const [decoded] = i32LE.decode(i32LE.encode(val));
        assertEquals(decoded, val);
    }
    assertEquals(i32LE.stride, 4);
});

Deno.test("u32LE - roundtrip", () => {
    const testValues = [0, 255, 65536, 16777216, 4294967295];
    for (const val of testValues) {
        const [decoded] = u32LE.decode(u32LE.encode(val));
        assertEquals(decoded, val);
    }
    assertEquals(u32LE.stride, 4);
});

Deno.test("i64LE - roundtrip", () => {
    const testValues = [
        -9223372036854775808n,
        -123n,
        0n,
        123n,
        9223372036854775807n,
    ];
    for (const val of testValues) {
        const [decoded] = i64LE.decode(i64LE.encode(val));
        assertEquals(decoded, val);
    }
    assertEquals(i64LE.stride, 8);
});

Deno.test("u64LE - roundtrip", () => {
    const testValues = [
        0n,
        255n,
        65536n,
        9007199254740991n,
        18446744073709551615n,
    ];
    for (const val of testValues) {
        const [decoded] = u64LE.decode(u64LE.encode(val));
        assertEquals(decoded, val);
    }
    assertEquals(u64LE.stride, 8);
});

Deno.test("f32LE - roundtrip", () => {
    const testValues = [0, -1.5, 1.5, 3.14159, -3.14159];
    for (const val of testValues) {
        const [decoded] = f32LE.decode(f32LE.encode(Math.fround(val)));
        assertEquals(decoded, Math.fround(val));
    }
    assertEquals(f32LE.stride, 4);
});

Deno.test("f64LE - roundtrip", () => {
    const testValues = [0, -1.5, 1.5, 3.141592653589793, -3.141592653589793];
    for (const val of testValues) {
        const [decoded] = f64LE.decode(f64LE.encode(val));
        assertEquals(decoded, val);
    }
    assertEquals(f64LE.stride, 8);
});

// Bool Codec
Deno.test("bool - roundtrip", () => {
    const [t] = bool.decode(bool.encode(true));
    const [f] = bool.decode(bool.encode(false));
    assertEquals(t, true);
    assertEquals(f, false);
    assertEquals(Array.from(bool.encode(true)), [0x01]);
    assertEquals(Array.from(bool.encode(false)), [0x00]);
    assertEquals(bool.stride, 1);
});

// String Codec
Deno.test("string - roundtrip", () => {
    const testValues = ["", "hi", "hello world", "こんにちは", "🚀"];
    for (const val of testValues) {
        const [decoded] = new StringCodec().decode(
            new StringCodec().encode(val),
        );
        assertEquals(decoded, val);
    }
    assertEquals(new StringCodec().stride, -1);
});

Deno.test("string - custom length codec (u32)", () => {
    const stringU32 = new StringCodec({ lengthCodec: u32 });
    const [decoded] = stringU32.decode(stringU32.encode("hello"));
    assertEquals(decoded, "hello");
    // u32 length prefix is 4 bytes, varint would be 1 byte for "hello" (5)
    const encodedU32 = stringU32.encode("hi");
    const encodedVarint = new StringCodec().encode("hi");
    assertEquals(encodedU32.length, 4 + 2); // 4 byte length + 2 bytes for "hi"
    assertEquals(encodedVarint.length, 1 + 2); // 1 byte varint + 2 bytes for "hi"
});

// Bytes Codec
Deno.test("bytes - roundtrip variable", () => {
    const testValues = [
        new Uint8Array([]),
        new Uint8Array([1, 2, 3]),
        new Uint8Array([0, 255, 128]),
    ];
    for (const val of testValues) {
        const [decoded] = new BytesCodec().decode(new BytesCodec().encode(val));
        assertEquals(Array.from(decoded), Array.from(val));
    }
    assertEquals(new BytesCodec().stride, -1);
});

Deno.test("bytes - roundtrip fixed size", () => {
    const fixedBytes = new BytesCodec(4);
    const val = new Uint8Array([1, 2, 3, 4]);
    const [decoded] = fixedBytes.decode(fixedBytes.encode(val));
    assertEquals(Array.from(decoded), Array.from(val));
    assertEquals(fixedBytes.stride, 4);
});

Deno.test("bytes - fixed size error", () => {
    const fixedBytes = new BytesCodec(4);
    assertThrows(() => fixedBytes.encode(new Uint8Array([1, 2])), RangeError);
});

Deno.test("bytes - custom length codec (u32)", () => {
    const bytesU32 = new BytesCodec(-1, { lengthCodec: u32 });
    const val = new Uint8Array([1, 2, 3]);
    const [decoded] = bytesU32.decode(bytesU32.encode(val));
    assertEquals(Array.from(decoded), Array.from(val));
    // u32 length prefix is 4 bytes, varint would be 1 byte
    const encodedU32 = bytesU32.encode(val);
    const encodedVarint = new BytesCodec().encode(val);
    assertEquals(encodedU32.length, 4 + 3); // 4 byte length + 3 bytes data
    assertEquals(encodedVarint.length, 1 + 3); // 1 byte varint + 3 bytes data
});

// Option Codec
Deno.test("Option - null", () => {
    const opt = new OptionCodec(u8);
    const [decoded] = opt.decode(opt.encode(null));
    assertEquals(decoded, null);
    assertEquals(Array.from(opt.encode(null)), [0x00]);
    assertEquals(opt.stride, -1);
});

Deno.test("Option - present value", () => {
    const opt = new OptionCodec(u8);
    const [decoded] = opt.decode(opt.encode(7));
    assertEquals(decoded, 7);
    assertEquals(Array.from(opt.encode(7)), [0x01, 0x07]);
});

Deno.test("Option - with string", () => {
    const opt = new OptionCodec(new StringCodec());
    const [n] = opt.decode(opt.encode(null));
    assertEquals(n, null);
    const [s] = opt.decode(opt.encode("hello"));
    assertEquals(s, "hello");
});

// Tuple Codec
Deno.test("Tuple - fixed stride elements", () => {
    const t = new TupleCodec([u8, u16]);
    const val: [number, number] = [5, 513];
    const [decoded] = t.decode(t.encode(val));
    assertEquals(decoded, val);
    assertEquals(t.stride, 3); // 1 + 2
});

Deno.test("Tuple - variable stride elements", () => {
    const t = new TupleCodec([u8, new StringCodec()]);
    const val: [number, string] = [7, "hi"];
    const [decoded] = t.decode(t.encode(val));
    assertEquals(decoded, val);
    assertEquals(t.stride, -1);
});

Deno.test("Tuple - mixed stride elements", () => {
    const t = new TupleCodec([u32, new StringCodec(), u16]);
    const val: [number, string, number] = [42, "test", 1000];
    const [decoded] = t.decode(t.encode(val));
    assertEquals(decoded, val);
    assertEquals(t.stride, -1);
});

Deno.test("Tuple - all items self-delimit", () => {
    // All variable-stride items now include their own size info
    const t = new TupleCodec([u8, new StringCodec()]);
    const encoded = t.encode([5, "hi"]);
    // Should be: [0x05, 0x02, 0x68, 0x69] (string has varint prefix)
    assertEquals(Array.from(encoded), [0x05, 0x02, 0x68, 0x69]);
});

Deno.test("Tuple - multiple variable items", () => {
    const t = new TupleCodec(
        [new StringCodec(), new StringCodec(), new StringCodec()],
    );
    const val: [string, string, string] = ["a", "bc", "def"];
    const encoded = t.encode(val);
    const [decoded] = t.decode(encoded);
    assertEquals(decoded, val);
    // All items have varint: [0x01, 'a', 0x02, 'b', 'c', 0x03, 'd', 'e', 'f']
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
    const User = new StructCodec({ id: u32, name: new StringCodec() });
    const val = { id: 42, name: "Ada" };
    const [decoded] = User.decode(User.encode(val));
    assertEquals(decoded, val);
    assertEquals(User.stride, -1);
});

Deno.test("Struct - all fixed stride", () => {
    const Point = new StructCodec({ x: i32, y: i32, z: i32 });
    const val = { x: 1, y: -2, z: 3 };
    const [decoded] = Point.decode(Point.encode(val));
    assertEquals(decoded, val);
    assertEquals(Point.stride, 12); // 3 * 4
});

Deno.test("Struct - nested", () => {
    const Inner = new StructCodec({ value: u8 });
    const Outer = new StructCodec({ inner: Inner, label: new StringCodec() });
    const val = { inner: { value: 5 }, label: "test" };
    const [decoded] = Outer.decode(Outer.encode(val));
    assertEquals(decoded, val);
});

Deno.test("Struct - definition order matters", () => {
    const S1 = new StructCodec({ a: u8, b: u16 });
    const S2 = new StructCodec({ b: u16, a: u8 });
    // Different order = different binary layout
    const val1 = { a: 1, b: 2 };
    const val2 = { a: 1, b: 2 };
    const enc1 = S1.encode(val1);
    const enc2 = S2.encode(val2);
    // Binary should be different due to field order
    assertEquals(Array.from(enc1) !== Array.from(enc2), true);
});

// Array Codec
Deno.test("Array - fixed stride elements", () => {
    const nums = new ArrayCodec(u16);
    const val = [1, 513, 1000];
    const [decoded] = nums.decode(nums.encode(val));
    assertEquals(decoded, val);
    assertEquals(nums.stride, -1);
});

Deno.test("Array - empty", () => {
    const nums = new ArrayCodec(u32);
    const val: number[] = [];
    const [decoded] = nums.decode(nums.encode(val));
    assertEquals(decoded, val);
});

Deno.test("Array - variable stride elements", () => {
    const words = new ArrayCodec(new StringCodec());
    const val = ["a", "bc", "def"];
    const [decoded] = words.decode(words.encode(val));
    assertEquals(decoded, val);
});

Deno.test("Array - single variable item", () => {
    const words = new ArrayCodec(new StringCodec());
    const [decoded] = words.decode(words.encode(["hello"]));
    assertEquals(decoded, ["hello"]);
});

Deno.test("Array - nested arrays", () => {
    const innerArray = new ArrayCodec(u8);
    const outerArray = new ArrayCodec(innerArray);
    const val = [[1, 2], [3, 4, 5], []];
    const [decoded] = outerArray.decode(outerArray.encode(val));
    assertEquals(decoded, val);
});

Deno.test("Array - custom count codec (u32)", () => {
    const numsU32 = new ArrayCodec(u16, { countCodec: u32 });
    const val = [1, 513, 1000];
    const [decoded] = numsU32.decode(numsU32.encode(val));
    assertEquals(decoded, val);
    // u32 count prefix is 4 bytes, varint would be 1 byte for 3 items
    const encodedU32 = numsU32.encode(val);
    assertEquals(encodedU32[0], 0); // First byte of u32(3) is 0
    assertEquals(encodedU32[1], 0);
    assertEquals(encodedU32[2], 0);
    assertEquals(encodedU32[3], 3); // Last byte has the value 3
});

// Enum Codec
Deno.test("Enum - simple variants", () => {
    const MyEnum = new EnumCodec({ A: u8, B: new StringCodec() });

    const valA = { kind: "A", value: 5 } as const;
    const [decodedA] = MyEnum.decode(MyEnum.encode(valA));
    assertEquals(decodedA, valA);

    const valB = { kind: "B", value: "ok" } as const;
    const [decodedB] = MyEnum.decode(MyEnum.encode(valB));
    assertEquals(decodedB, valB);

    assertEquals(MyEnum.stride, -1);
});

Deno.test("Enum - variant sorting", () => {
    // Variants are sorted alphabetically: A=0, B=1
    const MyEnum = new EnumCodec({ B: u8, A: u8 });
    const encA = MyEnum.encode({ kind: "A", value: 5 });
    const encB = MyEnum.encode({ kind: "B", value: 5 });
    assertEquals(encA[0], 0); // A is first alphabetically
    assertEquals(encB[0], 1); // B is second
});

Deno.test("Enum - invalid variant", () => {
    const MyEnum = new EnumCodec({ A: u8, B: u8 });
    assertThrows(
        () => MyEnum.encode({ kind: "C" as never, value: 5 }),
        Error,
        "Invalid enum variant",
    );
});

Deno.test("Enum - complex payloads", () => {
    const UserStruct = new StructCodec({ id: u32, name: new StringCodec() });
    const Event = new EnumCodec({
        Created: UserStruct,
        Deleted: u32,
        Updated: UserStruct,
    });

    const created = {
        kind: "Created",
        value: { id: 1, name: "Alice" },
    } as const;
    const [decodedCreated] = Event.decode(Event.encode(created));
    assertEquals(decodedCreated, created);

    const deleted = { kind: "Deleted", value: 42 } as const;
    const [decodedDeleted] = Event.decode(Event.encode(deleted));
    assertEquals(decodedDeleted, deleted);
});

Deno.test("Enum - custom index codec (u32)", () => {
    const MyEnum = new EnumCodec({ A: u8, B: new StringCodec() }, {
        indexCodec: u32,
    });

    const valA = { kind: "A", value: 5 } as const;
    const [decodedA] = MyEnum.decode(MyEnum.encode(valA));
    assertEquals(decodedA, valA);

    const valB = { kind: "B", value: "ok" } as const;
    const [decodedB] = MyEnum.decode(MyEnum.encode(valB));
    assertEquals(decodedB, valB);

    // u32 index is 4 bytes, u8 would be 1 byte
    const encodedA = MyEnum.encode(valA);
    assertEquals(encodedA[0], 0); // First 3 bytes are 0
    assertEquals(encodedA[1], 0);
    assertEquals(encodedA[2], 0);
    assertEquals(encodedA[3], 0); // A is index 0
    assertEquals(encodedA[4], 5); // Payload follows
});

// Mapping Codec
Deno.test("Mapping - simple", () => {
    const Dict = new MappingCodec([new StringCodec(), u8]);
    const val = new Map([["x", 1], ["y", 2]]);
    const [decoded] = Dict.decode(Dict.encode(val));
    assertEquals(Array.from(decoded.entries()), Array.from(val.entries()));
    assertEquals(Dict.stride, -1);
});

Deno.test("Mapping - empty", () => {
    const Dict = new MappingCodec([u32, new StringCodec()]);
    const val = new Map<number, string>();
    const [decoded] = Dict.decode(Dict.encode(val));
    assertEquals(decoded.size, 0);
});

Deno.test("Mapping - complex types", () => {
    const UserStruct = new StructCodec({ id: u32, name: new StringCodec() });
    const UserMap = new MappingCodec([u32, UserStruct]);
    const val = new Map([
        [1, { id: 1, name: "Alice" }],
        [2, { id: 2, name: "Bob" }],
    ]);
    const [decoded] = UserMap.decode(UserMap.encode(val));
    assertEquals(Array.from(decoded.entries()), Array.from(val.entries()));
});

Deno.test("Mapping - custom count codec (u32)", () => {
    const DictU32 = new MappingCodec([new StringCodec(), u8], {
        countCodec: u32,
    });
    const val = new Map([["x", 1], ["y", 2]]);
    const [decoded] = DictU32.decode(DictU32.encode(val));
    assertEquals(Array.from(decoded.entries()), Array.from(val.entries()));
    // u32 count prefix is 4 bytes, varint would be 1 byte for 2 entries
    const encodedU32 = DictU32.encode(val);
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
        zipCode: u32,
    });

    const Person = new StructCodec({
        id: u32,
        name: new StringCodec(),
        age: u8,
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

    const [decoded] = Person.decode(Person.encode(val));
    assertEquals(decoded, val);
});

Deno.test("Complex - optional nested structures", () => {
    const Config = new StructCodec({
        enabled: bool,
        timeout: new OptionCodec(u32),
        endpoints: new ArrayCodec(new StringCodec()),
    });

    const val1 = {
        enabled: true,
        timeout: 5000,
        endpoints: ["http://localhost:8080", "http://api.example.com"],
    };
    const [decoded1] = Config.decode(Config.encode(val1));
    assertEquals(decoded1, val1);

    const val2 = {
        enabled: false,
        timeout: null,
        endpoints: [],
    };
    const [decoded2] = Config.decode(Config.encode(val2));
    assertEquals(decoded2, val2);
});

Deno.test("Complex - mapping with tuples", () => {
    const coordMap = new MappingCodec([
        new StringCodec(),
        new TupleCodec([f64, f64]),
    ]);

    const val = new Map<string, [number, number]>([
        ["home", [40.7128, -74.0060]],
        ["work", [37.7749, -122.4194]],
    ]);

    const [decoded] = coordMap.decode(coordMap.encode(val));
    assertEquals(Array.from(decoded.entries()), Array.from(val.entries()));
});

Deno.test("Complex - array of enums", () => {
    const Message = new EnumCodec({
        Text: new StringCodec(),
        Number: i32,
        Flag: bool,
    });

    const Messages = new ArrayCodec(Message);

    const val = [
        { kind: "Text", value: "hello" } as const,
        { kind: "Number", value: 42 } as const,
        { kind: "Flag", value: true } as const,
    ];

    const [decoded] = Messages.decode(Messages.encode(val));
    assertEquals(decoded, val);
});
