import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import {
    bool,
    Bytes,
    bytes,
    decodeVarInt,
    encodeVarInt,
    Enum,
    f32,
    f64,
    i16,
    i32,
    i64,
    i8,
    Mapping,
    Option,
    str,
    Struct,
    Tuple,
    u16,
    u32,
    u64,
    u8,
    Vector,
} from "./mod.ts";

// VarInt Tests
Deno.test("encodeVarInt - small numbers", () => {
    assertEquals(Array.from(encodeVarInt(0)), [0x00]);
    assertEquals(Array.from(encodeVarInt(127)), [0x7F]);
});

Deno.test("encodeVarInt - multi-byte", () => {
    assertEquals(Array.from(encodeVarInt(128)), [0x80, 0x01]);
    assertEquals(Array.from(encodeVarInt(300)), [0xAC, 0x02]);
});

Deno.test("encodeVarInt - invalid input", () => {
    assertThrows(() => encodeVarInt(-1), RangeError);
    assertThrows(() => encodeVarInt(1.5), RangeError);
});

Deno.test("decodeVarInt - roundtrip", () => {
    const testValues = [0, 1, 127, 128, 255, 256, 300, 16383, 16384, 2097151];
    for (const val of testValues) {
        const encoded = encodeVarInt(val);
        const { value, bytesRead } = decodeVarInt(encoded);
        assertEquals(value, val);
        assertEquals(bytesRead, encoded.length);
    }
});

