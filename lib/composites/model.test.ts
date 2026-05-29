import { assertEquals } from "@std/assert";
import { ModelCodec } from "~/composites/model.ts";
import type { FixedCodec, VariableCodec } from "~/codec.ts";
import { StringCodec } from "~/bytes/string.ts";
import { I32, U16, U32, U8 } from "~/primitives.ts";

// ── Basic roundtrip ───────────────────────────────────────────────────────────

Deno.test("ModelCodec - simple roundtrip (variable stride)", () => {
	const User = new ModelCodec({ id: U32, name: new StringCodec() });
	User satisfies VariableCodec;
	// @ts-expect-error — variable model must not satisfy FixedCodec
	User satisfies FixedCodec;
	const val = { id: 42, name: "Ada" };
	const [decoded] = User.decode(User.encode(val));
	assertEquals(decoded, val);
	assertEquals(User.stride, { kind: "variable" });
});

Deno.test("ModelCodec - all fixed fields yields fixed stride", () => {
	const Point = new ModelCodec({ x: I32, y: I32, z: I32 });
	Point satisfies FixedCodec;
	// @ts-expect-error — all-fixed model must not satisfy VariableCodec
	Point satisfies VariableCodec;
	const val = { x: 1, y: -2, z: 3 };
	const [decoded] = Point.decode(Point.encode(val));
	assertEquals(decoded, val);
	assertEquals(Point.stride, { kind: "fixed", size: 12 });
});

Deno.test("ModelCodec - nested", () => {
	const Inner = new ModelCodec({ value: U8 });
	const Outer = new ModelCodec({ inner: Inner, label: new StringCodec() });
	const val = { inner: { value: 5 }, label: "test" };
	const [decoded] = Outer.decode(Outer.encode(val));
	assertEquals(decoded, val);
});

Deno.test("ModelCodec - definition order matters", () => {
	const S1 = new ModelCodec({ a: U8, b: U16 });
	const S2 = new ModelCodec({ b: U16, a: U8 });
	const enc1 = S1.encode({ a: 1, b: 2 });
	const enc2 = S2.encode({ a: 1, b: 2 });
	assertEquals(Array.from(enc1) !== Array.from(enc2), true);
});

Deno.test("ModelCodec - shape is accessible", () => {
	const S = new ModelCodec({ x: U8, y: U16 });
	assertEquals(S.shape.x, U8);
	assertEquals(S.shape.y, U16);
});

Deno.test("ModelCodec - decode returns bytes consumed", () => {
	const S = new ModelCodec({ a: U8, b: U8 });
	const data = new Uint8Array([0x0a, 0x0b, 0xff]);
	const [decoded, consumed] = S.decode(data);
	assertEquals(decoded, { a: 0x0a, b: 0x0b });
	assertEquals(consumed, 2);
});

// ── Optional fields ───────────────────────────────────────────────────────────

Deno.test("ModelCodec - optional field absent", () => {
	const S = new ModelCodec({ name: new StringCodec(), "age?": U8 });
	const val = { name: "Ada" };
	const encoded = S.encode(val);
	const [decoded] = S.decode(encoded);
	assertEquals(decoded.name, "Ada");
	assertEquals(decoded.age, undefined);
	assertEquals(encoded[encoded.length - 1], 0x00);
	assertEquals(S.stride, { kind: "variable" });
});

Deno.test("ModelCodec - optional field present", () => {
	const S = new ModelCodec({ name: new StringCodec(), "age?": U8 });
	const val = { name: "Ada", age: 30 };
	const encoded = S.encode(val);
	const [decoded] = S.decode(encoded);
	assertEquals(decoded.name, "Ada");
	assertEquals(decoded.age, 30);
	assertEquals(encoded[encoded.length - 2], 0x01);
	assertEquals(encoded[encoded.length - 1], 0x1e);
});

Deno.test("ModelCodec - multiple optional fields", () => {
	const S = new ModelCodec({ id: U32, "name?": new StringCodec(), "age?": U8 });

	const [d1] = S.decode(S.encode({ id: 1 }));
	assertEquals(d1, { id: 1 });

	const [d2] = S.decode(S.encode({ id: 2, name: "Bob" }));
	assertEquals(d2, { id: 2, name: "Bob" });

	const [d3] = S.decode(S.encode({ id: 3, name: "Ada", age: 42 }));
	assertEquals(d3, { id: 3, name: "Ada", age: 42 });
});

Deno.test("ModelCodec - optional field wire format", () => {
	const S = new ModelCodec({ x: U8, "y?": U8 });
	assertEquals(Array.from(S.encode({ x: 5 })), [0x05, 0x00]);
	assertEquals(Array.from(S.encode({ x: 5, y: 9 })), [0x05, 0x01, 0x09]);
});

Deno.test("ModelCodec - only optional fields", () => {
	const S = new ModelCodec({ "a?": U8, "b?": U8 });

	const [d1] = S.decode(S.encode({}));
	assertEquals(d1, {});

	const [d2] = S.decode(S.encode({ a: 1 }));
	assertEquals(d2, { a: 1 });

	const [d3] = S.decode(S.encode({ a: 1, b: 2 }));
	assertEquals(d3, { a: 1, b: 2 });
});

Deno.test("ModelCodec - optional fields have variable stride", () => {
	const S = new ModelCodec({ x: U8, "y?": U8 });
	S satisfies VariableCodec;
	// @ts-expect-error — model with optional fields must not satisfy FixedCodec
	S satisfies FixedCodec;
	assertEquals(S.stride, { kind: "variable" });
});

Deno.test("ModelCodec - optional with complex inner codec", () => {
	const S = new ModelCodec({
		id: U32,
		"meta?": new ModelCodec({ tag: new StringCodec(), score: U8 }),
	});

	const [d1] = S.decode(S.encode({ id: 7 }));
	assertEquals(d1, { id: 7 });

	const [d2] = S.decode(S.encode({ id: 7, meta: { tag: "hi", score: 99 } }));
	assertEquals(d2, { id: 7, meta: { tag: "hi", score: 99 } });
});

// ── partial() ─────────────────────────────────────────────────────────────────

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

Deno.test("ModelCodec - partial of all-fixed yields all-optional variable stride", () => {
	const M = new ModelCodec({ x: U8, y: U8 });
	M satisfies FixedCodec;
	// @ts-expect-error — all-fixed model must not satisfy VariableCodec
	M satisfies VariableCodec;
	const P = M.partial();
	P satisfies VariableCodec;
	// @ts-expect-error — partial (all-optional) model must not satisfy FixedCodec
	P satisfies FixedCodec;
	assertEquals(P.stride, { kind: "variable" });
});
