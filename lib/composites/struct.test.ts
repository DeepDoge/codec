import { assertEquals } from "@std/assert";
import { StructCodec } from "~/composites/struct.ts";
import { StringCodec } from "~/bytes/string.ts";
import type { FixedCodec, VariableCodec } from "~/codec.ts";
import { I32, U16, U32, U8 } from "~/primitives.ts";

// StructCodec

Deno.test("StructCodec - simple roundtrip", () => {
	const Point = new StructCodec({ x: I32, y: I32 });
	const val = { x: 10, y: -5 };
	const [decoded] = Point.decode(Point.encode(val));
	assertEquals(decoded, val);
});

Deno.test("StructCodec - fixed stride", () => {
	const Point = new StructCodec({ x: I32, y: I32, z: I32 });
	Point satisfies FixedCodec;
	// @ts-expect-error — all-fixed struct must not satisfy VariableCodec
	Point satisfies VariableCodec;
	assertEquals(Point.stride, { kind: "fixed", size: 12 });
});

Deno.test("StructCodec - variable stride when any field is variable", () => {
	const S = new StructCodec({ id: U32, name: new StringCodec() });
	S satisfies VariableCodec;
	// @ts-expect-error — variable struct must not satisfy FixedCodec
	S satisfies FixedCodec;
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

Deno.test("StructCodec - encodeInto", () => {
	const S = new StructCodec({ id: U32, name: new StringCodec() });
	const val = { id: 42, name: "Ada" };
	const target = new Uint8Array(32);
	const written = S.encodeInto(val, target, 2);
	const [decoded, bytesRead] = S.decode(target.subarray(2, 2 + written));
	assertEquals(decoded, val);
	assertEquals(bytesRead, written);
});

Deno.test("StructCodec - encodeInto fixed stride", () => {
	const S = new StructCodec({ x: I32, y: I32, z: I32 });
	const target = new Uint8Array(20);
	const written = S.encodeInto({ x: 1, y: 2, z: 3 }, target, 4);
	assertEquals(written, 12);
	const [decoded] = S.decode(target.subarray(4, 16));
	assertEquals(decoded, { x: 1, y: 2, z: 3 });
});

Deno.test("StructCodec - encodeInto matches encode", () => {
	const S = new StructCodec({ id: U32, name: new StringCodec() });
	const val = { id: 42, name: "Ada" };
	const encoded = S.encode(val);
	const target = new Uint8Array(encoded.length + 2);
	const written = S.encodeInto(val, target, 2);
	assertEquals(written, encoded.length);
	assertEquals(Array.from(target.subarray(2, 2 + written)), Array.from(encoded));
});
