import { assertEquals } from "@std/assert";
import { Bool, F32, F32LE, F64, F64LE, I16, I16LE, I32, I32LE, I64, I64LE, I8, U16, U16LE, U32, U32LE, U64, U64LE, U8 } from "~/primitives.ts";

Deno.test("I8 - roundtrip", () => {
	const testValues = [-128, -5, 0, 5, 127];
	for (const val of testValues) {
		const [decoded] = I8.decode(I8.encode(val));
		assertEquals(decoded, val);
	}
	assertEquals(I8.stride, { kind: "fixed", size: 1 });
});

Deno.test("U8 - roundtrip", () => {
	const testValues = [0, 5, 127, 128, 255];
	for (const val of testValues) {
		const [decoded] = U8.decode(U8.encode(val));
		assertEquals(decoded, val);
	}
	assertEquals(U8.stride, { kind: "fixed", size: 1 });
});

Deno.test("I16 - roundtrip", () => {
	const testValues = [-32768, -2, 0, 2, 32767];
	for (const val of testValues) {
		const [decoded] = I16.decode(I16.encode(val));
		assertEquals(decoded, val);
	}
	assertEquals(I16.stride, { kind: "fixed", size: 2 });
});

Deno.test("U16 - roundtrip", () => {
	const testValues = [0, 255, 256, 513, 65535];
	for (const val of testValues) {
		const [decoded] = U16.decode(U16.encode(val));
		assertEquals(decoded, val);
	}
	assertEquals(U16.stride, { kind: "fixed", size: 2 });
});

Deno.test("I32 - roundtrip", () => {
	const testValues = [-2147483648, -123456, 0, 123456, 2147483647];
	for (const val of testValues) {
		const [decoded] = I32.decode(I32.encode(val));
		assertEquals(decoded, val);
	}
	assertEquals(I32.stride, { kind: "fixed", size: 4 });
});

Deno.test("U32 - roundtrip", () => {
	const testValues = [0, 255, 65536, 16777216, 4294967295];
	for (const val of testValues) {
		const [decoded] = U32.decode(U32.encode(val));
		assertEquals(decoded, val);
	}
	assertEquals(U32.stride, { kind: "fixed", size: 4 });
});

Deno.test("I64 - roundtrip", () => {
	const testValues = [
		-9223372036854775808n,
		-123n,
		0n,
		123n,
		9223372036854775807n,
	];
	for (const val of testValues) {
		const [decoded] = I64.decode(I64.encode(val));
		assertEquals(decoded, val);
	}
	assertEquals(I64.stride, { kind: "fixed", size: 8 });
});

Deno.test("U64 - roundtrip", () => {
	const testValues = [
		0n,
		255n,
		65536n,
		9007199254740991n,
		18446744073709551615n,
	];
	for (const val of testValues) {
		const [decoded] = U64.decode(U64.encode(val));
		assertEquals(decoded, val);
	}
	assertEquals(U64.stride, { kind: "fixed", size: 8 });
});

Deno.test("F32 - roundtrip", () => {
	const testValues = [0, -1.5, 1.5, 3.14159, -3.14159];
	for (const val of testValues) {
		const [decoded] = F32.decode(F32.encode(Math.fround(val)));
		assertEquals(decoded, Math.fround(val));
	}
	assertEquals(F32.stride, { kind: "fixed", size: 4 });
});

Deno.test("F64 - roundtrip", () => {
	const testValues = [0, -1.5, 1.5, 3.141592653589793, -3.141592653589793];
	for (const val of testValues) {
		const [decoded] = F64.decode(F64.encode(val));
		assertEquals(decoded, val);
	}
	assertEquals(F64.stride, { kind: "fixed", size: 8 });
});

// Little-endian variants

Deno.test("I16LE - roundtrip", () => {
	const testValues = [-32768, -2, 0, 2, 32767];
	for (const val of testValues) {
		const [decoded] = I16LE.decode(I16LE.encode(val));
		assertEquals(decoded, val);
	}
	assertEquals(I16LE.stride, { kind: "fixed", size: 2 });
	const encoded = I16LE.encode(513);
	assertEquals(Array.from(encoded), [0x01, 0x02]);
});

Deno.test("U16LE - roundtrip", () => {
	const testValues = [0, 255, 256, 513, 65535];
	for (const val of testValues) {
		const [decoded] = U16LE.decode(U16LE.encode(val));
		assertEquals(decoded, val);
	}
	assertEquals(U16LE.stride, { kind: "fixed", size: 2 });
	const encodedLE = U16LE.encode(513);
	const encodedBE = U16.encode(513);
	assertEquals(Array.from(encodedLE), [0x01, 0x02]);
	assertEquals(Array.from(encodedBE), [0x02, 0x01]);
});

Deno.test("I32LE - roundtrip", () => {
	const testValues = [-2147483648, -123456, 0, 123456, 2147483647];
	for (const val of testValues) {
		const [decoded] = I32LE.decode(I32LE.encode(val));
		assertEquals(decoded, val);
	}
	assertEquals(I32LE.stride, { kind: "fixed", size: 4 });
});

Deno.test("U32LE - roundtrip", () => {
	const testValues = [0, 255, 65536, 16777216, 4294967295];
	for (const val of testValues) {
		const [decoded] = U32LE.decode(U32LE.encode(val));
		assertEquals(decoded, val);
	}
	assertEquals(U32LE.stride, { kind: "fixed", size: 4 });
});

Deno.test("I64LE - roundtrip", () => {
	const testValues = [
		-9223372036854775808n,
		-123n,
		0n,
		123n,
		9223372036854775807n,
	];
	for (const val of testValues) {
		const [decoded] = I64LE.decode(I64LE.encode(val));
		assertEquals(decoded, val);
	}
	assertEquals(I64LE.stride, { kind: "fixed", size: 8 });
});

