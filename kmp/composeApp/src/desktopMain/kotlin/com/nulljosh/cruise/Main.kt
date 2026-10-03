package com.nulljosh.cruise

import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application
import androidx.compose.ui.window.rememberWindowState

fun main() = application {
    // ponytail: no per-app toggle UI here (Settings lives on the macOS app only)
    // — desktop just registers itself on login every launch, enabled by default.
    LoginItem.sync(enabled = true)
    Window(
        onCloseRequest = ::exitApplication,
        title = "Cruise",
        state = rememberWindowState(size = DpSize(420.dp, 640.dp)),
    ) {
        // ponytail: same reasoning as MainActivity — Windows/Linux desktop is
        // never the Mac running the runner, default to the public tunnel host.
        MaterialTheme { StatusScreen(defaultHost = "pwnlingo-status.heyitsmejosh.com") }
    }
}
