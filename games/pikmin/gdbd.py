"""Reads any address while the game runs, through Dolphin's GDB stub on a unix socket (GDBSocket in Dolphin.ini).
Dolphin's Core init blocks until a client connects and then halts the CPU until `c`, so start this before Dolphin.
The stub serves `m` packets from a CoreTiming event while running (Source/Core/Core/PowerPC/GDBStub.cpp), and it
takes one client only, so this daemon owns it and serves reads on tcp 26762: `r 80516660 4` -> hex bytes.
Reads only: no writes or breakpoints are ever forwarded."""
import os
import socket
import threading
import time

SOCK = "/Volumes/LaCie/dolphin-duke/gdb.sock"
PORT = 26762
lock = threading.Lock()


def packet(body):
    return f"${body}#{sum(body.encode()) & 0xFF:02x}".encode()


class Stub:
    def __init__(self):
        while True:
            try:
                self.s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
                self.s.connect(SOCK)
                break
            except OSError:
                time.sleep(0.5)
        self.s.sendall(packet("c"))            # let the CPU run; `c` gets an ack but no reply
        self.buf = b""

    def reply(self):
        while True:
            start = self.buf.find(b"$")
            end = self.buf.find(b"#", start)
            if start >= 0 and end >= 0 and len(self.buf) >= end + 3:
                body, self.buf = self.buf[start + 1:end], self.buf[end + 3:]
                return body.decode()
            chunk = self.s.recv(65536)
            if not chunk:
                raise ConnectionError("dolphin closed the gdb socket")
            self.buf += chunk

    def read(self, addr, n):
        with lock:
            self.s.sendall(packet(f"m{addr:x},{n:x}"))
            self.s.sendall(b"+")              # ack the reply in advance; the stub does not wait for it
            return self.reply()


def serve(stub):
    srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind(("127.0.0.1", PORT))
    srv.listen(8)
    while True:
        conn, _ = srv.accept()
        threading.Thread(target=session, args=(stub, conn), daemon=True).start()


def session(stub, conn):
    f = conn.makefile("rw")
    for line in f:
        w = line.split()
        if len(w) == 3 and w[0] == "r":
            f.write(stub.read(int(w[1], 16), int(w[2])) + "\n")
        else:
            f.write("E99\n")
        f.flush()


if __name__ == "__main__":
    assert packet("c") == b"$c#63"
    print("gdbd: waiting for dolphin on", SOCK, flush=True)
    stub = Stub()
    print("gdbd: connected, serving reads on tcp", PORT, flush=True)
    serve(stub)
