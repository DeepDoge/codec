import { assertEquals } from "@std/assert";
import { NullableCodec } from "~/composites/nullable.ts";
import { StringCodec } from "~/bytes/string.ts";
import { U8 } from "~/primitives.ts";

Deno.test("Nullable - null (fixed inner)", () => {
	const opt = new NullableCodec(U8);
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
