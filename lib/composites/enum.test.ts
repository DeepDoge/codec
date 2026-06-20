import { assertEquals, assertThrows } from "@std/assert";
import { EnumCodec } from "~/composites/enum.ts";
import { ModelCodec } from "~/composites/model.ts";
import { StringCodec } from "~/bytes/string.ts";
import { U32, U8 } from "~/primitives.ts";

Deno.test("Enum - simple variants", () => {
	const MyUnion = new EnumCodec({ A: U8, B: new StringCodec() });

	const valA = { kind: "A", value: 5 } as const;
	const [decodedA] = MyUnion.decode(MyUnion.encode(valA));
	assertEquals(decodedA, valA);

	const valB = { kind: "B", value: "ok" } as const;
	const [decodedB] = MyUnion.decode(MyUnion.encode(valB));
	assertEquals(decodedB, valB);

	assertEquals(MyUnion.stride, { kind: "variable" });
});

Deno.test("Enum - variant definition order", () => {
	const MyUnion = new EnumCodec({ B: U8, A: U8 });
	const encA = MyUnion.encode({ kind: "A", value: 5 });
	const encB = MyUnion.encode({ kind: "B", value: 5 });
	assertEquals(encB[0], 0); // B is first (definition order)
	assertEquals(encA[0], 1); // A is second
});

Deno.test("Enum - invalid variant", () => {
	const MyUnion = new EnumCodec({ A: U8, B: U8 });
	assertThrows(
		() => MyUnion.encode({ kind: "C" as never, value: 5 }),
		Error,
		"Invalid union variant",
	);
});

Deno.test("Enum - complex payloads", () => {
	const UserStruct = new ModelCodec({ id: U32, name: new StringCodec() });
	const Event = new EnumCodec({
		Created: UserStruct,
		Deleted: U32,
		Updated: UserStruct,
	});

	const created = { kind: "Created", value: { id: 1, name: "Alice" } } as const;
	const [decodedCreated] = Event.decode(Event.encode(created));
	assertEquals(decodedCreated, created);

	const deleted = { kind: "Deleted", value: 42 } as const;
	const [decodedDeleted] = Event.decode(Event.encode(deleted));
	assertEquals(decodedDeleted, deleted);
});

Deno.test("Enum - custom index codec (U32)", () => {
	const MyUnion = new EnumCodec(
		{ A: U8, B: new StringCodec() },
		{ indexer: U32 },
	);

	const valA = { kind: "A", value: 5 } as const;
	const [decodedA] = MyUnion.decode(MyUnion.encode(valA));
	assertEquals(decodedA, valA);

	const valB = { kind: "B", value: "ok" } as const;
	const [decodedB] = MyUnion.decode(MyUnion.encode(valB));
	assertEquals(decodedB, valB);

	const encodedA = MyUnion.encode(valA);
	assertEquals(encodedA[0], 0);
	assertEquals(encodedA[1], 0);
	assertEquals(encodedA[2], 0);
	assertEquals(encodedA[3], 0); // A is index 0
	assertEquals(encodedA[4], 5); // Payload follows
});

Deno.test("Enum - invalid index on decode", () => {
	const MyUnion = new EnumCodec({ A: U8, B: U8 }); // 2 variants, indices 0 and 1
	// Craft buffer with index=5, out of range
	const buf = new Uint8Array([5, 0]);
	assertThrows(
		() => MyUnion.decode(buf),
		Error,
		"Invalid union index",
	);
});

Deno.test("Enum - variants property", () => {
	const variants = { A: U8, B: U32 };
	const MyUnion = new EnumCodec(variants);
	assertEquals(MyUnion.variants, variants);
});

Deno.test("Enum - indexer property", () => {
	const MyUnion = new EnumCodec({ A: U8 }, { indexer: U32 });
	assertEquals(MyUnion.indexer, U32);
});

Deno.test("Enum - encodeInto", () => {
	const MyUnion = new EnumCodec({ A: U8, B: new StringCodec() });
	const val = { kind: "B", value: "ok" } as const;
	const target = new Uint8Array(16);
	const written = MyUnion.encodeInto(val, target, 1);
	const [decoded, bytesRead] = MyUnion.decode(target.subarray(1, 1 + written));
	assertEquals(decoded, val);
	assertEquals(bytesRead, written);
});

Deno.test("Enum - encodeInto matches encode", () => {
	const MyUnion = new EnumCodec({ A: U8, B: new StringCodec() }, { indexer: U32 });
	const val = { kind: "A", value: 7 } as const;
	const encoded = MyUnion.encode(val);
	const target = new Uint8Array(encoded.length + 2);
	const written = MyUnion.encodeInto(val, target, 2);
	assertEquals(written, encoded.length);
	assertEquals(Array.from(target.subarray(2, 2 + written)), Array.from(encoded));
});
