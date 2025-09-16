// deno-lint-ignore-file no-namespace no-explicit-any
// internal number-based varint (for lengths, etc.)
function encodeVarInt(value: number): Uint8Array {
	if (value < 0 || !Number.isSafeInteger(value)) {
		throw new RangeError("Value must be a non-negative safe integer");
	}
	const parts: number[] = [];
	while (value > 0x7F) {
		parts.push((value & 0x7F) | 0x80);
		value = Math.floor(value / 128); // arithmetic shift
	}
	parts.push(value);
	return new Uint8Array(parts);
}

function decodeVarInt(data: Uint8Array): { value: number; bytesRead: number } {
	let value = 0;
	let shift = 0;
	let bytesRead = 0;
	for (const byte of data) {
		value += (byte & 0x7F) * Math.pow(2, shift);
		bytesRead++;
		if ((byte & 0x80) === 0) {
			if (!Number.isSafeInteger(value)) {
				throw new RangeError("Decoded value exceeds MAX_SAFE_INTEGER");
			}
			return { value, bytesRead };
		}
		shift += 7;
		if (shift > 53) {
			throw new RangeError("VarInt too long for JS safe integer");
		}
	}
	throw new Error("Incomplete VarInt");
}

export namespace Codec {
	export type Infer<T> = T extends Codec<infer U> ? U : never;
}

export abstract class Codec<T> {
	public abstract readonly stride: number;
	public abstract encode(value: T): Uint8Array;
	public abstract decode(data: Uint8Array): T;
}

export class I8 extends Codec<number> {
	public readonly stride = 1;

	public encode(value: number): Uint8Array {
		const arr = new Uint8Array(1);
		const view = new DataView(arr.buffer);
		view.setInt8(0, value);
		return arr;
	}

	public decode(data: Uint8Array): number {
		const view = new DataView(
			data.buffer,
			data.byteOffset,
			data.byteLength,
		);
		return view.getInt8(0);
	}
}

export const i8: I8 = new I8();

export class U8 extends Codec<number> {
	public readonly stride = 1;

	public encode(value: number): Uint8Array {
		const arr = new Uint8Array(1);
		const view = new DataView(arr.buffer);
		view.setUint8(0, value);
		return arr;
	}

	public decode(data: Uint8Array): number {
		const view = new DataView(
			data.buffer,
			data.byteOffset,
			data.byteLength,
		);
		return view.getUint8(0);
	}
}

export const u8: U8 = new U8();

export class I16 extends Codec<number> {
	public readonly stride = 2;

	public encode(value: number): Uint8Array {
		const arr = new Uint8Array(2);
		const view = new DataView(arr.buffer);
		view.setInt16(0, value, true);
		return arr;
	}

	public decode(data: Uint8Array): number {
		const view = new DataView(
			data.buffer,
			data.byteOffset,
			data.byteLength,
		);
		return view.getInt16(0, true);
	}
}

export const i16: I16 = new I16();

export class U16 extends Codec<number> {
	public readonly stride = 2;

	public encode(value: number): Uint8Array {
		const arr = new Uint8Array(2);
		const view = new DataView(arr.buffer);
		view.setUint16(0, value, true);
		return arr;
	}

	public decode(data: Uint8Array): number {
		const view = new DataView(
			data.buffer,
			data.byteOffset,
			data.byteLength,
		);
		return view.getUint16(0, true);
	}
}

export const u16: U16 = new U16();

export class I32 extends Codec<number> {
	public readonly stride = 4;

	public encode(value: number): Uint8Array {
		const arr = new Uint8Array(4);
		const view = new DataView(arr.buffer);
		view.setInt32(0, value, true);
		return arr;
	}

	public decode(data: Uint8Array): number {
		const view = new DataView(
			data.buffer,
			data.byteOffset,
			data.byteLength,
		);
		return view.getInt32(0, true);
	}
}

export const i32: I32 = new I32();

export class U32 extends Codec<number> {
	public readonly stride = 4;

