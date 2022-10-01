package stlc

typealias Var = String

sealed class Type {
    abstract fun apply(s: Subst): Type
    abstract fun ftv(): Set<Var>
}

data class TVar(private val name: String) : Type() {
    override fun apply(s: Subst): Type =
        s[name] ?: this

    override fun ftv(): Set<Var> =
        setOf(name)
}

data class TCon(private val name: String) : Type() {
    override fun apply(s: Subst): Type = this

    override fun ftv(): Set<Var> = emptySet()
}

data class TArr(private val domain: Type, private val range: Type) : Type() {
    override fun apply(s: Subst): Type =
        TArr(domain.apply(s), range.apply(s))

    override fun ftv(): Set<Var> =
        domain.ftv() + range.ftv()
}

val typeError = TCon("Error")
val typeInt = TCon("Int")
val typeBool = TCon("Bool")

data class Subst(private val items: Map<Var, Type>) {
    infix fun compose(s: Subst): Subst =
        Subst(s.items.mapValues { it.value.apply(this) } + items)

    operator fun get(v: Var): Type? = items[v]

    fun entries(): Set<Map.Entry<Var, Type>> = items.entries

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
    fun extend(name: String, scheme: Scheme): TypeEnv =
        TypeEnv(items + Pair(name, scheme))

    fun apply(s: Subst): TypeEnv =
        TypeEnv(items.mapValues { it.value.apply(s) })

    private fun ftv(): Set<Var> =
        items.toList().flatMap { it.second.ftv() }.toSet()

    operator fun get(name: String): Scheme? = items[name]

    fun generalise(type: Type): Scheme =
        Scheme(type.ftv() - ftv(), type)
}

data class Pump(private var counter: Int = 0) {
    fun next(): TVar {
        counter += 1
        return TVar("V$counter")
    }
}
