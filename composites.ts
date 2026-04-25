// deno-lint-ignore-file no-explicit-any

import { Codec } from "./codec.ts";
import { U8Codec } from "./primitives.ts";
import { VarInt } from "./varint.ts";

// ── Nullable ──────────────────────────────────────────────────────────────────

/** Constraint type for the inner codec of {@link NullableCodec}. */
export type NullableGeneric = Codec<any>;

/**
 * The input type accepted by a `NullableCodec<T>`:
 * either the inner codec's input type or `null`.
 */
export type NullableInput<T extends NullableGeneric> =
  | Codec.InferInput<T>
  | null;

/**
 * The decoded value type produced by a `NullableCodec<T>`:
 * either the inner codec's output type or `null`.
 */
export type NullableOutput<T extends NullableGeneric> =
  | Codec.InferOutput<T>
  | null;

/** @deprecated Use {@link NullableOutput} instead. */
export type NullableValue<T extends NullableGeneric> = NullableOutput<T>;

/**
 * Codec for nullable values — either a present value or `null`.
 *
 * Wire format:
 * - `0x00` → `null`
 * - `0x01` + payload → value encoded by the inner codec
 *
 * @template T - The inner codec type.
 *
 * @example
 * ```ts
 * import { NullableCodec, U8 } from "@nomadshiba/codec";
 *
 * const maybeU8 = new NullableCodec(U8);
 * maybeU8.encode(null); // Uint8Array [0x00]
 * maybeU8.encode(7);    // Uint8Array [0x01, 0x07]
 * maybeU8.decode(new Uint8Array([0x00]));       // [null, 1]
 * maybeU8.decode(new Uint8Array([0x01, 0x09])); // [9, 2]
 * ```
 */
export class NullableCodec<T extends NullableGeneric>
  extends Codec<NullableOutput<T>, NullableInput<T>> {
  private readonly codec: T;

  /** Always `-1`; the presence byte makes this variable-length. */
  public readonly stride = -1;

  /**
   * @param codec - The inner codec used to encode/decode the present value.
   */
  constructor(codec: T) {
    super();
    this.codec = codec;
  }

  /**
   * @param value - The value to encode, or `null`.
   * @param target - Optional pre-allocated buffer.
   * @returns `Uint8Array<ArrayBuffer>`.
   */
  public encode(
    value: NullableInput<T>,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    if (value === null) {
      const result = target ?? new Uint8Array(1);
      result[0] = 0;
      return result;
    } else {
      const encoded = this.codec.encode(value, target?.subarray(1));
      const totalLen = 1 + encoded.length;
      const result = target ?? new Uint8Array(totalLen);
      result[0] = 1;
      result.set(encoded, 1);
      return result;
    }
  }

  /**
   * @param data - Binary data starting with a presence byte.
   * @returns `[null, 1]` or `[value, 1 + innerBytesConsumed]`.
   */
  public decode(data: Uint8Array): [NullableOutput<T>, number] {
    if (data[0] === 0) {
      return [null, 1];
    } else {
      const [value, size] = this.codec.decode(data.subarray(1));
      return [value, 1 + size];
    }
  }
}

// ── Optional ──────────────────────────────────────────────────────────────────

/** Constraint type for the inner codec of {@link OptionalCodec}. */
export type OptionalGeneric = Codec<any>;

/**
 * The input type accepted by an `OptionalCodec<T>`:
 * either the inner codec's input type or `undefined`.
 */
export type OptionalInput<T extends OptionalGeneric> =
  | Codec.InferInput<T>
  | undefined;

/**
 * The decoded value type produced by an `OptionalCodec<T>`:
 * either the inner codec's output type or `undefined`.
 */
export type OptionalOutput<T extends OptionalGeneric> =
  | Codec.InferOutput<T>
  | undefined;

/** @deprecated Use {@link OptionalOutput} instead. */
export type OptionalValue<T extends OptionalGeneric> = OptionalOutput<T>;

