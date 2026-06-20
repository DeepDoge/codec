import { assertEquals } from "@std/assert";
import { MappingCodec } from "~/composites/mapping.ts";
import { ModelCodec } from "~/composites/model.ts";
import { StringCodec } from "~/bytes/string.ts";
import { U32, U8 } from "~/primitives.ts";

Deno.test("Mapping - simple", () => {
	const Dict = new MappingCodec([new StringCodec(), U8]);
	const val = new Map([["x", 1], ["y", 2]]);
	const [decoded] = Dict.decode(Dict.encode(val));
	assertEquals(Array.from(decoded.entries()), Array.from(val.entries()));
	assertEquals(Dict.stride, { kind: "variable" });
});

Deno.test("Mapping - empty", () => {
	const Dict = new MappingCodec([U32, new StringCodec()]);
	const val = new Map<number, string>();
	const [decoded] = Dict.decode(Dict.encode(val));
	assertEquals(decoded.size, 0);
});

Deno.test("Mapping - complex types", () => {
	const UserStruct = new ModelCodec({ id: U32, name: new StringCodec() });
	const UserMap = new MappingCodec([U32, UserStruct]);
	const val = new Map([
		[1, { id: 1, name: "Alice" }],
		[2, { id: 2, name: "Bob" }],
	]);
	const [decoded] = UserMap.decode(UserMap.encode(val));
	assertEquals(Array.from(decoded.entries()), Array.from(val.entries()));
});

Deno.test("Mapping - custom count codec (U32)", () => {
	const DictU32 = new MappingCodec([new StringCodec(), U8], { counter: U32 });
	const val = new Map([["x", 1], ["y", 2]]);
	const [decoded] = DictU32.decode(DictU32.encode(val));
	assertEquals(Array.from(decoded.entries()), Array.from(val.entries()));
	const encodedU32 = DictU32.encode(val);
	assertEquals(encodedU32[0], 0);
	assertEquals(encodedU32[1], 0);
	assertEquals(encodedU32[2], 0);
	assertEquals(encodedU32[3], 2); // Count is 2
});

Deno.test("Mapping - encodeInto", () => {
	const Dict = new MappingCodec([new StringCodec(), U8]);
	const val = new Map([["x", 1], ["y", 2]]);
	const target = new Uint8Array(32);
	const written = Dict.encodeInto(val, target, 2);
	const [decoded, bytesRead] = Dict.decode(target.subarray(2, 2 + written));
	assertEquals(Array.from(decoded.entries()), Array.from(val.entries()));
	assertEquals(bytesRead, written);
});

Deno.test("Mapping - encodeInto matches encode", () => {
	const Dict = new MappingCodec([new StringCodec(), U8], { counter: U32 });
	const val = new Map([["a", 1], ["b", 2]]);
	const encoded = Dict.encode(val);
	const target = new Uint8Array(encoded.length + 1);
	const written = Dict.encodeInto(val, target, 1);
	assertEquals(written, encoded.length);
	assertEquals(Array.from(target.subarray(1, 1 + written)), Array.from(encoded));
});
