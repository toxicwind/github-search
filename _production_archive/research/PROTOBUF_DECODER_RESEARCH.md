# Advanced Protobuf Decoder Patterns - Research Findings

## Executive Summary

Researched production-quality Protobuf decoding libraries to improve our decoder implementation. Key findings focus on: dynamic schema inference, wire type handling, varint decoding, and unknown field parsing.

---

## Top Libraries & Approaches

### 1. **protobuf-inspector** (mildsunrise)

**Best for**: Reverse engineering unknown schemas

**Key Features:**

- Colored representation of binary blobs
- Iterative schema refinement (start blind, add field definitions)
- Handles parsing errors gracefully (stops field, continues message)
- Assumes zig-zag encoding for varints
- Cannot recover original field names

**Implementation Pattern:**

```python
# Blind decode first
structure = decode_unknown(binary_data)

# Refine with known fields
structure.define_field(1, "string")  # Field 1 is a string
structure.define_field(2, "int32")   # Field 2 is int32

# Re-parse with refined schema
result = structure.reparse(binary_data)
```

---

### 2. **blackboxprotobuf** (NCC Group)

**Best for**: Production decoding without schemas

**Key Features:**

- Makes fewer assumptions than protobuf-inspector
- Returns type definition dictionary alongside data
- Burp Suite extension for security testing
- Customizable via `user_funcs.py` hooks
- Supports editing and re-encoding

**Implementation Pattern:**

```python
import blackboxprotobuf

# Decode without schema
message, typedef = blackboxprotobuf.decode_message(binary_data)

# Refine types
typedef['1'] = {'type': 'string'}
typedef['2'] = {'type': 'int'}

# Re-decode with refined types
message = blackboxprotobuf.decode_message(binary_data, typedef)

# Edit and re-encode
message['1'] = "new value"
binary_output = blackboxprotobuf.encode_message(message, typedef)
```

---

### 3. **Dynamic Message Factory** (google.protobuf)

**Best for**: Runtime schema loading

**Key Features:**

- `message_factory.GetMessages()` for bulk class creation
- `DescriptorPool` for dependency management
- Replaces deprecated `reflection.MakeClass()`
- Handles `FileDescriptorProto` objects

**Implementation Pattern:**

```python
from google.protobuf import descriptor_pb2, message_factory, descriptor_pool

# Load FileDescriptorProto (from .desc file or runtime)
file_desc_proto = descriptor_pb2.FileDescriptorProto()
file_desc_proto.ParseFromString(descriptor_bytes)

# Create descriptor pool and add dependencies
pool = descriptor_pool.DescriptorPool()
pool.Add(file_desc_proto)

# Generate message classes
message_classes = message_factory.GetMessages([file_desc_proto])

# Use dynamic class
MyMessage = message_classes['package.MessageName']
msg = MyMessage()
msg.ParseFromString(binary_data)
```

---

## Core Decoding Techniques

### Varint Decoding

**Wire Format:**

- Each byte: MSB=1 (more bytes follow), MSB=0 (last byte)
- Lower 7 bits store data (little-endian)

**Python Implementation:**

```python
def decode_varint(data, pos=0):
    result = 0
    shift = 0
    while True:
        byte = data[pos]
        pos += 1
        result |= (byte & 0x7F) << shift
        if (byte & 0x80) == 0:
            break
        shift += 7
    return result, pos
```

---

### Field Number & Wire Type Extraction

**Tag Structure:**

- Tag = (field_number << 3) | wire_type
- Wire type: 3 LSBs
- Field number: Tag >> 3

**Wire Types:**

- 0: Varint (int32, int64, bool, enum)
- 1: Fixed64 (double, fixed64)
- 2: Length-delimited (string, bytes, embedded messages)
- 3/4: Start/End group (deprecated)
- 5: Fixed32 (float, fixed32)

**Python Implementation:**

```python
def decode_tag(data, pos):
    tag, pos = decode_varint(data, pos)
    wire_type = tag & 0x7
    field_number = tag >> 3
    return field_number, wire_type, pos
```

---

### Length-Delimited Field Parsing

**Format:** varint(length) + data

```python
def decode_length_delimited(data, pos):
    length, pos = decode_varint(data, pos)
    value = data[pos:pos+length]
    pos += length
    return value, pos
```

