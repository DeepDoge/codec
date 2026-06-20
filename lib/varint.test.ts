import { assertEquals, assertThrows } from "@std/assert";
import { VarInt } from "~/varint.ts";

Deno.test("VarInt - small numbers", () => {
	assertEquals(Array.from(VarInt.encode(0)), [0x00]);
	assertEquals(Array.from(VarInt.encode(127)), [0x7F]);
});

Deno.test("VarInt - multi-byte", () => {
	assertEquals(Array.from(VarInt.encode(128)), [0x80, 0x01]);
	assertEquals(Array.from(VarInt.encode(300)), [0xAC, 0x02]);
});

Deno.test("VarInt - invalid input", () => {
	assertThrows(() => VarInt.encode(-1), RangeError);
	assertThrows(() => VarInt.encode(1.5), RangeError);
});

Deno.test("VarInt - roundtrip", () => {
	const testValues = [0, 1, 127, 128, 255, 256, 300, 16383, 16384, 2097151];
	for (const val of testValues) {
		const encoded = VarInt.encode(val);
		const [value, bytesRead] = VarInt.decode(encoded);
		assertEquals(value, val);
		assertEquals(bytesRead, encoded.length);
	}
});

Deno.test("VarInt - incomplete", () => {
	assertThrows(() => VarInt.decode(new Uint8Array([0x80])), Error);
});

Deno.test("VarInt - too long", () => {
	// 9 continuation bytes → shift reaches 56 > 53 → RangeError "VarInt too long"
	const corrupt = new Uint8Array(10);
	for (let i = 0; i < 9; i++) corrupt[i] = 0x80;
	corrupt[9] = 0x01;
	assertThrows(
		() => VarInt.decode(corrupt),
		RangeError,
		"VarInt too long",
	);
});

Deno.test("VarInt - MAX_SAFE_INTEGER roundtrip", () => {
	const MAX = Number.MAX_SAFE_INTEGER; // 9007199254740991
	const encoded = VarInt.encode(MAX);
	assertEquals(Array.from(encoded), [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x0F]);
	const [value, bytesRead] = VarInt.decode(encoded);
	assertEquals(value, MAX);
	assertEquals(bytesRead, 8);
});

Deno.test("VarInt - above MAX_SAFE_INTEGER throws", () => {
	assertThrows(
		() => VarInt.encode(Number.MAX_SAFE_INTEGER + 1),
		RangeError,
	);
});

Deno.test("VarInt - encodeInto writes at offset", () => {
	const target = new Uint8Array(16);
	const written = VarInt.encodeInto(300, target, 3);
	assertEquals(written, 2);
	assertEquals(Array.from(target.subarray(3, 5)), [0xAC, 0x02]);
	assertEquals(Array.from(target.subarray(0, 3)), [0, 0, 0]);
	assertEquals(Array.from(target.subarray(5, 16)), Array(11).fill(0));
});

Deno.test("VarInt - encodeInto matches encode", () => {
	for (const val of [0, 1, 127, 128, 255, 256, 16384, 2097151, Number.MAX_SAFE_INTEGER]) {
		const encoded = VarInt.encode(val);
		const target = new Uint8Array(encoded.length + 4);
		const written = VarInt.encodeInto(val, target, 2);
		assertEquals(written, encoded.length);
		assertEquals(Array.from(target.subarray(2, 2 + written)), Array.from(encoded));
	}
});
