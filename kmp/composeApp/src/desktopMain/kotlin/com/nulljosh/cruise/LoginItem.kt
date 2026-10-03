package com.nulljosh.cruise

import java.io.File

// ponytail: no cross-platform "open at login" API in the JVM/Compose desktop
// stack, so each OS gets its native mechanism directly — a registry Run key
// on Windows, an autostart .desktop file on Linux, a LaunchAgent plist on Mac
// (SMAppService is Swift-only, unavailable from the JVM app).
object LoginItem {
    private val os = System.getProperty("os.name").lowercase()
    private val exePath: String get() = ProcessHandle.current().info().command().orElse(null)
        ?: System.getProperty("java.home") + "/bin/java"

    fun sync(enabled: Boolean) {
        try {
            when {
                os.contains("win") -> syncWindows(enabled)
                os.contains("linux") -> syncLinux(enabled)
                os.contains("mac") -> syncMac(enabled)
            }
        } catch (e: Exception) {
            System.err.println("LoginItem sync failed: $e")
        }
    }

    private fun syncWindows(enabled: Boolean) {
        val key = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run"
        if (enabled) {
            ProcessBuilder("reg", "add", key, "/v", "Cruise", "/t", "REG_SZ", "/d", "\"$exePath\"", "/f")
                .inheritIO().start().waitFor()
        } else {
            ProcessBuilder("reg", "delete", key, "/v", "Cruise", "/f").inheritIO().start().waitFor()
        }
    }

    private fun linuxAutostartFile() = File(System.getProperty("user.home"), ".config/autostart/cruise.desktop")

    private fun syncLinux(enabled: Boolean) {
        val f = linuxAutostartFile()
        if (enabled) {
            f.parentFile.mkdirs()
            f.writeText(
                """
                [Desktop Entry]
                Type=Application
                Name=Cruise
                Exec=$exePath
                X-GNOME-Autostart-enabled=true
                """.trimIndent()
            )
        } else {
            f.delete()
        }
    }

    private fun macPlist() = File(System.getProperty("user.home"), "Library/LaunchAgents/com.nulljosh.cruise.plist")

    private fun syncMac(enabled: Boolean) {
        val f = macPlist()
        if (enabled) {
            f.parentFile.mkdirs()
            f.writeText(
                """
                <?xml version="1.0" encoding="UTF-8"?>
                <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
                <plist version="1.0"><dict>
                  <key>Label</key><string>com.nulljosh.cruise</string>
                  <key>ProgramArguments</key><array><string>$exePath</string></array>
                  <key>RunAtLoad</key><true/>
                </dict></plist>
                """.trimIndent()
            )
        } else {
            f.delete()
        }
    }
}