	public encode(value: number): Uint8Array {
		const arr = new Uint8Array(4);
		const view = new DataView(arr.buffer);
		view.setUint32(0, value, true);
		return arr;
	}

	public decode(data: Uint8Array): number {
		const view = new DataView(
			data.buffer,
			data.byteOffset,
			data.byteLength,
		);
		return view.getUint32(0, true);
	}
}

export const u32: U32 = new U32();

export class I64 extends Codec<bigint> {
	public readonly stride = 8;

	public encode(value: bigint): Uint8Array {
		const arr = new Uint8Array(8);
		const view = new DataView(arr.buffer);
		view.setBigInt64(0, value, true);
		return arr;
	}

	public decode(data: Uint8Array): bigint {
		const view = new DataView(
			data.buffer,
			data.byteOffset,
			data.byteLength,
		);
		return view.getBigInt64(0, true);
	}
}

export const i64: I64 = new I64();

export class U64 extends Codec<bigint> {
	public readonly stride = 8;

	public encode(value: bigint): Uint8Array {
		const arr = new Uint8Array(8);
		const view = new DataView(arr.buffer);
		view.setBigUint64(0, value, true);
		return arr;
	}

	public decode(data: Uint8Array): bigint {
		const view = new DataView(
			data.buffer,
			data.byteOffset,
			data.byteLength,
		);
		return view.getBigUint64(0, true);
	}
}

export const u64: U64 = new U64();

export class F32 extends Codec<number> {
	public readonly stride = 4;

	public encode(value: number): Uint8Array {
		const arr = new Uint8Array(4);
		const view = new DataView(arr.buffer);
		view.setFloat32(0, value, true);
		return arr;
	}

	public decode(data: Uint8Array): number {
		const view = new DataView(
			data.buffer,
			data.byteOffset,
			data.byteLength,
		);
		return view.getFloat32(0, true);
	}
}

export const f32: F32 = new F32();

export class F64 extends Codec<number> {
	public readonly stride = 8;

	public encode(value: number): Uint8Array {
		const arr = new Uint8Array(8);
		const view = new DataView(arr.buffer);
		view.setFloat64(0, value, true);
		return arr;
	}

	public decode(data: Uint8Array): number {
		const view = new DataView(
			data.buffer,
			data.byteOffset,
			data.byteLength,
		);
		return view.getFloat64(0, true);
	}
}

export const f64: F64 = new F64();

export class Bool extends Codec<boolean> {
	public readonly stride = 1;

	public encode(value: boolean): Uint8Array {
		return new Uint8Array([value ? 1 : 0]);
	}

	public decode(data: Uint8Array): boolean {
		return data[0] !== 0;
	}
}

export const bool: Bool = new Bool();

export class Str extends Codec<string> {
	public readonly stride = -1;
	private readonly encoder = new TextEncoder();
	private readonly decoder = new TextDecoder();

	public encode(value: string): Uint8Array {
		return this.encoder.encode(value);
	}

	public decode(data: Uint8Array): string {
		return this.decoder.decode(data);
	}
}

export const str: Str = new Str();

export class Bytes extends Codec<Uint8Array> {
	public readonly stride = -1;
	public encode(value: Uint8Array): Uint8Array {
		return value;
	}
	public decode(data: Uint8Array): Uint8Array {
		return data;
	}
}

export const bytes: Bytes = new Bytes();

export namespace Option {
	export type Value<T> = T | null;
	export type Infer<T extends Codec<any>> = Codec.Infer<T> | null;
}
export class Option<T> extends Codec<Option.Value<T>> {
	private readonly codec: Codec<T>;
	public readonly stride = -1;

	constructor(codec: Codec<T>) {
		super();
		this.codec = codec;
	}

	public encode(value: Option.Value<T>): Uint8Array {
		if (value === null) {
			return new Uint8Array([0]);
		} else {
			const encoded = this.codec.encode(value);
			const result = new Uint8Array(1 + encoded.length);
			result[0] = 1;
			result.set(encoded, 1);
			return result;
		}
	}

