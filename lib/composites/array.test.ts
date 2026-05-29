import { assertEquals } from "@std/assert";
import { ArrayCodec } from "~/composites/array.ts";
import { StringCodec } from "~/bytes/string.ts";
import { U8, U16, U32 } from "~/primitives.ts";

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
