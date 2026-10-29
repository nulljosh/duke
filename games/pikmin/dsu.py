"""A virtual GameCube pad for Dolphin, with no window and no focus needed. Dolphin's Mac build has no pipe input,
but it does have a DSU (cemuhook) UDP client, so this is a DSU server (layout from Dolphin's
InputCommon/ControllerInterface/DualShockUDPClient/DualShockUDPProto.h: packed structs, zlib CRC32).

Dolphin side: DSUClient.ini has [Server] Enabled = True, Entries = Duke:127.0.0.1:26760; and GCPadNew.ini maps
Device = DSUClient/0/Duke (see dolphin.py). The bot talks to this on 127.0.0.1:26761, one command per line:
  hold A B          hold buttons until released          release A | release all
  stick 0.0 1.0     main stick x, y in -1..1 (y up)      cstick x y
  press A 80        hold A for 80 ms, then let go
GameCube -> DSU: A Cross, B Circle, X Square, Y Triangle, Z R1, L L2, R R2, Start Options, D-pad Pad N/S/E/W,
main stick Left, C stick Right. SHARE is Dolphin's screenshot hotkey."""
import socket
import struct
import threading
import time
import zlib

PORT, CONTROL = 26760, 26761
SERVER_ID = 0x44554B45                     # "DUKE"
VERSION = 1001
T_VERSION, T_PORTS, T_PAD = 0x100000, 0x100001, 0x100002
MAC = bytes([0x02, 0, 0, 0, 0, 0x01])
# Analog fields in PadDataResponse order: dpad W S E N, square cross circle triangle, R1 L1 R2 L2.
ANALOG = ["W", "S", "E", "N", "X", "A", "B", "Y", "Z", "_L1", "R", "L"]
ALIAS = {"LEFT": "W", "DOWN": "S", "RIGHT": "E", "UP": "N"}

state = {"held": set(), "lx": 0.0, "ly": 0.0, "rx": 0.0, "ry": 0.0}
lock = threading.Lock()
clients = {}                               # addr -> last request time


def header(payload):
    msg = b"DSUS" + struct.pack("<HHII", VERSION, len(payload), 0, SERVER_ID) + payload
    crc = zlib.crc32(msg) & 0xFFFFFFFF
    return msg[:8] + struct.pack("<I", crc) + msg[12:]


def port_info(pad):
    connected = pad == 0
    return header(struct.pack("<IBBBB6sBB", T_PORTS, pad, 2 if connected else 0, 2 if connected else 0,
                              1 if connected else 0, MAC if connected else bytes(6), 5 if connected else 0, 0))


def axis(v):
    return max(0, min(255, int(round(128 + v * 127))))


def pad_data(counter):
    with lock:
        held = set(state["held"])
        lx, ly, rx, ry = state["lx"], state["ly"], state["rx"], state["ry"]
    bs1 = (0x08 if "START" in held else 0) | (0x01 if "SHARE" in held else 0)   # Options, Share
    analog = bytes(255 if k in held else 0 for k in ANALOG)
    body = struct.pack("<IBBBB6sBBIBBBBBBBB", T_PAD, 0, 2, 2, 1, MAC, 5, 1, counter, bs1, 0, 0, 0,
                       axis(lx), axis(ly), axis(rx), axis(ry))
    body += analog + bytes(12) + struct.pack("<Q6f", int(time.time() * 1e6), 0, 1, 0, 0, 0, 0)
    return header(body)


def serve():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.bind(("127.0.0.1", PORT))
    s.settimeout(0.004)
    counter = 0
    while True:
        try:
            data, addr = s.recvfrom(1024)
            if data[:4] == b"DSUC" and len(data) >= 20:
                t = struct.unpack_from("<I", data, 16)[0]
                if t == T_VERSION:
                    s.sendto(header(struct.pack("<IH2x", T_VERSION, VERSION)), addr)
                elif t == T_PORTS:
                    n = struct.unpack_from("<I", data, 20)[0]
                    for pad in data[24:24 + min(n, 4)]:
                        s.sendto(port_info(pad), addr)
                elif t == T_PAD:
                    clients[addr] = time.time()
        except socket.timeout:
            pass
        counter += 1
        now = time.time()
        for addr, seen in list(clients.items()):
            if now - seen > 5:             # Dolphin re-subscribes every second or so
                del clients[addr]
            else:
                s.sendto(pad_data(counter), addr)


def name(k):
    k = k.upper()
    return ALIAS.get(k, k)


def control():
    c = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    c.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    c.bind(("127.0.0.1", CONTROL))
    c.listen(4)
    while True:
        conn, _ = c.accept()
        threading.Thread(target=session, args=(conn,), daemon=True).start()


def session(conn):
    f = conn.makefile("rw")
    for line in f:
        w = line.split()
        if not w:
            continue
        op, args = w[0].lower(), w[1:]
        with lock:
            if op == "hold":
                state["held"].update(name(a) for a in args)
            elif op == "release":
                if args == ["all"]:
                    state["held"].clear()
                    state.update(lx=0.0, ly=0.0, rx=0.0, ry=0.0)
                else:
                    state["held"].difference_update(name(a) for a in args)
            elif op in ("stick", "cstick"):
                k = "l" if op == "stick" else "r"
                state[k + "x"], state[k + "y"] = float(args[0]), float(args[1])
        if op == "press":
            with lock:
                state["held"].add(name(args[0]))
            time.sleep(int(args[1] if len(args) > 1 else 80) / 1000)
            with lock:
                state["held"].discard(name(args[0]))
        f.write("ok\n")
        f.flush()


if __name__ == "__main__":
    assert len(pad_data(1)) == 100 and len(port_info(0)) == 32, "DSU message sizes drifted from the proto"
    threading.Thread(target=control, daemon=True).start()
    print(f"dsu: pad on udp {PORT}, control on tcp {CONTROL}", flush=True)
    serve()