	public decode(data: Uint8Array): Option.Value<T> {
		if (data[0] === 0) {
			return null;
		} else {
			return this.codec.decode(data.subarray(1));
		}
	}
}

export namespace Tuple {
	export type Value<T extends readonly any[]> = T;
	export type Infer<T extends readonly Codec<any>[]> = {
		[K in keyof T]: Codec.Infer<T[K]>;
	};
}
export class Tuple<T extends readonly any[]> extends Codec<T> {
	public readonly codecs: { [I in keyof T]: Codec<T[I]> };
	public readonly stride: number;

	constructor(codecs: { [I in keyof T]: Codec<T[I]> }) {
		super();
		this.codecs = codecs;
		this.stride = 0;
		for (const codec of codecs) {
			if (codec.stride < 0) {
				this.stride = -1;
				break;
			}
			this.stride += codec.stride;
		}
	}

	// if a codec has fixed stride, dont add varint overhead.
	// if a codec has null stride, add varint overhead.
	public encode(value: Tuple.Value<T>): Uint8Array {
		const parts: Uint8Array[] = [];
		for (let i = 0; i < this.codecs.length; i++) {
			const codec = this.codecs[i]!;
			const part = codec.encode(value[i]!);
			if (codec.stride < 0) {
				parts.push(encodeVarInt(part.length));
			}
			parts.push(part);
		}

		const combinedLength = parts.reduce(
			(sum, part) => sum + part.length,
			0,
		);
		const combined = new Uint8Array(combinedLength);
		let offset = 0;
		for (const part of parts) {
			combined.set(part, offset);
			offset += part.length;
		}
		return combined;
	}

	public decode(data: Uint8Array): Tuple.Value<T> {
		const result: unknown[] = [];
		let offset = 0;
		for (let i = 0; i < this.codecs.length; i++) {
			const codec = this.codecs[i]!;
			let length = codec.stride;
			if (length < 0) {
				const { value, bytesRead } = decodeVarInt(
					data.subarray(offset),
				);
				length = value;
				offset += bytesRead;
			}
			const part = data.subarray(offset, offset + length);
			result[i] = codec.decode(part);
			offset += length;
		}
		return result as never;
	}
}

export namespace Struct {
	export type Value<T extends Record<string, any>> = T;
	export type Infer<T extends Record<string, Codec<any>>> = {
		[K in keyof T]: Codec.Infer<T[K]>;
	};
}
export class Struct<T extends Record<string, any>> extends Codec<T> {
	public readonly stride: number;
	public readonly shape: { [K in keyof T]: Codec<T[K]> };

	private readonly keys: (keyof T)[];
	private readonly tuple: Tuple<any[]>;

	constructor(shape: { [K in keyof T]: Codec<T[K]> }) {
		super();
		this.shape = shape;
		this.keys = Object.keys(shape) as (keyof T)[]; // definition order
		this.tuple = new Tuple(this.keys.map((key) => shape[key]));
		this.stride = this.tuple.stride;
	}

	public encode(value: Struct.Value<T>): Uint8Array {
		const tupleValue = this.keys.map((key) => value[key]);
		return this.tuple.encode(tupleValue);
	}

	public decode(data: Uint8Array): Struct.Value<T> {
		const tupleValue = this.tuple.decode(data);
		const result: Partial<Struct.Value<T>> = {};
		for (let i = 0; i < this.keys.length; i++) {
			const key = this.keys[i]!;
			result[key] = tupleValue[i]!;
		}
		return result as Struct.Value<T>;
	}
}

export namespace Vector {
	export type Value<T> = T[];
	export type Infer<T extends Codec<any>> = Codec.Infer<T>[];
}
export class Vector<T> extends Codec<Vector.Value<T>> {
	public readonly stride = -1;
	public readonly codec: Codec<T>;

