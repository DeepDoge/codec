// deno-lint-ignore-file no-explicit-any
import { Codec } from "./codec.ts";
import { U8Codec } from "./primitives.ts";
import { VarInt } from "./varint.ts";

export type OptionGeneric = Codec<any>;
export type OptionValue<T extends OptionGeneric> = Codec.Infer<T> | null;

/**
 * Codec for optional values (present or null).
 *
 * Encoding:
 * - 0x00 => null
 * - 0x01 => followed by payload bytes encoded with the inner codec
 *
 * @template T - The inner value type
 *
 * @example
 * ```ts
 * import { OptionCodec, U8 } from "@nomadshiba/codec";
 *
 * const maybeU8 = new OptionCodec(U8);
 * maybeU8.encode(null);                // [0x00]
 * maybeU8.encode(7);                   // [0x01, 0x07]
 * maybeU8.decode(new Uint8Array([0]));   // [null, 1]
 * maybeU8.decode(new Uint8Array([1, 9])); // [9, 2]
 * ```
 */
export class OptionCodec<T extends OptionGeneric>
	extends Codec<OptionValue<T>> {
	private readonly codec: T;
	public readonly stride = -1;

	constructor(codec: T) {
		super();
		this.codec = codec;
	}

	public encode(value: OptionValue<T>): Uint8Array {
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

	public decode(data: Uint8Array): [OptionValue<T>, number] {
		if (data[0] === 0) {
			return [null, 1];
		} else {
			const [value, size] = this.codec.decode(data.subarray(1));
			return [value, 1 + size];
		}
	}
}

export type TupleGeneric = readonly Codec<any>[];
export type TupleValue<T extends TupleGeneric> = {
	-readonly [I in keyof T]: Codec.Infer<T[I]>;
};

/**
 * Codec for fixed-length tuples of potentially different types.
 *
 * Encoding (no length prefixes added by Tuple itself):
 * - For each element in order: append raw bytes from element's encode()
 * - Elements with variable stride must encode their own size info
 *
 * Decoding reads each element in order using stride.
 *
 * @template T - Tuple element types
 *
 * @example
 * ```ts
 * import { StringCodec, TupleCodec, U8 } from "@nomadshiba/codec";
 *
 * const str = new StringCodec();
 * // [U8, str]: first byte is U8, then str with its own varint length
 * const t = new TupleCodec([U8, str]);
 * const enc = t.encode([5, "hi"]);    // [0x05, 0x02, 0x68, 0x69]
 * t.decode(enc);                      // [[5, "hi"], 4]
 * ```
 */
export class TupleCodec<const T extends TupleGeneric>
	extends Codec<TupleValue<T>> {
	public readonly codecs: T;
	public readonly stride: number;

	constructor(codecs: T) {
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

	public encode(value: TupleValue<T>): Uint8Array {
		const parts: Uint8Array[] = [];
		for (let i = 0; i < this.codecs.length; i++) {
			const codec = this.codecs[i]!;
			const part = codec.encode(value[i]!);
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

	public decode(data: Uint8Array): [TupleValue<T>, number] {
		const result: unknown[] = [];
		let offset = 0;
		for (let i = 0; i < this.codecs.length; i++) {
			const codec = this.codecs[i]!;
			const [value, size] = codec.decode(data.subarray(offset));
			result[i] = value;
			offset += size;
		}
		return [result as never, offset];
	}
}

export type StructGeneric = { readonly [key: string]: Codec<any> };
export type StructValue<T extends StructGeneric> = {
	-readonly [K in keyof T]: Codec.Infer<T[K]>;
};

export type StructOptions<T extends StructGeneric, U extends StructValue<T>> = {
	finalizer?: (params: { bytes: Uint8Array; value: StructValue<T> }) => U;
};

/**
 * Codec for structured objects with named fields.
 *
 * Layout is the same as a Tuple of fields in DEFINITION ORDER.
 * Definition order matters because the binary is a tuple, not a map.
 *
 * For variable-length fields, each field is prefixed with a VarInt length
 * (handled by Tuple), while fixed-size fields are concatenated directly.
 *
 * @template T - Record mapping field names to codecs
 *
 * @example
 * ```ts
 * import { StringCodec, StructCodec, U32 } from "@nomadshiba/codec";
 *
 * const str = new StringCodec();
 * // Definition order: id (U32) then name (str)
 * const User = new StructCodec({ id: U32, name: str } as const);
 * const bin = User.encode({ id: 42, name: "Ada" });
 * // Decodes back to the same object
 * User.decode(bin); // [{ id: 42, name: "Ada" }, size]
 * ```
 *
 * @example
 * ```ts
 * import { StringCodec, StructCodec, U32 } from "@nomadshiba/codec";
 *
 * const str = new StringCodec();
 * // Reordering fields changes the binary layout
 * const User2 = new StructCodec({ name: str, id: U32 } as const);
 * // User.encode(...) is NOT compatible with User2.decode(...)
 * ```
 */
export class StructCodec<
	const T extends StructGeneric,
	O extends StructValue<T> = StructValue<T>,
> extends Codec<StructValue<T>, O> {
	public readonly stride: number;
	public readonly shape: T;
	public readonly finalizer?: StructOptions<T, O>["finalizer"];

	private readonly keys: Extract<keyof T, string>[];
	private readonly tuple: TupleCodec<T[(keyof T)][]>;

	constructor(shape: T, options?: StructOptions<T, O>) {
		super();
		this.shape = shape;
		this.keys = Object.keys(shape) as typeof this.keys;
		this.tuple = new TupleCodec(this.keys.map((key) => shape[key]));
		this.stride = this.tuple.stride;
		this.finalizer = options?.finalizer;
	}

	public encode(value: StructValue<T>): Uint8Array {
		const tupleValue = this.keys.map((key) => value[key]);
		return this.tuple.encode(tupleValue);
	}

	public decode(data: Uint8Array): [O, number] {
		const [tupleValue, size] = this.tuple.decode(data);
		const result = {} as StructValue<T>;
		for (let i = 0; i < this.keys.length; i++) {
			const key = this.keys[i]!;
			result[key] = tupleValue[i]!;
		}

		if (this.finalizer) {
			return [this.finalizer({ bytes: data, value: result }), size];
		}

		return [result as O, size];
	}
}

export type ArrayGeneric = Codec<any>;
export type ArrayValue<T extends ArrayGeneric> = Codec.Infer<T>[];

/**
 * Options for Array codec.
 */
export type ArrayOptions = {
	/** Codec for encoding the count prefix. Default is varint. */
	countCodec?: Codec<number>;
};

/**
 * Codec for variable-length arrays of the same element type.
 *
 * Encoding:
 * - Count prefix (varint by default, or custom countCodec)
 * - Elements concatenated (each element knows its own size via stride)
 *
 * @template T - Element type
 *
 * @example
 * ```ts
 * import { ArrayCodec, U16 } from "@nomadshiba/codec";
 *
 * // Default: varint count prefix
 * const nums = new ArrayCodec(U16);
 * const b = nums.encode([1, 513]);    // [0x02, 0x02, 0x01, 0x01, 0x02]
 * nums.decode(b);                     // [[1, 513], 5]
 * ```
 *
 * @example
 * ```ts
 * import { ArrayCodec, U16, U32 } from "@nomadshiba/codec";
 *
 * // Custom count codec (e.g., U32 for fixed 4-byte count)
 * const numsU32 = new ArrayCodec(U16, { countCodec: U32 });
 * ```
 *
 * @example
 * ```ts
 * import { ArrayCodec, StringCodec } from "@nomadshiba/codec";
 *
 * const str = new StringCodec();
 * // Variable-stride elements
 * const words = new ArrayCodec(str);
 * const wb = words.encode(["a", "bc"]); // [0x02, 0x01, 'a', 0x02, 'b', 'c']
 * words.decode(wb);                      // [["a", "bc"], 6]
 * ```
 */
export class ArrayCodec<T extends ArrayGeneric> extends Codec<ArrayValue<T>> {
	public readonly stride = -1;
	readonly #countCodec: Codec<number>;
	readonly #codec: T;

	constructor(codec: T, options?: ArrayOptions) {
		super();
		this.#codec = codec;
		this.#countCodec = options?.countCodec ?? VarInt;
	}

	public get codec(): Codec<T> {
		return this.#codec;
	}

	public encode(value: ArrayValue<T>): Uint8Array {
		const parts: Uint8Array[] = [];

		for (const item of value) {
			const part = this.#codec.encode(item);
			parts.push(part);
		}

		const combinedLength = parts.reduce(
			(sum, part) => sum + part.length,
			0,
		);
		const elementsData = new Uint8Array(combinedLength);
		let offset = 0;
		for (const part of parts) {
			elementsData.set(part, offset);
			offset += part.length;
		}

		const countPrefix = this.#countCodec.encode(value.length);
		const result = new Uint8Array(countPrefix.length + elementsData.length);
		result.set(countPrefix, 0);
		result.set(elementsData, countPrefix.length);
		return result;
	}

	public decode(data: Uint8Array): [ArrayValue<T>, number] {
		const [count, bytesRead] = this.#countCodec.decode(data);
		const result: ArrayValue<T> = [];
		let offset = bytesRead;

		for (let i = 0; i < count; i++) {
			const [value, size] = this.#codec.decode(data.subarray(offset));
			result.push(value);
			offset += size;
		}

		return [result, offset];
	}
}

export type EnumGeneric = { readonly [key: string]: Codec<any> };
export type EnumValue<T extends StructGeneric> = {
	-readonly [K in keyof T]: { kind: K; value: Codec.Infer<T[K]> };
}[keyof T];

/**
 * Options for Enum codec.
 */
export type EnumOptions = {
	/** Codec for encoding the variant index. Default is u8 (1 byte). */
	indexCodec?: Codec<number>;
};

/**
 * Codec for tagged unions (enums).
 *
 * Variant index is determined by sorting variant names ascending
 * (Object.keys(variants).sort()).
 *
 * Encoding:
 * - Variant index (u8 by default, or custom indexCodec)
 * - payload: bytes encoded by the variant's codec
 *
 * Decoding returns { kind, value }.
 *
 * @template T - Record mapping variant names to codecs
 *
 * @example
 * ```ts
 * import { EnumCodec, U8Codec, StringCodec } from "@nomadshiba/codec";
 *
 * const str = new StringCodec();
 * const U8 = new U8Codec();
 *
 * // Default: U8 for variant index
 * const MyEnum = new EnumCodec({ A: U8, B: str });
 * const b = MyEnum.encode({ kind: "B", value: "ok" });
 * const v = MyEnum.decode(b); // [{ kind: "B", value: "ok" }, size]
 * ```
 *
 * @example
 * ```ts
 * import { EnumCodec, U8Codec, StringCodec, U32 } from "@nomadshiba/codec";
 *
 * const str = new StringCodec();
 * const U8 = new U8Codec();
 *
 * // Custom index codec (e.g., U32 for large enums)
 * const MyEnum = new EnumCodec({ A: U8, B: str }, { indexCodec: U32 });
 * ```
 */
export class EnumCodec<const T extends EnumGeneric>
	extends Codec<EnumValue<T>> {
	public readonly stride = -1;
	public readonly variants: T;
	readonly #indexCodec: Codec<number>;
	private readonly keys: (keyof T)[];

	constructor(variants: T, options?: EnumOptions) {
		super();
		this.variants = variants;
		this.keys = Object.keys(this.variants).sort() as (keyof T)[];
		this.#indexCodec = options?.indexCodec ?? new U8Codec();
	}

	public encode(value: EnumValue<T>): Uint8Array {
		const index = this.keys.indexOf(value.kind);
		if (index === -1) {
			throw new Error(`Invalid enum variant: ${String(value.kind)}`);
		}
		const codec = this.variants[value.kind]!;
		const encodedValue = codec.encode(value.value as never);
		const indexBytes = this.#indexCodec.encode(index);
		const result = new Uint8Array(indexBytes.length + encodedValue.length);
		result.set(indexBytes, 0);
		result.set(encodedValue, indexBytes.length);
		return result;
	}

	public decode(data: Uint8Array): [EnumValue<T>, number] {
		const [index, indexSize] = this.#indexCodec.decode(data);
		if (index >= this.keys.length) {
			throw new Error(`Invalid enum index: ${index}`);
		}
		const key = this.keys[index]!;
		const codec = this.variants[key]!;
		const [value, size] = codec.decode(data.subarray(indexSize));
		return [{ kind: key, value } as never, indexSize + size];
	}
}

export type MappingGeneric = readonly [Codec<any>, Codec<any>];
export type MappingValue<T extends MappingGeneric> = Map<
	Codec.Infer<T[0]>,
	Codec.Infer<T[1]>
>;

/**
 * Options for Mapping codec.
 */
export type MappingOptions = {
	/** Codec for encoding the entry count. Default is varint. */
	countCodec?: Codec<number>;
};

/**
 * Codec for key-value mappings.
 *
 * Encoded as a Vector of Tuple [key, value].
 * - If [key,value] is fixed-stride: entries are concatenated (count implied)
 * - If variable: each entry is prefixed with a VarInt length (via Tuple rules)
 *
 * @template T - Tuple of [keyCodec, valueCodec]
 *
 * @example
 * ```ts
 * import { MappingCodec, StringCodec, U8 } from "@nomadshiba/codec";
 *
 * const str = new StringCodec();
 * // Default: varint count
 * const Dict = new MappingCodec([str, U8]);
 * const map = new Map<string, number>([["x", 1], ["y", 2]]);
 * const b = Dict.encode(map);
 * const out = Dict.decode(b);   // [Map { "x" => 1, "y" => 2 }, size]
 * ```
 *
 * @example
 * ```ts
 * import { MappingCodec, StringCodec, U8, U32 } from "@nomadshiba/codec";
 *
 * const str = new StringCodec();
 * // Custom count codec
 * const Dict = new MappingCodec([str, U8], { countCodec: U32 });
 * ```
 */
export class MappingCodec<const T extends MappingGeneric>
	extends Codec<MappingValue<T>> {
	public readonly stride = -1;
	readonly #entriesCodec: ArrayCodec<TupleCodec<T>>;

	constructor(codecs: T, options?: MappingOptions) {
		super();
		this.#entriesCodec = new ArrayCodec(
			new TupleCodec(codecs),
			options,
		);
	}

	public encode(value: MappingValue<T>): Uint8Array {
		return this.#entriesCodec.encode(value.entries().toArray() as any);
	}

	public decode(data: Uint8Array): [MappingValue<T>, number] {
		const [entries, size] = this.#entriesCodec.decode(data);
		return [new Map(entries as any), size];
	}
}