/**
 * Codec for optional values — either a present value or `undefined`.
 *
 * Wire format is identical to {@link NullableCodec}, but uses `undefined`
 * instead of `null` for the absent case:
 * - `0x00` → `undefined`
 * - `0x01` + payload → value encoded by the inner codec
 *
 * @template T - The inner codec type.
 *
 * @example
 * ```ts
 * import { OptionalCodec, U8 } from "@nomadshiba/codec";
 *
 * const maybeU8 = new OptionalCodec(U8);
 * maybeU8.encode(undefined); // Uint8Array [0x00]
 * maybeU8.encode(7);         // Uint8Array [0x01, 0x07]
 * maybeU8.decode(new Uint8Array([0x00]));       // [undefined, 1]
 * maybeU8.decode(new Uint8Array([0x01, 0x09])); // [9, 2]
 * ```
 */
export class OptionalCodec<T extends OptionalGeneric>
  extends Codec<OptionalOutput<T>, OptionalInput<T>> {
  private readonly codec: T;

  /** Always `-1`; the presence byte makes this variable-length. */
  public readonly stride = -1;

  /**
   * @param codec - The inner codec used to encode/decode the present value.
   */
  constructor(codec: T) {
    super();
    this.codec = codec;
  }

  /**
   * @param value - The value to encode, or `undefined`.
   * @param target - Optional pre-allocated buffer.
   * @returns `Uint8Array<ArrayBuffer>`.
   */
  public encode(
    value: OptionalInput<T>,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    if (value === undefined) {
      const result = target ?? new Uint8Array(1);
      result[0] = 0;
      return result;
    } else {
      const encoded = this.codec.encode(value, target?.subarray(1));
      const totalLen = 1 + encoded.length;
      const result = target ?? new Uint8Array(totalLen);
      result[0] = 1;
      result.set(encoded, 1);
      return result;
    }
  }

  /**
   * @param data - Binary data starting with a presence byte.
   * @returns `[undefined, 1]` or `[value, 1 + innerBytesConsumed]`.
   */
  public decode(data: Uint8Array): [OptionalOutput<T>, number] {
    if (data[0] === 0) {
      return [undefined, 1];
    } else {
      const [value, size] = this.codec.decode(data.subarray(1));
      return [value, 1 + size];
    }
  }
}

// ── Tuple ─────────────────────────────────────────────────────────────────────

/** Constraint type for the element array of a {@link TupleCodec}. */
export type TupleGeneric = readonly Codec<any>[];

/**
 * Derives the input tuple type from a `TupleGeneric`:
 * maps each element codec type to its inferred input type.
 */
export type TupleInput<T extends TupleGeneric> = {
  -readonly [I in keyof T]: Codec.InferInput<T[I]>;
};

/**
 * Derives the decoded value tuple type from a `TupleGeneric`:
 * maps each element codec type to its inferred output type.
 */
export type TupleOutput<T extends TupleGeneric> = {
  -readonly [I in keyof T]: Codec.InferOutput<T[I]>;
};

/** @deprecated Use {@link TupleOutput} instead. */
export type TupleValue<T extends TupleGeneric> = TupleOutput<T>;

/**
 * Codec for fixed-count tuples of potentially heterogeneous types.
 *
 * Elements are concatenated in order with no wrapper prefix. Each element
 * is self-delimiting: fixed-size elements use their `stride`, variable-size
 * elements encode their own size.
 *
 * `stride` is the sum of all element strides when all are fixed; `-1` if any
 * element is variable.
 *
 * @template T - Readonly array of element codec types.
 *
 * @example
 * ```ts
 * import { TupleCodec, U8, StringCodec } from "@nomadshiba/codec";
 *
 * const t = new TupleCodec([U8, new StringCodec()]);
 * t.encode([5, "hi"]); // Uint8Array [0x05, 0x02, 0x68, 0x69]
 * t.decode(enc);       // [[5, "hi"], 4]
 * ```
 */
