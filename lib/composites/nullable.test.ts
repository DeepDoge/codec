import { assertEquals } from "@std/assert";
import { NullableCodec } from "~/composites/nullable.ts";
import { StringCodec } from "~/bytes/string.ts";
import type { FixedCodec, VariableCodec } from "~/codec.ts";
import { U8 } from "~/primitives.ts";

Deno.test("Nullable - null (fixed inner)", () => {
	const opt = new NullableCodec(U8);
	opt satisfies FixedCodec;
	// @ts-expect-error — fixed-inner nullable must not satisfy VariableCodec
	opt satisfies VariableCodec;
	const [decoded, size] = opt.decode(opt.encode(null));
	assertEquals(decoded, null);
	assertEquals(size, 2); // flag byte + 1 zero byte
	assertEquals(Array.from(opt.encode(null)), [0x00, 0x00]);
	assertEquals(opt.stride, { kind: "fixed", size: 2 });
});

Deno.test("Nullable - present value (fixed inner)", () => {
	const opt = new NullableCodec(U8);
	const [decoded] = opt.decode(opt.encode(7));
	assertEquals(decoded, 7);
	assertEquals(Array.from(opt.encode(7)), [0x01, 0x07]);
});

Deno.test("Nullable - null (variable inner)", () => {
	const opt = new NullableCodec(new StringCodec());
	opt satisfies VariableCodec;
	// @ts-expect-error — variable-inner nullable must not satisfy FixedCodec
	opt satisfies FixedCodec;
	assertEquals(opt.stride, { kind: "variable" });
	const [n, size] = opt.decode(opt.encode(null));
	assertEquals(n, null);
	assertEquals(size, 1); // variable: just the flag byte
});

Deno.test("Nullable - present value (variable inner)", () => {
	const opt = new NullableCodec(new StringCodec());
	const [s] = opt.decode(opt.encode("hello"));
	assertEquals(s, "hello");
});

Deno.test("Nullable - encodeInto", () => {
	const opt = new NullableCodec(U8);
	const target = new Uint8Array(8);
	const written = opt.encodeInto(7, target, 1);
	assertEquals(written, 2);
	assertEquals(Array.from(target.subarray(1, 3)), [0x01, 0x07]);
	const [decoded, bytesRead] = opt.decode(target.subarray(1, 1 + written));
	assertEquals(decoded, 7);
	assertEquals(bytesRead, written);
});

Deno.test("Nullable - encodeInto null (fixed inner)", () => {
	const opt = new NullableCodec(U8);
	const target = new Uint8Array(8);
	target.fill(0xFF);
	const written = opt.encodeInto(null, target, 1);
	assertEquals(written, 2);
	assertEquals(Array.from(target.subarray(1, 3)), [0x00, 0x00]);
	const [decoded, bytesRead] = opt.decode(target.subarray(1, 1 + written));
	assertEquals(decoded, null);
	assertEquals(bytesRead, written);
});

Deno.test("Nullable - encodeInto matches encode", () => {
	const opt = new NullableCodec(new StringCodec());
	const encoded = opt.encode("hello");
	const target = new Uint8Array(encoded.length + 3);
	const written = opt.encodeInto("hello", target, 3);
	assertEquals(written, encoded.length);
	assertEquals(Array.from(target.subarray(3, 3 + written)), Array.from(encoded));
});
