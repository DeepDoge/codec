import { assertEquals } from "@std/assert";
import { Str, StringCodec } from "~/bytes/string.ts";
import { U32 } from "~/primitives.ts";
import { VarInt } from "~/varint.ts";

Deno.test("string - roundtrip", () => {
	const testValues = ["", "hi", "hello world", "こんにちは", "🚀"];
	for (const val of testValues) {
		const [decoded] = new StringCodec().decode(new StringCodec().encode(val));
		assertEquals(decoded, val);
	}
	assertEquals(new StringCodec().stride, { kind: "variable" });
});

Deno.test("string - custom length codec (U32)", () => {
	const stringU32 = new StringCodec({ sizer: U32 });
	const [decoded] = stringU32.decode(stringU32.encode("hello"));
	assertEquals(decoded, "hello");
	const encodedU32 = stringU32.encode("hi");
	const encodedVarInt = new StringCodec().encode("hi");
	assertEquals(encodedU32.length, 4 + 2); // 4 byte length + 2 bytes for "hi"
	assertEquals(encodedVarInt.length, 1 + 2); // 1 byte VarInt + 2 bytes for "hi"
});

Deno.test("string - Str singleton roundtrip", () => {
	const [decoded] = Str.decode(Str.encode("hello"));
	assertEquals(decoded, "hello");
	assertEquals(Str.stride, { kind: "variable" });
});

Deno.test("string - sizer property defaults to VarInt", () => {
	assertEquals(new StringCodec().sizer, VarInt);
});
