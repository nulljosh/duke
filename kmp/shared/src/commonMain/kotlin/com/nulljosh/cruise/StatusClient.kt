package com.nulljosh.cruise

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.statement.bodyAsBytes
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

// ponytail: mirrors run.mjs's /state JSON exactly (same fields as the SwiftUI
// app's RunState) — one source of truth on the server, every client just reads it.
@Serializable
data class RunState(
    val at: String,
    val started: String,
    val track: String,
    val username: String? = null,
    val paused: Boolean? = null,
    val streak: Int? = null,
    val xpGoal: Int? = null,
    val xpGoalMetToday: Boolean? = null,
    val hearts: Int? = null,
    val maxHearts: Int? = null,
    val league: Int? = null,
    val puzzleStep: Int? = null,
    val puzzleTotal: Int? = null,
    val lessons: Int = 0,
    val puzzles: Int = 0,
    val matches: Int = 0,
    val misses: Int = 0,
    val xp0: Int? = null,
    val xp: Int? = null,
    val last: String? = null,
)

@Serializable
private data class FenResponse(val fen: String? = null)

val leagueNames = listOf(
    "Bronze", "Silver", "Gold", "Sapphire", "Ruby",
    "Emerald", "Amethyst", "Pearl", "Obsidian", "Diamond",
)

// ponytail: same ~35-language list as the SwiftUI app's Track menu — kept as
// plain data here too so every client offers the same picker.
val otherTracks = listOf("math", "chess", "music")
val languages: List<Pair<String, String>> = listOf(
    "es" to "Spanish", "fr" to "French", "de" to "German", "it" to "Italian",
    "pt" to "Portuguese", "ja" to "Japanese", "zh" to "Chinese", "ko" to "Korean",
    "ru" to "Russian", "ar" to "Arabic", "hi" to "Hindi", "nl" to "Dutch",
    "sv" to "Swedish", "tr" to "Turkish", "el" to "Greek", "pl" to "Polish",
    "cy" to "Welsh", "ga" to "Irish", "hu" to "Hungarian", "da" to "Danish",
    "id" to "Indonesian", "vi" to "Vietnamese", "uk" to "Ukrainian", "ro" to "Romanian",
    "cs" to "Czech", "he" to "Hebrew", "yi" to "Yiddish", "sw" to "Swahili",
    "hw" to "Hawaiian", "la" to "Latin", "eo" to "Esperanto", "zu" to "Zulu",
    "gd" to "Scottish Gaelic", "fi" to "Finnish", "tl" to "Tagalog", "ht" to "Haitian Creole",
    "gn" to "Guarani", "nv" to "Navajo", "kl" to "Klingon",
)
val trackNames: Map<String, String> =
    mapOf("math" to "Math", "chess" to "Chess", "music" to "Music") + languages.toMap()

/** Talks to run.mjs's HTTP API — the same endpoints the SwiftUI app polls. */
class StatusClient(
    private val host: String,
    // Reads are open; pause/resume/switch need this because the tunnel puts
    // those routes on the public internet. run.mjs prints it on first start.
    private val token: String = "",
    private val http: HttpClient = defaultClient(),
) {

    companion object {
        private val lenientJson = Json { ignoreUnknownKeys = true; isLenient = true }

        fun defaultClient(): HttpClient = HttpClient {
            install(ContentNegotiation) { json(lenientJson) }
            install(HttpTimeout) {
                requestTimeoutMillis = 6_000
                connectTimeoutMillis = 6_000
            }
        }
    }

    suspend fun state(): RunState? = runCatchingNull { http.get("http://$host/state").body() }

    suspend fun fen(): String? = runCatchingNull { http.get("http://$host/fen").body<FenResponse>().fen }

    // Token-gated server-side: it's a live picture of the runner's screen.
    suspend fun screenshotBytes(cacheBust: String): ByteArray? = runCatchingNull {
        http.get("http://$host/screenshot?t=$cacheBust") {
            header("X-Pwnlingo-Token", token)
        }.bodyAsBytes()
    }

    private suspend fun mutate(pathAndQuery: String) {
        runCatchingNull {
            http.post("http://$host/$pathAndQuery") { header("X-Pwnlingo-Token", token) }
        }
    }

    suspend fun switchTrack(track: String) = mutate("switch?track=$track")

    suspend fun togglePause(currentlyPaused: Boolean) =
        mutate(if (currentlyPaused) "resume" else "pause")
}

private inline fun <T> runCatchingNull(block: () -> T?): T? =
    try { block() } catch (_: Throwable) { null }

/** Always exactly 8x8 — mirrors ChessBoardView.swift's parseBoard() malformed-FEN safety. */
fun parseBoard(fen: String): Array<Array<Char?>> {
    val board = fen.substringBefore(' ')
    val ranks = board.split("/").map { rank ->
        val row = mutableListOf<Char?>()
        for (ch in rank) {
            val n = ch.digitToIntOrNull()
            if (n != null) repeat(n) { row.add(null) } else row.add(ch)
        }
        while (row.size < 8) row.add(null)
        row.take(8)
    }.toMutableList()
    while (ranks.size < 8) ranks.add(List(8) { null })
    return ranks.take(8).map { it.toTypedArray() }.toTypedArray()
}
