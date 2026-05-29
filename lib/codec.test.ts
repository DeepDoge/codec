import { assertEquals } from "@std/assert";
import { CodecWithOffsets, TransformCodec } from "~/codec.ts";
import { U8, Void } from "~/primitives.ts";

// ── VoidCodec / Void ──────────────────────────────────────────────────────────

Deno.test("Void - stride is fixed 0 bytes", () => {
	assertEquals(Void.stride, { kind: "fixed", size: 0 });
});

Deno.test("Void - encode produces 0 bytes", () => {
	assertEquals(Void.encode(undefined).byteLength, 0);
	assertEquals(Void.encode(null).byteLength, 0);
	assertEquals(Void.encode(void 0).byteLength, 0);
});

Deno.test("Void - encode returns target unchanged when provided", () => {
	const target = new Uint8Array(4);
	const result = Void.encode(undefined, target);
	assertEquals(result, target);
});

Deno.test("Void - decode consumes 0 bytes", () => {
	const [value, bytesRead] = Void.decode(new Uint8Array([1, 2, 3]));
	assertEquals(value, undefined);
	assertEquals(bytesRead, 0);
});

Deno.test("Void - decode on empty buffer", () => {
	const [value, bytesRead] = Void.decode(new Uint8Array(0));
	assertEquals(value, undefined);
	assertEquals(bytesRead, 0);
});

Deno.test("Void - roundtrip", () => {
	const [decoded, bytesRead] = Void.decode(Void.encode(undefined));
	assertEquals(decoded, undefined);
	assertEquals(bytesRead, 0);
});

// ── TransformCodec / Codec.transform() ───────────────────────────────────────

Deno.test("TransformCodec - stride inherited from inner codec", () => {
	const Clamped = U8.transform((n) => Math.min(n, 100));
	assertEquals(Clamped.stride, U8.stride);
	assertEquals(Clamped.stride, { kind: "fixed", size: 1 });
});

Deno.test("TransformCodec - decode applies transformer", () => {
	const Clamped = U8.transform((n) => Math.min(n, 100));
	const [value, bytesRead] = Clamped.decode(new Uint8Array([200]));
	assertEquals(value, 100);
	assertEquals(bytesRead, 1);
});

Deno.test("TransformCodec - decode passthrough when under cap", () => {
	const Clamped = U8.transform((n) => Math.min(n, 100));
	const [value] = Clamped.decode(new Uint8Array([42]));
	assertEquals(value, 42);
});

Deno.test("TransformCodec - encode delegates to inner codec unchanged", () => {
	const Doubled = U8.transform((n) => n * 2);
	const encoded = Doubled.encode(42);
	assertEquals(Array.from(encoded), [42]);
});

Deno.test("TransformCodec - transformer receives raw bytes", () => {
	let capturedBytes: Uint8Array | null = null;
	const Spy = U8.transform((n, bytes) => {
		capturedBytes = bytes;
		return n;
	});
	Spy.decode(new Uint8Array([0xab, 0xff]));
	assertEquals(capturedBytes, new Uint8Array([0xab]));
});

Deno.test("TransformCodec - roundtrip via numeric transform", () => {
	// encode(50) → [50]; decode([50]) → 50 * 2 = 100
	const Doubled = U8.transform((n) => n * 2);
	const encoded = Doubled.encode(50);
	const [decoded] = Doubled.decode(encoded);
	assertEquals(decoded, 100);
});

Deno.test("TransformCodec - inner property set correctly", () => {
	const T = U8.transform((n) => n * 2);
	assertEquals(T.inner, U8);
});

Deno.test("TransformCodec - constructed directly via new", () => {
	const T = new TransformCodec(U8, (n: number) => n + 1);
	const [value] = T.decode(new Uint8Array([9]));
	assertEquals(value, 10);
	assertEquals(T.stride, { kind: "fixed", size: 1 });
});

// ── CodecWithOffsets ──────────────────────────────────────────────────────────

// Concrete impl: two-field struct [U8 a, U8 b]
type TwoFields = { a: number; b: number };
type TwoOffsets = { a: number; b: number };

class TwoFieldCodec extends CodecWithOffsets<TwoFields, TwoFields, TwoOffsets> {
	public readonly stride = { kind: "fixed" as const, size: 2 };

	public encode(value: TwoFields, target?: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
		const arr = target ?? new Uint8Array(2);
		arr[0] = value.a;
		arr[1] = value.b;
		return arr;
	}

	public decode(data: Uint8Array): [TwoFields, number] {
		return [{ a: data[0], b: data[1] }, 2];
	}

	public encodeWithOffsets(value: TwoFields, target?: Uint8Array<ArrayBuffer>): { bytes: Uint8Array<ArrayBuffer>; offsets: TwoOffsets } {
		const bytes = this.encode(value, target);
		return { bytes, offsets: { a: 0, b: 1 } };
	}

	public decodeWithOffsets(data: Uint8Array): [{ value: TwoFields; offsets: TwoOffsets }, number] {
		const [value, bytesRead] = this.decode(data);
		return [{ value, offsets: { a: 0, b: 1 } }, bytesRead];
	}
}

const TwoField = new TwoFieldCodec();

Deno.test("CodecWithOffsets - encodeWithOffsets returns correct bytes", () => {
	const { bytes, offsets } = TwoField.encodeWithOffsets({ a: 0x0a, b: 0x0b });
	assertEquals(Array.from(bytes), [0x0a, 0x0b]);
	assertEquals(offsets, { a: 0, b: 1 });
});

Deno.test("CodecWithOffsets - encodeWithOffsets uses target buffer", () => {
	const target = new Uint8Array(2);
	const { bytes } = TwoField.encodeWithOffsets({ a: 7, b: 8 }, target);
	assertEquals(bytes, target);
	assertEquals(Array.from(target), [7, 8]);
});

Deno.test("CodecWithOffsets - decodeWithOffsets returns correct value and offsets", () => {
	const data = new Uint8Array([0x12, 0x34, 0xff]);
	const [{ value, offsets }, bytesRead] = TwoField.decodeWithOffsets(data);
	assertEquals(value, { a: 0x12, b: 0x34 });
	assertEquals(offsets, { a: 0, b: 1 });
	assertEquals(bytesRead, 2);
});

Deno.test("CodecWithOffsets - extends Codec (encode/decode still work)", () => {
	const [value, bytesRead] = TwoField.decode(new Uint8Array([5, 6]));
	assertEquals(value, { a: 5, b: 6 });
	assertEquals(bytesRead, 2);
});

// ── Codec.decodeAndReturnValue() ─────────────────────────────────────────────

Deno.test("decodeAndReturnValue - returns value only", () => {
	const value = U8.decodeAndReturnValue(new Uint8Array([42]));
	assertEquals(value, 42);
});

Deno.test("decodeAndReturnValue - Void returns undefined", () => {
	const value = Void.decodeAndReturnValue(new Uint8Array([1, 2, 3]));
	assertEquals(value, undefined);
});

Deno.test("decodeAndReturnValue - TransformCodec applies transform", () => {
	const Doubled = U8.transform((n) => n * 2);
	const value = Doubled.decodeAndReturnValue(new Uint8Array([21]));
	assertEquals(value, 42);
});

Deno.test("decodeAndReturnValue - does not return bytesRead", () => {
	const result = U8.decodeAndReturnValue(new Uint8Array([99]));
	// result is a plain number, not a tuple
	assertEquals(typeof result, "number");
	assertEquals(result, 99);
});
