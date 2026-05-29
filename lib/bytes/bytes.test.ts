import { assertEquals, assertThrows } from "@std/assert";
import { Bytes, BytesCodec } from "~/bytes/bytes.ts";
import { U32 } from "~/primitives.ts";
import { VarInt } from "~/varint.ts";

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
	assertEquals(new BytesCodec().stride, { kind: "variable" });
});

Deno.test("bytes - roundtrip fixed size", () => {
	const fixedBytes = new BytesCodec({ size: 4 });
	const val = new Uint8Array([1, 2, 3, 4]);
	const [decoded] = fixedBytes.decode(fixedBytes.encode(val));
	assertEquals(Array.from(decoded), Array.from(val));
	assertEquals(fixedBytes.stride, { kind: "fixed", size: 4 });
});

Deno.test("bytes - fixed size error", () => {
	const fixedBytes = new BytesCodec({ size: 4 });
	assertThrows(() => fixedBytes.encode(new Uint8Array([1, 2])), RangeError);
});

Deno.test("bytes - custom size codec (U32)", () => {
	const bytesU32 = new BytesCodec({ sizer: U32 });
	const val = new Uint8Array([1, 2, 3]);
	const [decoded] = bytesU32.decode(bytesU32.encode(val));
	assertEquals(Array.from(decoded), Array.from(val));
	const encodedU32 = bytesU32.encode(val);
	const encodedVarInt = new BytesCodec().encode(val);
	assertEquals(encodedU32.length, 4 + 3); // 4 byte size + 3 bytes data
	assertEquals(encodedVarInt.length, 1 + 3); // 1 byte VarInt + 3 bytes data
});

Deno.test("bytes - Bytes singleton roundtrip", () => {
	const val = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
	const [decoded] = Bytes.decode(Bytes.encode(val));
	assertEquals(Array.from(decoded), Array.from(val));
	assertEquals(Bytes.stride, { kind: "variable" });
});

Deno.test("bytes - fixed size decode error", () => {
	const fixedBytes = new BytesCodec({ size: 8 });
	assertThrows(() => fixedBytes.decode(new Uint8Array([1, 2, 3, 4])), RangeError);
});

Deno.test("bytes - sizer property (fixed size defaults to VarInt)", () => {
	assertEquals(new BytesCodec({ size: 8 }).sizer, VarInt);
});
