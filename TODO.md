## GOALS for 0.3.0

- [x] Differentiate between dynamic sized `Codec` and fixed sized `Codec` on the
      type level as well.
- [-] Rename `stride` to `size`.
- [x] Rename `lengthCodec` to `sizeCodec` (`BytesCodec`) / keep `lengthCodec`
      (`StringCodec`) — names now fit each codec's semantics.
- [ ] Rename `TupleCodec.codecs` to `TupleCodec.variantCodecs`.
- [ ] Rename `ArrayCodec.codec` to `ArrayCodec.itemCodec`.
- [ ] Remove "Codec" suffix from inner codecs.
- [ ] Rename union back to enum.
- [ ] Have alternatives for fixed sized enums. using the max size.
- [x] Make `NullableCodec` add 1 byte to the size and if the inner is fixed stay
      fixed.
- [ ] Don't sort enum variants by key.
- [ ] make structs and shit V8 friendly, right now it creates the object then
      appends to it, which doesnt it keep it as a know struct/class in the v8,
      makes it a hashtable instead, takes more space on the memory. instead
      js-ify the data during decoding and eval it on `Function` which should
      allow V8 to compile it better.
