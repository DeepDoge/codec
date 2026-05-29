import { assertEquals } from "@std/assert";
import { TupleCodec } from "~/composites/tuple.ts";
import { StringCodec } from "~/bytes/string.ts";
import { U8, U16, U32 } from "~/primitives.ts";

Deno.test("Tuple - fixed stride elements", () => {
	const t = new TupleCodec([U8, U16]);
	const val: [number, number] = [5, 513];
	const [decoded] = t.decode(t.encode(val));
	assertEquals(decoded, val);
	assertEquals(t.stride, { kind: "fixed", size: 3 }); // 1 + 2
});

Deno.test("Tuple - variable stride elements", () => {
	const t = new TupleCodec([U8, new StringCodec()]);
	const val: [number, string] = [7, "hi"];
	const [decoded] = t.decode(t.encode(val));
	assertEquals(decoded, val);
	assertEquals(t.stride, { kind: "variable" });
});

Deno.test("Tuple - mixed stride elements", () => {
	const t = new TupleCodec([U32, new StringCodec(), U16]);
	const val: [number, string, number] = [42, "test", 1000];
	const [decoded] = t.decode(t.encode(val));
	assertEquals(decoded, val);
	assertEquals(t.stride, { kind: "variable" });
});

Deno.test("Tuple - all items self-delimit", () => {
	const t = new TupleCodec([U8, new StringCodec()]);
	const encoded = t.encode([5, "hi"]);
	assertEquals(Array.from(encoded), [0x05, 0x02, 0x68, 0x69]);
});

Deno.test("Tuple - multiple variable items", () => {
	const t = new TupleCodec([
		new StringCodec(),
		new StringCodec(),
		new StringCodec(),
	]);
	const val: [string, string, string] = ["a", "bc", "def"];
	const encoded = t.encode(val);
	const [decoded] = t.decode(encoded);
	assertEquals(decoded, val);
	assertEquals(Array.from(encoded), [
		0x01, 0x61,
		0x02, 0x62, 0x63,
		0x03, 0x64, 0x65, 0x66,
	]);
});

Deno.test("Tuple - empty tuple", () => {
	const t = new TupleCodec([]);
	assertEquals(t.stride, { kind: "fixed", size: 0 });
	const encoded = t.encode([]);
	assertEquals(encoded.length, 0);
	const [decoded, consumed] = t.decode(new Uint8Array(0));
	assertEquals(decoded, []);
	assertEquals(consumed, 0);
});
