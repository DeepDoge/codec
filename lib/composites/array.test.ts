import { assertEquals, assertThrows } from "@std/assert";
import { ArrayCodec } from "~/composites/array.ts";
import { StringCodec } from "~/bytes/string.ts";
import { U16, U32, U8 } from "~/primitives.ts";

Deno.test("Array - fixed stride elements", () => {
	const nums = new ArrayCodec(U16);
	const val = [1, 513, 1000];
	const [decoded] = nums.decode(nums.encode(val));
	assertEquals(decoded, val);
	assertEquals(nums.stride, { kind: "variable" });
});

Deno.test("Array - empty", () => {
	const nums = new ArrayCodec(U32);
	const val: number[] = [];
	const [decoded] = nums.decode(nums.encode(val));
	assertEquals(decoded, val);
});

Deno.test("Array - variable stride elements", () => {
	const words = new ArrayCodec(new StringCodec());
	const val = ["a", "bc", "def"];
	const [decoded] = words.decode(words.encode(val));
	assertEquals(decoded, val);
});

Deno.test("Array - single variable item", () => {
	const words = new ArrayCodec(new StringCodec());
	const [decoded] = words.decode(words.encode(["hello"]));
	assertEquals(decoded, ["hello"]);
});

Deno.test("Array - nested arrays", () => {
	const innerArray = new ArrayCodec(U8);
	const outerArray = new ArrayCodec(innerArray);
	const val = [[1, 2], [3, 4, 5], []];
	const [decoded] = outerArray.decode(outerArray.encode(val));
	assertEquals(decoded, val);
});

Deno.test("Array - custom count codec (U32)", () => {
	const numsU32 = new ArrayCodec(U16, { counter: U32 });
	const val = [1, 513, 1000];
	const [decoded] = numsU32.decode(numsU32.encode(val));
	assertEquals(decoded, val);
	const encodedU32 = numsU32.encode(val);
	assertEquals(encodedU32[0], 0);
	assertEquals(encodedU32[1], 0);
	assertEquals(encodedU32[2], 0);
	assertEquals(encodedU32[3], 3);
});

Deno.test("Array - fixed size with fixed-stride elements (stride is fixed)", () => {
	const codec = new ArrayCodec(U8, { size: 4 });
	assertEquals(codec.stride, { kind: "fixed", size: 4 });
});

Deno.test("Array - fixed size roundtrip (fixed-stride elements)", () => {
	const codec = new ArrayCodec(U16, { size: 3 });
	const val = [1, 513, 1000];
	const encoded = codec.encode(val);
	const [decoded, consumed] = codec.decode(encoded);
	assertEquals(decoded, val);
	assertEquals(consumed, 6); // 3 elements × 2 bytes each, no count prefix
	assertEquals(encoded.length, 6);
});

Deno.test("Array - fixed size roundtrip (variable-stride elements)", () => {
	const codec = new ArrayCodec(new StringCodec(), { size: 2 });
	assertEquals(codec.stride, { kind: "variable" });
	const val = ["hello", "world"];
	const [decoded, consumed] = codec.decode(codec.encode(val));
	assertEquals(decoded, val);
	// 1 byte VarInt length prefix + 5 bytes each, no count prefix
	assertEquals(consumed, 12);
});

Deno.test("Array - fixed size encode throws on wrong length", () => {
	const codec = new ArrayCodec(U8, { size: 3 });
	assertThrows(() => codec.encode([1, 2]), RangeError);
	assertThrows(() => codec.encode([1, 2, 3, 4]), RangeError);
});

Deno.test("Array - fixed size decode ignores trailing bytes", () => {
	const codec = new ArrayCodec(U8, { size: 2 });
	const data = new Uint8Array([10, 20, 99, 99]);
	const [decoded, consumed] = codec.decode(data);
	assertEquals(decoded, [10, 20]);
	assertEquals(consumed, 2);
});

Deno.test("Array - fixed size no count prefix in wire format", () => {
	const fixed = new ArrayCodec(U8, { size: 3 });
	const variable = new ArrayCodec(U8);
	const val = [1, 2, 3];
	// fixed: 3 bytes; variable: 1 byte (VarInt count) + 3 bytes = 4 bytes
	assertEquals(fixed.encode(val).length, 3);
	assertEquals(variable.encode(val).length, 4);
});
