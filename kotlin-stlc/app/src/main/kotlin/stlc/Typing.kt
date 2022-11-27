package stlc

typealias Var = String

sealed class Type {
    abstract fun apply(s: Subst): Type
    abstract fun ftv(): Set<Var>
}

data class TVar(val name: String) : Type() {
    override fun apply(s: Subst): Type =
        s[name] ?: this

    override fun ftv(): Set<Var> =
        setOf(name)

    override fun toString(): String = name
}

data class TCon(private val name: String) : Type() {
    override fun apply(s: Subst): Type = this

    override fun ftv(): Set<Var> = emptySet()

    override fun toString(): String = name
}

data class TTuple(val types: List<Type>) : Type() {
    override fun apply(s: Subst): Type =
        TTuple(types.map { it.apply(s) })

    override fun ftv(): Set<Var> =
        types.fold(emptySet()) { acc, t -> acc + t.ftv() }

    override fun toString(): String = "(${types.joinToString(" * ")})"
}

data class TArr(val domain: Type, val range: Type) : Type() {
    override fun apply(s: Subst): Type =
        TArr(domain.apply(s), range.apply(s))

    override fun ftv(): Set<Var> =
        domain.ftv() + range.ftv()

    override fun toString(): String =
        if (domain is TArr) "($domain) -> $range" else "$domain -> $range"
}

val typeError = TCon("Error")
val typeInt = TCon("Int")
val typeBool = TCon("Bool")

data class Subst(private val items: Map<Var, Type>) {
    infix fun compose(s: Subst): Subst =
        Subst(s.items.mapValues { it.value.apply(this) } + items)

    operator fun get(v: Var): Type? = items[v]

    operator fun minus(names: Set<Var>): Subst =
        Subst(items - names)
}

val nullSubst = Subst(emptyMap())

data class Scheme(private val names: Set<Var>, private val type: Type) {
    fun apply(s: Subst): Scheme =
        Scheme(names, type.apply(s - names))

    fun ftv(): Set<Var> =
        type.ftv() - names

    fun instantiate(pump: Pump): Type =
        type.apply(Subst(names.toList().associateWith { pump.next() }))
}

data class TypeEnv(private val items: Map<String, Scheme>) {
    private val ftv = items.toList().flatMap { it.second.ftv() }.toSet()

    fun extend(name: String, scheme: Scheme): TypeEnv =
        TypeEnv(items + Pair(name, scheme))

    operator fun plus(v: Pair<String, Scheme>): TypeEnv =
        this.extend(v.first, v.second)

    operator fun plus(v: List<Pair<String, Scheme>>): TypeEnv =
        v.fold(this) { acc, p -> acc + p }

    fun apply(s: Subst): TypeEnv =
        TypeEnv(items.mapValues { it.value.apply(s) })

    operator fun get(name: String): Scheme? = items[name]

    fun generalise(type: Type): Scheme =
        Scheme(type.ftv() - ftv, type)
}

val emptyTypeEnv = TypeEnv(emptyMap())

data class Pump(private var counter: Int = 0) {
    fun next(): TVar {
        counter += 1
        return TVar("V$counter")
    }

    fun nextN(size: Int): List<TVar> =
        (1..size).map { next() }
}