	constructor(codec: Codec<T>) {
		super();
		this.codec = codec;
	}

	public encode(value: Vector.Value<T>): Uint8Array {
		if (this.codec.stride >= 0) {
			const parts = new Uint8Array(value.length * this.codec.stride);
			for (let i = 0; i < value.length; i++) {
				const part = this.codec.encode(value[i]!);
				parts.set(part, i * this.codec.stride);
			}
			return parts;
		} else {
			const parts: Uint8Array[] = [];
			for (const item of value) {
				const part = this.codec.encode(item);
				parts.push(encodeVarInt(part.length));
				parts.push(part);
			}

			const combinedLength = parts.reduce(
				(sum, part) => sum + part.length,
				0,
			);
			const combined = new Uint8Array(combinedLength);
			let offset = 0;
			for (const part of parts) {
				combined.set(part, offset);
				offset += part.length;
			}
			return combined;
		}
	}

	public decode(data: Uint8Array): Vector.Value<T> {
		const result: T[] = [];
		let offset = 0;
		if (this.codec.stride >= 0) {
			while (offset + this.codec.stride <= data.length) {
				const part = data.subarray(offset, offset + this.codec.stride);
				result.push(this.codec.decode(part));
				offset += this.codec.stride;
			}
		} else {
			while (offset < data.length) {
				const { value: length, bytesRead } = decodeVarInt(
					data.subarray(offset),
				);
				offset += bytesRead;
				const part = data.subarray(offset, offset + length);
				result.push(this.codec.decode(part));
				offset += length;
			}
		}
		return result;
	}
}

export namespace Enum {
	export type Value<T extends Record<string, any>> = {
		[K in keyof T]: { kind: K; value: T[K] };
	}[keyof T];
	export type Infer<T extends Record<string, Codec<any>>> = {
		[K in keyof T]: { kind: K; value: Codec.Infer<T[K]> };
	}[keyof T];
}
export class Enum<T extends Record<string, any>> extends Codec<Enum.Value<T>> {
	public readonly stride = -1;
	public readonly variants: { [K in keyof T]: Codec<T[K]> };
	private readonly keys: (keyof T)[];

	constructor(
		variants: { [K in keyof T]: Codec<T[K]> },
	) {
		super();
		this.variants = variants;
		this.keys = Object.keys(variants).sort() as (keyof T)[];
	}

	public encode(value: Enum.Value<T>): Uint8Array {
		const index = this.keys.indexOf(value.kind);
		if (index === -1) {
			throw new Error(`Invalid enum variant: ${String(value.kind)}`);
		}
		const codec = this.variants[value.kind]!;
		const encodedValue = codec.encode(value.value);
		return new Uint8Array([index, ...encodedValue]);
	}

	public decode(data: Uint8Array): Enum.Value<T> {
		const index = data[0]!;
		if (index >= this.keys.length) {
			throw new Error(`Invalid enum index: ${index}`);
		}
		const key = this.keys[index]!;
		const codec = this.variants[key]!;
		const value = codec.decode(data.subarray(1));
		return { type: key, value } as never;
	}
}

export namespace Mapping {
	export type Value<K, V> = Map<K, V>;
	export type Infer<K extends Codec<any>, V extends Codec<any>> = Map<
		Codec.Infer<K>,
		Codec.Infer<V>
	>;
}
export class Mapping<K, V> extends Codec<Mapping.Value<K, V>> {
	public readonly stride = -1;
	#entriesCodec: Vector<[K, V]>;

	constructor(keyCodec: Codec<K>, valueCodec: Codec<V>) {
		super();
		this.#entriesCodec = new Vector(new Tuple([keyCodec, valueCodec]));
	}

	public encode(value: Mapping.Value<K, V>): Uint8Array {
		return this.#entriesCodec.encode(value.entries().toArray());
	}

	public decode(data: Uint8Array): Mapping.Value<K, V> {
		const entries = this.#entriesCodec.decode(data);
		return new Map(entries);
	}
}