export class TupleCodec<const T extends TupleGeneric>
  extends Codec<TupleOutput<T>, TupleInput<T>> {
  /**
   * The element codecs in definition order.
   */
  public readonly codecs: T;

  /**
   * Sum of all element strides (fixed-size), or `-1` if any element is
   * variable-length.
   */
  public readonly stride: number;

  /**
   * @param codecs - Ordered array of element codecs.
   */
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

  /**
   * @param value - Tuple of values, one per codec in order.
   * @param target - Optional pre-allocated buffer.
   * @returns `Uint8Array<ArrayBuffer>` of concatenated element encodings.
   */
  public encode(
    value: TupleInput<T>,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    const parts: Uint8Array<ArrayBuffer>[] = [];
    for (let i = 0; i < this.codecs.length; i++) {
      const codec = this.codecs[i]!;
      const part = codec.encode(value[i]!);
      parts.push(part);
    }

    const combinedLength = parts.reduce(
      (sum, part) => sum + part.length,
      0,
    );
    const combined = target ?? new Uint8Array(combinedLength);
    let offset = 0;
    for (const part of parts) {
      combined.set(part, offset);
      offset += part.length;
    }
    return combined;
  }

  /**
   * @param data - Binary data. Elements are read in definition order.
   * @returns `[tuple, totalBytesConsumed]`.
   */
  public decode(data: Uint8Array): [TupleOutput<T>, number] {
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

// ── Struct ────────────────────────────────────────────────────────────────────

/** Constraint type for the shape record of a {@link StructCodec}. */
export type StructGeneric = { readonly [key: string]: Codec<any> };

/**
 * Derives the input object type from a `StructGeneric`:
 * maps each field name to the inferred input type of its codec.
 */
export type StructInput<T extends StructGeneric> = {
  -readonly [K in keyof T]: Codec.InferInput<T[K]>;
};

/**
 * Derives the decoded object type from a `StructGeneric`:
 * maps each field name to the inferred output type of its codec.
 */
export type StructOutput<T extends StructGeneric> = {
  -readonly [K in keyof T]: Codec.InferOutput<T[K]>;
};

/** @deprecated Use {@link StructOutput} instead. */
export type StructValue<T extends StructGeneric> = StructOutput<T>;

/**
 * Codec for named-field objects.
 *
 * Internally backed by a {@link TupleCodec} keyed on the field names in
 * **definition order**. The binary layout is identical to the equivalent
 * tuple — field names are not part of the wire format.
 *
 * **Reordering fields changes the binary layout** and breaks compatibility
 * with previously encoded data.
 *
 * `stride` follows the same rules as `TupleCodec`.
 *
 * @template T - Record mapping field names to codecs.
 *
 * @example
 * ```ts
 * import { StructCodec, U32, StringCodec } from "@nomadshiba/codec";
 *
 * const User = new StructCodec({ id: U32, name: new StringCodec() });
 * const bin = User.encode({ id: 42, name: "Ada" });
 * User.decode(bin); // [{ id: 42, name: "Ada" }, size]
 * ```
 */
export class StructCodec<const T extends StructGeneric>
  extends Codec<StructOutput<T>, StructInput<T>> {
  /**
   * Sum of all field strides (fixed-size), or `-1` if any field is
   * variable-length.
   */
  public readonly stride: number;

  /**
   * The codec shape passed to the constructor. Useful for inspecting field
   * codecs at runtime.
   */
  public readonly shape: T;

  private readonly keys: Extract<keyof T, string>[];
  private readonly tuple: TupleCodec<T[(keyof T)][]>;

  /**
   * @param shape - Record mapping field names to their codecs, in definition
   *   order.
   */
  constructor(shape: T) {
    super();
    this.shape = shape;
    this.keys = Object.keys(shape) as typeof this.keys;
    this.tuple = new TupleCodec(this.keys.map((key) => shape[key]));
    this.stride = this.tuple.stride;
  }

  /**
   * @param value - Object with fields matching the codec shape.
   * @param target - Optional pre-allocated buffer.
   * @returns `Uint8Array<ArrayBuffer>`.
   */
  public encode(
    value: StructInput<T>,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    const tupleValue = this.keys.map((key) => value[key]);
    return this.tuple.encode(tupleValue, target);
  }

  /**
   * @param data - Binary data.
   * @returns `[object, bytesConsumed]`.
   */
  public decode(data: Uint8Array): [StructOutput<T>, number] {
    const [tupleValue, size] = this.tuple.decode(data);
    const result = {} as StructOutput<T>;
    for (let i = 0; i < this.keys.length; i++) {
      const key = this.keys[i]!;
      result[key] = tupleValue[i]!;
    }

    return [result, size];
  }
}

// ── Array ─────────────────────────────────────────────────────────────────────

/** Constraint type for the element codec of an {@link ArrayCodec}. */
export type ArrayGeneric = Codec<any>;

/**
 * The input type accepted by an `ArrayCodec<T>`:
 * an array of the inner codec's input type.
 */
export type ArrayInput<T extends ArrayGeneric> = Codec.InferInput<T>[];

/**
 * The decoded value type produced by an `ArrayCodec<T>`:
 * an array of the inner codec's output type.
 */
export type ArrayOutput<T extends ArrayGeneric> = Codec.InferOutput<T>[];

/** @deprecated Use {@link ArrayOutput} instead. */
export type ArrayValue<T extends ArrayGeneric> = ArrayOutput<T>;

/**
 * Options for {@link ArrayCodec}.
 */
export type ArrayOptions = {
  /**
   * Codec used to encode the element count prefix. Defaults to
   * {@link VarInt}.
   */
  countCodec?: Codec<number>;
};

/**
 * Codec for variable-length arrays of a single element type.
 *
 * Wire format: `<count> <elem0> <elem1> …` where `<count>` is encoded by
 * `countCodec` (default: {@link VarInt}). Elements are concatenated in order;
 * each element is self-delimiting.
 *
 * Always variable-length (`stride = -1`).
 *
 * @template T - Element codec type.
 *
 * @example
 * ```ts
 * import { ArrayCodec, U16, U32 } from "@nomadshiba/codec";
 *
 * // Default varint count
 * const nums = new ArrayCodec(U16);
 * nums.encode([1, 513]); // [0x02, 0x00, 0x01, 0x02, 0x01]
 *
 * // Custom count codec
 * const numsU32 = new ArrayCodec(U16, { countCodec: U32 });
 * ```
 */
export class ArrayCodec<T extends ArrayGeneric>
  extends Codec<ArrayOutput<T>, ArrayInput<T>> {
  /** Always `-1`. */
  public readonly stride = -1;
  readonly #countCodec: Codec<number>;
  readonly #codec: T;

  /**
   * @param codec - The element codec.
   * @param options - Optional configuration for the count prefix codec.
   */
  constructor(codec: T, options?: ArrayOptions) {
    super();
    this.#codec = codec;
    this.#countCodec = options?.countCodec ?? VarInt;
  }

  /**
   * The element codec used to encode/decode individual items.
   */
  public get codec(): Codec<T> {
    return this.#codec;
  }

  /**
   * @param value - Array of elements to encode.
   * @param target - Optional pre-allocated buffer.
   * @returns `Uint8Array<ArrayBuffer>` with count prefix followed by elements.
   */
  public encode(
    value: ArrayInput<T>,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    const parts: Uint8Array<ArrayBuffer>[] = [];

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
    const totalLen = countPrefix.length + elementsData.length;
    const result = target ?? new Uint8Array(totalLen);
    result.set(countPrefix, 0);
    result.set(elementsData, countPrefix.length);
    return result;
  }

  /**
   * @param data - Binary data starting with a count prefix.
   * @returns `[elements, totalBytesConsumed]`.
   */
  public decode(data: Uint8Array): [ArrayOutput<T>, number] {
    const [count, bytesRead] = this.#countCodec.decode(data);
    const result: ArrayOutput<T> = [];
    let offset = bytesRead;

    for (let i = 0; i < count; i++) {
      const [value, size] = this.#codec.decode(data.subarray(offset));
      result.push(value);
      offset += size;
    }

    return [result, offset];
  }
}

// ── Union ─────────────────────────────────────────────────────────────────────

/** Constraint type for the variants record of a {@link UnionCodec}. */
export type UnionGeneric = { readonly [key: string]: Codec<any> };

/**
 * The input type accepted by a `UnionCodec<T>`: a discriminated union
 * where each member has a `kind` (the variant name) and a `value`.
 */
export type UnionInput<T extends UnionGeneric> = {
  -readonly [K in keyof T]: {
    kind: K;
    value: Codec.InferInput<T[K]>;
  };
}[keyof T];

/**
 * The decoded value type produced by a `UnionCodec<T>`: a discriminated union
 * where each member has a `kind` (the variant name) and a `value`.
 */
export type UnionOutput<T extends UnionGeneric> = {
  -readonly [K in keyof T]: {
    kind: K;
    value: Codec.InferOutput<T[K]>;
  };
}[keyof T];

/** @deprecated Use {@link UnionOutput} instead. */
export type UnionValue<T extends UnionGeneric> = UnionOutput<T>;

/**
 * Options for {@link UnionCodec}.
 */
export type UnionOptions = {
  /**
   * Codec used to encode the variant index. Defaults to `U8` (1 byte,
   * supporting up to 256 variants).
   *
   * Use a wider codec (e.g. `U16`) if the union has more than 256 variants.
   */
  indexCodec?: Codec<number>;
};

/**
 * Codec for tagged unions.
 *
 * Variant names are sorted alphabetically to assign stable integer indices.
 * **Adding, removing, or renaming variants changes existing indices** and
 * breaks compatibility with previously encoded data.
 *
 * Wire format: `<index> <payload>` where `<index>` is encoded by `indexCodec`
 * (default: `U8`). Decoded values are `{ kind, value }` objects.
 *
 * @template T - Record mapping variant names to codecs.
 *
 * @example
 * ```ts
 * import { UnionCodec, U8, StringCodec } from "@nomadshiba/codec";
 *
 * const Event = new UnionCodec({ Click: U8, Message: new StringCodec() });
 * // "Click" → index 0, "Message" → index 1 (alphabetical order)
 *
 * Event.encode({ kind: "Click", value: 5 });
 * Event.encode({ kind: "Message", value: "hello" });
 * const [e] = Event.decode(bytes); // { kind: "Click", value: 5 }
 * ```
 */
export class UnionCodec<const T extends UnionGeneric>
  extends Codec<UnionOutput<T>, UnionInput<T>> {
  /** Always `-1`. */
  public readonly stride = -1;

  /**
   * The variants record passed to the constructor. Useful for inspecting
   * variant codecs at runtime.
   */
  public readonly variants: T;

  readonly #indexCodec: Codec<number>;
  private readonly keys: (keyof T)[];

  /**
   * @param variants - Record mapping variant names to their codecs.
   * @param options - Optional configuration for the index codec.
   */
  constructor(variants: T, options?: UnionOptions) {
    super();
    this.variants = variants;
    this.keys = Object.keys(this.variants).sort() as (keyof T)[];
    this.#indexCodec = options?.indexCodec ?? new U8Codec();
  }

  /**
   * @param value - `{ kind, value }` object identifying the variant and its payload.
   * @param target - Optional pre-allocated buffer.
   * @returns `Uint8Array<ArrayBuffer>` with the variant index followed by the payload.
   * @throws {Error} If `value.kind` is not a known variant name.
   */
  public encode(
    value: UnionInput<T>,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    const index = this.keys.indexOf(value.kind);
    if (index === -1) {
      throw new Error(`Invalid union variant: ${String(value.kind)}`);
    }
    const codec = this.variants[value.kind]!;
    const encodedValue = codec.encode(value.value as never);
    const indexBytes = this.#indexCodec.encode(index);
    const totalLen = indexBytes.length + encodedValue.length;
    const result = target ?? new Uint8Array(totalLen);
    result.set(indexBytes, 0);
    result.set(encodedValue, indexBytes.length);
    return result;
  }

  /**
   * @param data - Binary data starting with a variant index.
   * @returns `[{ kind, value }, bytesConsumed]`.
   * @throws {Error} If the decoded index is out of range.
   */
  public decode(data: Uint8Array): [UnionOutput<T>, number] {
    const [index, indexSize] = this.#indexCodec.decode(data);
    if (index >= this.keys.length) {
      throw new Error(`Invalid union index: ${index}`);
    }
    const key = this.keys[index]!;
    const codec = this.variants[key]!;
    const [value, size] = codec.decode(data.subarray(indexSize));
    return [{ kind: key, value } as never, indexSize + size];
  }
}

// ── Mapping ───────────────────────────────────────────────────────────────────

/** Constraint type for the `[keyCodec, valueCodec]` pair of a {@link MappingCodec}. */
export type MappingGeneric = readonly [Codec<any>, Codec<any>];

/**
 * The input type accepted by a `MappingCodec<T>`:
 * a `Map` from the key codec's input type to the value codec's input type.
 */
export type MappingInput<T extends MappingGeneric> = Map<
  Codec.InferInput<T[0]>,
  Codec.InferInput<T[1]>
>;

/**
 * The decoded value type produced by a `MappingCodec<T>`:
 * a `Map` from the key codec's output type to the value codec's output type.
 */
export type MappingOutput<T extends MappingGeneric> = Map<
  Codec.InferOutput<T[0]>,
  Codec.InferOutput<T[1]>
>;

/** @deprecated Use {@link MappingOutput} instead. */
export type MappingValue<T extends MappingGeneric> = MappingOutput<T>;

/**
 * Options for {@link MappingCodec}.
 */
export type MappingOptions = {
  /**
   * Codec used to encode the entry count. Defaults to {@link VarInt}.
   */
  countCodec?: Codec<number>;
};

/**
 * Codec for `Map<K, V>` instances.
 *
 * Internally encoded as an {@link ArrayCodec} of `[key, value]`
 * {@link TupleCodec} entries, so the wire format is:
 *
 * ```
 * <count> <key0> <value0> <key1> <value1> …
 * ```
 *
 * Always variable-length (`stride = -1`).
 *
 * @template T - Readonly tuple `[keyCodec, valueCodec]`.
 *
 * @example
 * ```ts
 * import { MappingCodec, StringCodec, U8, U32 } from "@nomadshiba/codec";
 *
 * const Dict = new MappingCodec([new StringCodec(), U8]);
 * const map = new Map([["x", 1], ["y", 2]]);
 * const b = Dict.encode(map);
 * Dict.decode(b); // [Map { "x" => 1, "y" => 2 }, size]
 *
 * // Custom count codec
 * const DictU32 = new MappingCodec([new StringCodec(), U8], { countCodec: U32 });
 * ```
 */
export class MappingCodec<const T extends MappingGeneric>
  extends Codec<MappingOutput<T>, MappingInput<T>> {
  /** Always `-1`. */
  public readonly stride = -1;
  readonly #entriesCodec: ArrayCodec<TupleCodec<T>>;

  /**
   * @param codecs - `[keyCodec, valueCodec]` tuple.
   * @param options - Optional configuration for the count prefix codec.
   */
  constructor(codecs: T, options?: MappingOptions) {
    super();
    this.#entriesCodec = new ArrayCodec(
      new TupleCodec(codecs),
      options,
    );
  }

  /**
   * @param value - The `Map` to encode.
   * @param target - Optional pre-allocated buffer.
   * @returns `Uint8Array<ArrayBuffer>`.
   */
  public encode(
    value: MappingInput<T>,
    target?: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    return this.#entriesCodec.encode(value.entries().toArray() as any, target);
  }

  /**
   * @param data - Binary data starting with a count prefix.
   * @returns `[Map, bytesConsumed]`.
   */
  public decode(data: Uint8Array): [MappingOutput<T>, number] {
    const [entries, size] = this.#entriesCodec.decode(data);
    return [new Map(entries as any), size];
  }
}