Deno.test("decodeVarInt - incomplete", () => {
    assertThrows(() => decodeVarInt(new Uint8Array([0x80])), Error);
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
Deno.test("str - roundtrip", () => {
    const testValues = ["", "hi", "hello world", "こんにちは", "🚀"];
    for (const val of testValues) {
        const [decoded] = str.decode(str.encode(val));
        assertEquals(decoded, val);
    }
    assertEquals(str.stride, -1);
});

// Bytes Codec
Deno.test("bytes - roundtrip variable", () => {
    const testValues = [
        new Uint8Array([]),
        new Uint8Array([1, 2, 3]),
        new Uint8Array([0, 255, 128]),
    ];
    for (const val of testValues) {
        const [decoded] = bytes.decode(bytes.encode(val));
        assertEquals(Array.from(decoded), Array.from(val));
    }
    assertEquals(bytes.stride, -1);
});

Deno.test("bytes - roundtrip fixed size", () => {
    const fixedBytes = new Bytes(4);
    const val = new Uint8Array([1, 2, 3, 4]);
    const [decoded] = fixedBytes.decode(fixedBytes.encode(val));
    assertEquals(Array.from(decoded), Array.from(val));
    assertEquals(fixedBytes.stride, 4);
});

Deno.test("bytes - fixed size error", () => {
    const fixedBytes = new Bytes(4);
    assertThrows(() => fixedBytes.encode(new Uint8Array([1, 2])), RangeError);
});

// Option Codec
Deno.test("Option - null", () => {
    const opt = new Option(u8);
    const [decoded] = opt.decode(opt.encode(null));
    assertEquals(decoded, null);
    assertEquals(Array.from(opt.encode(null)), [0x00]);
    assertEquals(opt.stride, -1);
});

Deno.test("Option - present value", () => {
    const opt = new Option(u8);
    const [decoded] = opt.decode(opt.encode(7));
    assertEquals(decoded, 7);
    assertEquals(Array.from(opt.encode(7)), [0x01, 0x07]);
});

Deno.test("Option - with string", () => {
    const opt = new Option(str);
    const [n] = opt.decode(opt.encode(null));
    assertEquals(n, null);
    const [s] = opt.decode(opt.encode("hello"));
    assertEquals(s, "hello");
});

// Tuple Codec
Deno.test("Tuple - fixed stride elements", () => {
    const t = new Tuple([u8, u16] as const);
    const val: [number, number] = [5, 513];
    const [decoded] = t.decode(t.encode(val));
    assertEquals(decoded, val);
    assertEquals(t.stride, 3); // 1 + 2
});

Deno.test("Tuple - variable stride elements", () => {
    const t = new Tuple([u8, str] as const);
    const val: [number, string] = [7, "hi"];
    const [decoded] = t.decode(t.encode(val));
    assertEquals(decoded, val);
    assertEquals(t.stride, -1);
});

Deno.test("Tuple - mixed stride elements", () => {
    const t = new Tuple([u32, str, u16] as const);
    const val: [number, string, number] = [42, "test", 1000];
    const [decoded] = t.decode(t.encode(val));
    assertEquals(decoded, val);
    assertEquals(t.stride, -1);
});

Deno.test("Tuple - all items self-delimit", () => {
    // All variable-stride items now include their own size info
    const t = new Tuple([u8, str] as const);
    const encoded = t.encode([5, "hi"]);
    // Should be: [0x05, 0x02, 0x68, 0x69] (str has varint prefix)
    assertEquals(Array.from(encoded), [0x05, 0x02, 0x68, 0x69]);
});

Deno.test("Tuple - multiple variable items", () => {
    const t = new Tuple([str, str, str] as const);
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
    const User = new Struct({ id: u32, name: str } as const);
    const val = { id: 42, name: "Ada" };
    const [decoded] = User.decode(User.encode(val));
    assertEquals(decoded, val);
    assertEquals(User.stride, -1);
});

Deno.test("Struct - all fixed stride", () => {
    const Point = new Struct({ x: i32, y: i32, z: i32 } as const);
    const val = { x: 1, y: -2, z: 3 };
    const [decoded] = Point.decode(Point.encode(val));
    assertEquals(decoded, val);
    assertEquals(Point.stride, 12); // 3 * 4
});

Deno.test("Struct - nested", () => {
    const Inner = new Struct({ value: u8 } as const);
    const Outer = new Struct({ inner: Inner, label: str } as const);
    const val = { inner: { value: 5 }, label: "test" };
    const [decoded] = Outer.decode(Outer.encode(val));
    assertEquals(decoded, val);
});

Deno.test("Struct - definition order matters", () => {
    const S1 = new Struct({ a: u8, b: u16 } as const);
    const S2 = new Struct({ b: u16, a: u8 } as const);
    // Different order = different binary layout
    const val1 = { a: 1, b: 2 };
    const val2 = { a: 1, b: 2 };
    const enc1 = S1.encode(val1);
    const enc2 = S2.encode(val2);
    // Binary should be different due to field order
    assertEquals(Array.from(enc1) !== Array.from(enc2), true);
});

// Vector Codec
Deno.test("Vector - fixed stride elements", () => {
    const nums = new Vector(u16);
    const val = [1, 513, 1000];
    const [decoded] = nums.decode(nums.encode(val));
    assertEquals(decoded, val);
    assertEquals(nums.stride, -1);
});

Deno.test("Vector - empty", () => {
    const nums = new Vector(u32);
    const val: number[] = [];
    const [decoded] = nums.decode(nums.encode(val));
    assertEquals(decoded, val);
});

Deno.test("Vector - variable stride elements", () => {
    const words = new Vector(str);
    const val = ["a", "bc", "def"];
    const [decoded] = words.decode(words.encode(val));
    assertEquals(decoded, val);
});

Deno.test("Vector - single variable item", () => {
    const words = new Vector(str);
    const [decoded] = words.decode(words.encode(["hello"]));
    assertEquals(decoded, ["hello"]);
});

Deno.test("Vector - nested vectors", () => {
    const innerVec = new Vector(u8);
    const outerVec = new Vector(innerVec);
    const val = [[1, 2], [3, 4, 5], []];
    const [decoded] = outerVec.decode(outerVec.encode(val));
    assertEquals(decoded, val);
});

// Enum Codec
Deno.test("Enum - simple variants", () => {
    const MyEnum = new Enum({ A: u8, B: str } as const);

    const valA = { kind: "A" as const, value: 5 };
    const [decodedA] = MyEnum.decode(MyEnum.encode(valA));
    assertEquals(decodedA, valA);

    const valB = { kind: "B" as const, value: "ok" };
    const [decodedB] = MyEnum.decode(MyEnum.encode(valB));
    assertEquals(decodedB, valB);

    assertEquals(MyEnum.stride, -1);
});

Deno.test("Enum - variant sorting", () => {
    // Variants are sorted alphabetically: A=0, B=1
    const MyEnum = new Enum({ B: u8, A: u8 } as const);
    const encA = MyEnum.encode({ kind: "A", value: 5 });
    const encB = MyEnum.encode({ kind: "B", value: 5 });
    assertEquals(encA[0], 0); // A is first alphabetically
    assertEquals(encB[0], 1); // B is second
});

Deno.test("Enum - invalid variant", () => {
    const MyEnum = new Enum({ A: u8, B: u8 } as const);
    assertThrows(
        () => MyEnum.encode({ kind: "C" as never, value: 5 }),
        Error,
        "Invalid enum variant",
    );
});

Deno.test("Enum - complex payloads", () => {
    const UserStruct = new Struct({ id: u32, name: str } as const);
    const Event = new Enum(
        {
            Created: UserStruct,
            Deleted: u32,
            Updated: UserStruct,
        } as const,
    );

    const created = {
        kind: "Created" as const,
        value: { id: 1, name: "Alice" },
    };
    const [decodedCreated] = Event.decode(Event.encode(created));
    assertEquals(decodedCreated, created);

    const deleted = { kind: "Deleted" as const, value: 42 };
    const [decodedDeleted] = Event.decode(Event.encode(deleted));
    assertEquals(decodedDeleted, deleted);
});

// Mapping Codec
Deno.test("Mapping - simple", () => {
    const Dict = new Mapping(str, u8);
    const val = new Map([["x", 1], ["y", 2]]);
    const [decoded] = Dict.decode(Dict.encode(val));
    assertEquals(Array.from(decoded.entries()), Array.from(val.entries()));
    assertEquals(Dict.stride, -1);
});

Deno.test("Mapping - empty", () => {
    const Dict = new Mapping(u32, str);
    const val = new Map<number, string>();
    const [decoded] = Dict.decode(Dict.encode(val));
    assertEquals(decoded.size, 0);
});

Deno.test("Mapping - complex types", () => {
    const UserStruct = new Struct({ id: u32, name: str } as const);
    const UserMap = new Mapping(u32, UserStruct);
    const val = new Map([
        [1, { id: 1, name: "Alice" }],
        [2, { id: 2, name: "Bob" }],
    ]);
    const [decoded] = UserMap.decode(UserMap.encode(val));
    assertEquals(Array.from(decoded.entries()), Array.from(val.entries()));
});

// Complex Integration Tests
Deno.test("Complex - nested structures", () => {
    const Address = new Struct(
        {
            street: str,
            city: str,
            zipCode: u32,
        } as const,
    );

    const Person = new Struct(
        {
            id: u32,
            name: str,
            age: u8,
            address: Address,
            tags: new Vector(str),
        } as const,
    );

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
    const Config = new Struct(
        {
            enabled: bool,
            timeout: new Option(u32),
            endpoints: new Vector(str),
        } as const,
    );

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
    const coordMap = new Mapping(
        str,
        new Tuple([f64, f64] as const),
    );

    const val = new Map<string, [number, number]>([
        ["home", [40.7128, -74.0060]],
        ["work", [37.7749, -122.4194]],
    ]);

    const [decoded] = coordMap.decode(coordMap.encode(val));
    assertEquals(Array.from(decoded.entries()), Array.from(val.entries()));
});

Deno.test("Complex - vector of enums", () => {
    const Message = new Enum(
        {
            Text: str,
            Number: i32,
            Flag: bool,
        } as const,
    );

    const Messages = new Vector(Message);

    const val = [
        { kind: "Text" as const, value: "hello" },
        { kind: "Number" as const, value: 42 },
        { kind: "Flag" as const, value: true },
    ];

    const [decoded] = Messages.decode(Messages.encode(val));
    assertEquals(decoded, val);
});
