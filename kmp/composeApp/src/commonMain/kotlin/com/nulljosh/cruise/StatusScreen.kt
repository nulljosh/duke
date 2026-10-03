package com.nulljosh.cruise

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

// ponytail: JVM/Android's default fonts don't have the SF-Pro-specific emoji
// substitution the macOS app hit for king/queen/knight/bishop glyphs — plain
// unicode chess symbols render correctly here, no font workaround needed.
private fun glyphFor(piece: Char): String = when (piece.lowercaseChar()) {
    'k' -> "♚"; 'q' -> "♛"; 'r' -> "♜"; 'b' -> "♝"; 'n' -> "♞"; 'p' -> "♟"
    else -> "?"
}

@Composable
fun StatusScreen(defaultHost: String = "localhost:8737") {
    var host by remember { mutableStateOf(defaultHost) }
    var token by remember { mutableStateOf("") }
    val client = remember(host, token) { StatusClient(host, token) }
    var state by remember { mutableStateOf<RunState?>(null) }
    var fen by remember { mutableStateOf<String?>(null) }
    var unreachable by remember { mutableStateOf(false) }
    var showHostEditor by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(host) {
        while (true) {
            val s = client.state()
            if (s != null) {
                state = s
                unreachable = false
                fen = if (s.track == "chess") client.fen() else null
            } else {
                unreachable = true
            }
            delay(3000)
        }
    }

    Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        val s = state
        Column(Modifier.fillMaxSize()) {
            if (s?.track == "chess" && fen != null) {
                ChessBoard(fen!!, Modifier.fillMaxWidth().weight(1f, fill = false))
            } else {
                Box(Modifier.fillMaxWidth().weight(1f, fill = false).padding(24.dp)) {
                    Text(
                        "Live screenshot for the \"${s?.track ?: "current"}\" track is macOS/iOS-only for now — chess renders natively everywhere.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            if (s != null) {
                Panel(
                    s = s,
                    onTogglePause = { scope.launch { client.togglePause(s.paused == true) } },
                )
            } else if (unreachable) {
                Text("Can't reach $host", color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(24.dp))
            } else {
                Box(Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
        }

        IconButton(onClick = { showHostEditor = true }, modifier = Modifier.align(Alignment.TopEnd).padding(10.dp)) {
            Text("⚙", fontSize = 18.sp)
        }
    }

    if (showHostEditor) {
        AlertDialog(
            onDismissRequest = { showHostEditor = false },
            title = { Text("Connection") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = host,
                        onValueChange = { host = it },
                        singleLine = true,
                        label = { Text("Mac address") },
                    )
                    OutlinedTextField(
                        value = token,
                        onValueChange = { token = it },
                        singleLine = true,
                        label = { Text("API token (for pause / switch)") },
                    )
                }
            },
            confirmButton = { TextButton(onClick = { showHostEditor = false }) { Text("Done") } },
        )
    }
}

@Composable
private fun ChessBoard(fen: String, modifier: Modifier = Modifier) {
    val board = remember(fen) { parseBoard(fen) }
    val light = Color(0xFFEEEEDA)
    val dark = Color(0xFF749657)
    Column(modifier) {
        for (r in 0 until 8) {
            Row(Modifier.fillMaxWidth().weight(1f)) {
                for (c in 0 until 8) {
                    val isDark = (r + c) % 2 == 1
                    Box(
                        Modifier.weight(1f).fillMaxHeight().background(if (isDark) dark else light),
                        contentAlignment = Alignment.Center,
                    ) {
                        board[r][c]?.let { piece ->
                            Text(
                                glyphFor(piece),
                                fontSize = 28.sp,
                                color = if (piece.isUpperCase()) Color.White else Color.Black,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun Panel(s: RunState, onTogglePause: () -> Unit) {
    Column(
        Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(16.dp))
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        val step = s.puzzleStep
        val total = s.puzzleTotal
        if (s.track == "chess" && step != null && total != null && total > 0) {
            LinearProgressIndicator(
                progress = { (step.toFloat() / total).coerceIn(0f, 1f) },
                modifier = Modifier.fillMaxWidth(),
                color = Color(0xFF58CC02),
            )
        }

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Column {
                s.username?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
                Text(trackNames[s.track] ?: s.track.replaceFirstChar { it.uppercase() }, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                s.league?.let { l -> leagueNames.getOrNull(l)?.let { Text("$it League", style = MaterialTheme.typography.labelSmall) } }
            }
            val xp0 = s.xp0
            val xp = s.xp
            if (xp0 != null && xp != null) {
                Text("+${xp - xp0} XP", color = Color(0xFF58CC02), fontWeight = FontWeight.Bold, fontSize = 20.sp)
            }
        }

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            s.streak?.let { Text("🔥 $it", style = MaterialTheme.typography.bodySmall) }
            if (s.hearts != null && s.maxHearts != null) Text("♥ ${s.hearts}/${s.maxHearts}", style = MaterialTheme.typography.bodySmall)
            s.xpGoal?.let { Text(if (s.xpGoalMetToday == true) "✓ $it" else "○ $it", style = MaterialTheme.typography.bodySmall) }
            Spacer(Modifier.weight(1f))
            if (s.track == "chess") {
                Text("${s.puzzles} puzzles · ${s.misses} misses · ${s.matches} matches", style = MaterialTheme.typography.bodySmall)
            } else {
                Text("${s.lessons} lessons", style = MaterialTheme.typography.bodySmall)
            }
        }

        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            Text(s.last ?: "", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            OutlinedButton(onClick = onTogglePause) {
                Text(if (s.paused == true) "▶" else "⏸")
            }
        }
    }
}