---

## Ambiguity Handling

### Common Ambiguities

1. **Varint Encoding:**
   - Could be: int32, int64, uint32, uint64, sint32, sint64, bool, enum
   - Solution: Try zig-zag decode, check range, use heuristics

2. **Length-Delimited:**
   - Could be: string, bytes, embedded message, packed repeated
   - Solution: Try UTF-8 decode, recursively parse as message

3. **Fixed32/Fixed64:**
   - Could be: int or float
   - Solution: Check for NaN/Inf patterns, use context

### Best Practices

1. **Start Conservative:** Assume bytes/varint, refine later
2. **Validate UTF-8:** For string vs bytes disambiguation
3. **Recursive Parsing:** Try parsing length-delimited as nested message
4. **User Hints:** Allow manual type specification for critical fields
5. **Error Recovery:** Continue parsing on field errors

---

## Recommended Implementation Strategy

### Phase 1: Core Decoder

```python
class ProtobufDecoder:
    def decode_message(self, data):
        fields = {}
        pos = 0
        while pos < len(data):
            field_num, wire_type, pos = self.decode_tag(data, pos)
            value, pos = self.decode_field(data, pos, wire_type)
            fields[field_num] = value
        return fields
    
    def decode_field(self, data, pos, wire_type):
        if wire_type == 0:  # Varint
            return self.decode_varint(data, pos)
        elif wire_type == 2:  # Length-delimited
            return self.decode_length_delimited(data, pos)
        elif wire_type == 1:  # Fixed64
            return self.decode_fixed64(data, pos)
        elif wire_type == 5:  # Fixed32
            return self.decode_fixed32(data, pos)
        else:
            raise ValueError(f"Unknown wire type: {wire_type}")
```

### Phase 2: Type Inference

```python
class TypeInferrer:
    def infer_type(self, field_num, wire_type, value):
        if wire_type == 0:
            # Try zig-zag decode
            if self.is_zigzag(value):
                return "sint32" or "sint64"
            return "int32" or "int64"
        
        elif wire_type == 2:
            # Try UTF-8 decode
            try:
                value.decode('utf-8')
                return "string"
            except:
                pass
            
            # Try nested message
            try:
                nested = self.decode_message(value)
                return {"type": "message", "fields": nested}
            except:
                return "bytes"
```

### Phase 3: Schema Builder

```python
class SchemaBuilder:
    def build_schema(self, samples):
        schema = {}
        for sample in samples:
            fields = self.decode_message(sample)
            for field_num, value in fields.items():
                if field_num not in schema:
                    schema[field_num] = self.infer_type(field_num, value)
                else:
                    schema[field_num] = self.merge_types(
                        schema[field_num], 
                        self.infer_type(field_num, value)
                    )
        return schema
```

---

## Tools & Resources

### Libraries to Study

1. **protobuf-inspector**: <https://github.com/mildsunrise/protobuf-inspector>
2. **blackboxprotobuf**: <https://github.com/nccgroup/blackboxprotobuf>
3. **ProtoDeep**: Built on blackboxprotobuf, adds CLI/export
4. **protobuf-decoder**: Older Python 2 library

### Official Google APIs

- `google.protobuf.message_factory`
- `google.protobuf.descriptor_pool`
- `google.protobuf.internal.decoder`
- `google.protobuf.internal.wire_format`

### Key Techniques

- Iterative refinement (blind → hinted → schema)
- Error-tolerant parsing (skip bad fields, continue)
- Type dictionaries (blackboxprotobuf approach)
- Descriptor pools (google approach)

---

## Next Steps for Our Implementation

1. ✅ **Adopt blackboxprotobuf's type dictionary pattern**
   - Return `(data, typedef)` tuple
   - Allow type refinement between parses

2. ✅ **Implement robust varint decoder**
   - Handle zig-zag encoding
   - Detect overflow/malformed data

3. ✅ **Add UTF-8 validation for string detection**
   - Try decode, fall back to bytes

4. ✅ **Support nested message parsing**
   - Recursive decode for length-delimited fields

5. ✅ **Build schema inference from multiple samples**
   - Merge type information across messages
   - Detect repeated fields

6. ✅ **Add error recovery**
   - Continue parsing on field errors
   - Log ambiguous types for manual review
