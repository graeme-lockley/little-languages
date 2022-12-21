package stlc.bci

import java.io.File

class Builder {
    private val blocks = mutableListOf<BlockBuilder>()

    private fun build(): List<Byte> {
        val result = mutableListOf<Byte>()
        val blockSizes = blocks.map { it.size() }
        val blockOffsets = blocks.zip(blockSizes.scan(0) { acc, size -> acc + size }) { block, offset -> block.name to offset }.toMap()

        for (block in blocks) {
            result.addAll(block.build(blockOffsets))
        }

        return result
    }

    fun writeTo(file: File) {
        file.delete()
        file.appendBytes(build().toByteArray())
    }

    fun createBlock(name: String): BlockBuilder {
        val builder = BlockBuilder(name, this)
        blocks.add(builder)
        return builder
    }
}

class BlockBuilder(val name: String, val builder: Builder) {
    private val instructions = mutableListOf<Byte>()
    private val patches = mutableListOf<Pair<Int, String>>()
    private val labels = mutableMapOf<String, Int>()

    fun size() = instructions.size

    fun build(offsets: Map<String, Int>): List<Byte> {
        val myOffset = offsets[name]!!
        val result = instructions.toMutableList()
        for ((index, label) in patches) {
            val offset = offsets[label] ?: ((labels[label] ?: throw Exception("Unknown label $label")) + myOffset)
            result[index] = offset.toByte()
        }
        return result
    }

    fun writeByte(byte: Byte) {
        instructions.add(byte)
    }

    fun writeInt(v: Int) {
        writeByte(v.toByte())
        writeByte((v shr 8).toByte())
        writeByte((v shr 16).toByte())
        writeByte((v shr 24).toByte())
    }

    fun writeOpCode(opCode: InstructionOpCode) {
        writeByte(opCode.code)
    }

    fun writeLabel(name: String) {
        patches.add(instructions.size to name)
        writeInt(0)
    }

    fun markLabel(name: String) {
        labels[name] = instructions.size
    }
}