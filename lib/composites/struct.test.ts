import { assertEquals } from "@std/assert";
import { ModelCodec } from "~/composites/model.ts";
import { StructCodec } from "~/composites/struct.ts";
import { StringCodec } from "~/bytes/string.ts";
import { I32, U8, U16, U32 } from "~/primitives.ts";

// ModelCodec

Deno.test("Struct - simple", () => {
	const User = new ModelCodec({ id: U32, name: new StringCodec() });
	const val = { id: 42, name: "Ada" };
	const [decoded] = User.decode(User.encode(val));
	assertEquals(decoded, val);
	assertEquals(User.stride, { kind: "variable" });
});

Deno.test("Struct - all fixed stride", () => {
	const Point = new ModelCodec({ x: I32, y: I32, z: I32 });
	const val = { x: 1, y: -2, z: 3 };
	const [decoded] = Point.decode(Point.encode(val));
	assertEquals(decoded, val);
	assertEquals(Point.stride, { kind: "fixed", size: 12 });
});

Deno.test("Struct - nested", () => {
	const Inner = new ModelCodec({ value: U8 });
	const Outer = new ModelCodec({ inner: Inner, label: new StringCodec() });
	const val = { inner: { value: 5 }, label: "test" };
	const [decoded] = Outer.decode(Outer.encode(val));
	assertEquals(decoded, val);
});

Deno.test("Struct - definition order matters", () => {
	const S1 = new ModelCodec({ a: U8, b: U16 });
	const S2 = new ModelCodec({ b: U16, a: U8 });
	const enc1 = S1.encode({ a: 1, b: 2 });
	const enc2 = S2.encode({ a: 1, b: 2 });
	assertEquals(Array.from(enc1) !== Array.from(enc2), true);
});

Deno.test("Struct - optional field absent", () => {
	const S = new ModelCodec({ name: new StringCodec(), "age?": U8 });
	const val = { name: "Ada" };
	const encoded = S.encode(val);
	const [decoded] = S.decode(encoded);
	assertEquals(decoded.name, "Ada");
	assertEquals(decoded.age, undefined);
	assertEquals(encoded[encoded.length - 1], 0x00);
	assertEquals(S.stride, { kind: "variable" });
});

Deno.test("Struct - optional field present", () => {
	const S = new ModelCodec({ name: new StringCodec(), "age?": U8 });
	const val = { name: "Ada", age: 30 };
	const encoded = S.encode(val);
	const [decoded] = S.decode(encoded);
	assertEquals(decoded.name, "Ada");
	assertEquals(decoded.age, 30);
	assertEquals(encoded[encoded.length - 2], 0x01);
	assertEquals(encoded[encoded.length - 1], 0x1e);
});

Deno.test("Struct - multiple optional fields", () => {
	const S = new ModelCodec({ id: U32, "name?": new StringCodec(), "age?": U8 });

	const [d1] = S.decode(S.encode({ id: 1 }));
	assertEquals(d1, { id: 1 });

	const [d2] = S.decode(S.encode({ id: 2, name: "Bob" }));
	assertEquals(d2, { id: 2, name: "Bob" });

	const [d3] = S.decode(S.encode({ id: 3, name: "Ada", age: 42 }));
	assertEquals(d3, { id: 3, name: "Ada", age: 42 });
});

Deno.test("Struct - optional field wire format", () => {
	const S = new ModelCodec({ x: U8, "y?": U8 });
	assertEquals(Array.from(S.encode({ x: 5 })), [0x05, 0x00]);
	assertEquals(Array.from(S.encode({ x: 5, y: 9 })), [0x05, 0x01, 0x09]);
});

Deno.test("Struct - only optional fields", () => {
	const S = new ModelCodec({ "a?": U8, "b?": U8 });

	const [d1] = S.decode(S.encode({}));
	assertEquals(d1, {});

	const [d2] = S.decode(S.encode({ a: 1 }));
	assertEquals(d2, { a: 1 });

	const [d3] = S.decode(S.encode({ a: 1, b: 2 }));
	assertEquals(d3, { a: 1, b: 2 });
});

Deno.test("Struct - optional with complex inner codec", () => {
	const S = new ModelCodec({
		id: U32,
		"meta?": new ModelCodec({ tag: new StringCodec(), score: U8 }),
	});

	const [d1] = S.decode(S.encode({ id: 7 }));
	assertEquals(d1, { id: 7 });

	const [d2] = S.decode(S.encode({ id: 7, meta: { tag: "hi", score: 99 } }));
	assertEquals(d2, { id: 7, meta: { tag: "hi", score: 99 } });
});