Deno.test("U64LE - roundtrip", () => {
	const testValues = [
		0n,
		255n,
		65536n,
		9007199254740991n,
		18446744073709551615n,
	];
	for (const val of testValues) {
		const [decoded] = U64LE.decode(U64LE.encode(val));
		assertEquals(decoded, val);
	}
	assertEquals(U64LE.stride, { kind: "fixed", size: 8 });
});

Deno.test("F32LE - roundtrip", () => {
	const testValues = [0, -1.5, 1.5, 3.14159, -3.14159];
	for (const val of testValues) {
		const [decoded] = F32LE.decode(F32LE.encode(Math.fround(val)));
		assertEquals(decoded, Math.fround(val));
	}
	assertEquals(F32LE.stride, { kind: "fixed", size: 4 });
});

Deno.test("F64LE - roundtrip", () => {
	const testValues = [0, -1.5, 1.5, 3.141592653589793, -3.141592653589793];
	for (const val of testValues) {
		const [decoded] = F64LE.decode(F64LE.encode(val));
		assertEquals(decoded, val);
	}
	assertEquals(F64LE.stride, { kind: "fixed", size: 8 });
});

Deno.test("I32LE/U32LE - byte order", () => {
	// 0x01020304 BE = [01, 02, 03, 04]; LE = [04, 03, 02, 01]
	assertEquals(Array.from(I32LE.encode(0x01020304)), [0x04, 0x03, 0x02, 0x01]);
	assertEquals(Array.from(U32LE.encode(0x01020304)), [0x04, 0x03, 0x02, 0x01]);
	// confirm differs from BE
	assertEquals(Array.from(I32.encode(0x01020304)), [0x01, 0x02, 0x03, 0x04]);
	assertEquals(Array.from(U32.encode(0x01020304)), [0x01, 0x02, 0x03, 0x04]);
});

Deno.test("I64LE/U64LE - byte order", () => {
	// 0x0102030405060708n BE = [01..08]; LE = [08..01]
	assertEquals(Array.from(I64LE.encode(0x0102030405060708n)), [0x08, 0x07, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01]);
	assertEquals(Array.from(U64LE.encode(0x0102030405060708n)), [0x08, 0x07, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01]);
});

Deno.test("F32LE/F64LE - byte order", () => {
	// 1.0 as F32 IEEE 754 = 3F800000; LE = [00, 00, 80, 3F]
	assertEquals(Array.from(F32LE.encode(1.0)), [0x00, 0x00, 0x80, 0x3f]);
	// 1.0 as F64 IEEE 754 = 3FF0000000000000; LE = [00, 00, 00, 00, 00, 00, F0, 3F]
	assertEquals(Array.from(F64LE.encode(1.0)), [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf0, 0x3f]);
});

// Bool

Deno.test("Bool - roundtrip", () => {
	const [t] = Bool.decode(Bool.encode(true));
	const [f] = Bool.decode(Bool.encode(false));
	assertEquals(t, true);
	assertEquals(f, false);
	assertEquals(Array.from(Bool.encode(true)), [0x01]);
	assertEquals(Array.from(Bool.encode(false)), [0x00]);
	assertEquals(Bool.stride, { kind: "fixed", size: 1 });
});

Deno.test("primitives - encodeInto writes at offset", () => {
	const buffer = new Uint8Array(20);
	let off = 0;
	off += I8.encodeInto(-5, buffer, off);
	off += U8.encodeInto(200, buffer, off);
	off += I16.encodeInto(0x1234, buffer, off);
	off += U16LE.encodeInto(0xABCD, buffer, off);
	off += Bool.encodeInto(true, buffer, off);

	assertEquals(off, 7);
	assertEquals(Array.from(buffer.subarray(0, off)), [0xFB, 0xC8, 0x12, 0x34, 0xCD, 0xAB, 0x01]);

	// Verify roundtrip
	const [i8Val, i8Size] = I8.decode(buffer);
	let pos = i8Size;
	const [u8Val, u8Size] = U8.decode(buffer.subarray(pos));
	pos += u8Size;
	const [i16Val, i16Size] = I16.decode(buffer.subarray(pos));
	pos += i16Size;
	const [u16leVal, u16leSize] = U16LE.decode(buffer.subarray(pos));
	pos += u16leSize;
	const [boolVal, boolSize] = Bool.decode(buffer.subarray(pos));

	assertEquals(i8Val, -5);
	assertEquals(u8Val, 200);
	assertEquals(i16Val, 0x1234);
	assertEquals(u16leVal, 0xABCD);
	assertEquals(boolVal, true);
	assertEquals(i8Size + u8Size + i16Size + u16leSize + boolSize, 7);
});

Deno.test("primitives - encodeInto returns fixed sizes", () => {
	const target = new Uint8Array(64);
	assertEquals(I8.encodeInto(0, target), 1);
	assertEquals(U8.encodeInto(0, target), 1);
	assertEquals(I16.encodeInto(0, target), 2);
	assertEquals(U16.encodeInto(0, target), 2);
	assertEquals(I32.encodeInto(0, target), 4);
	assertEquals(U32.encodeInto(0, target), 4);
	assertEquals(I64.encodeInto(0n, target), 8);
	assertEquals(U64.encodeInto(0n, target), 8);
	assertEquals(F32.encodeInto(0, target), 4);
	assertEquals(F64.encodeInto(0, target), 8);
	assertEquals(Bool.encodeInto(false, target), 1);
});
