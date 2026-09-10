package com.nulljosh.pwnlingo

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.material3.MaterialTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        // ponytail: Android/desktop clients are never on the same machine as the
        // Mac running the runner, unlike the SwiftUI app's localhost default —
        // default to the public Cloudflare Tunnel host instead.
        setContent { MaterialTheme { StatusScreen(defaultHost = "pwnlingo-status.heyitsmejosh.com") } }
    }
}