Deno.test("ModelCodec - partial produces codec with all optional fields", () => {
	const M = new ModelCodec({ x: U8, y: U16 });
	const P = M.partial();
	const [decoded] = P.decode(P.encode({}));
	assertEquals(decoded, {});
});

Deno.test("ModelCodec - partial roundtrip with all fields present", () => {
	const M = new ModelCodec({ id: U32, name: new StringCodec() });
	const P = M.partial();
	const val = { id: 1, name: "Ada" };
	const [decoded] = P.decode(P.encode(val));
	assertEquals(decoded, val);
});

Deno.test("ModelCodec - partial roundtrip with some fields present", () => {
	const M = new ModelCodec({ id: U32, name: new StringCodec(), score: U8 });
	const P = M.partial();
	const val = { name: "Bob" };
	const [decoded] = P.decode(P.encode(val));
	assertEquals(decoded, val);
});

Deno.test("ModelCodec - partial preserves already-optional fields", () => {
	const M = new ModelCodec({ id: U32, "bio?": new StringCodec() });
	const P = M.partial();
	const val = { bio: "hello" };
	const [decoded] = P.decode(P.encode(val));
	assertEquals(decoded, val);
});

// StructCodec

Deno.test("StructCodec - simple roundtrip", () => {
	const Point = new StructCodec({ x: I32, y: I32 });
	const val = { x: 10, y: -5 };
	const [decoded] = Point.decode(Point.encode(val));
	assertEquals(decoded, val);
});

Deno.test("StructCodec - fixed stride", () => {
	const Point = new StructCodec({ x: I32, y: I32, z: I32 });
	assertEquals(Point.stride, { kind: "fixed", size: 12 });
});

Deno.test("StructCodec - variable stride when any field is variable", () => {
	const S = new StructCodec({ id: U32, name: new StringCodec() });
	assertEquals(S.stride, { kind: "variable" });
});

Deno.test("StructCodec - definition order matters", () => {
	const S1 = new StructCodec({ a: U8, b: U16 });
	const S2 = new StructCodec({ b: U16, a: U8 });
	const enc1 = S1.encode({ a: 1, b: 2 });
	const enc2 = S2.encode({ b: 2, a: 1 });
	assertEquals(Array.from(enc1) !== Array.from(enc2), true);
});

Deno.test("StructCodec - nested", () => {
	const Inner = new StructCodec({ value: U8 });
	const Outer = new StructCodec({ inner: Inner, label: new StringCodec() });
	const val = { inner: { value: 7 }, label: "hi" };
	const [decoded] = Outer.decode(Outer.encode(val));
	assertEquals(decoded, val);
});

Deno.test("StructCodec - encode returns exact bytes", () => {
	const S = new StructCodec({ a: U8, b: U8 });
	const encoded = S.encode({ a: 0x01, b: 0x02 });
	assertEquals(Array.from(encoded), [0x01, 0x02]);
});

Deno.test("StructCodec - decode returns bytes consumed", () => {
	const S = new StructCodec({ a: U8, b: U8 });
	const data = new Uint8Array([0x0a, 0x0b, 0xff]);
	const [decoded, consumed] = S.decode(data);
	assertEquals(decoded, { a: 0x0a, b: 0x0b });
	assertEquals(consumed, 2);
});

Deno.test("StructCodec - shape is accessible", () => {
	const S = new StructCodec({ x: U8, y: U16 });
	assertEquals(S.shape.x, U8);
	assertEquals(S.shape.y, U16);
});

Deno.test("StructCodec - partial produces ModelCodec with all optional fields", () => {
	const S = new StructCodec({ x: U8, y: U16 });
	const P = S.partial();
	const [decoded] = P.decode(P.encode({}));
	assertEquals(decoded, {});
});

Deno.test("StructCodec - partial roundtrip with all fields present", () => {
	const S = new StructCodec({ x: U8, y: U8 });
	const P = S.partial();
	const val = { x: 3, y: 7 };
	const [decoded] = P.decode(P.encode(val));
	assertEquals(decoded, val);
});

Deno.test("StructCodec - partial roundtrip with some fields present", () => {
	const S = new StructCodec({ x: U8, y: U8 });
	const P = S.partial();
	const val = { x: 42 };
	const [decoded] = P.decode(P.encode(val));
	assertEquals(decoded, val);
});
