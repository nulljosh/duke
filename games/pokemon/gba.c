// Headless GBA player on libmgba. No window: the bot talks to it on 127.0.0.1:8742,
// and raw 240x160 RGB0 frames go to stdout for ffmpeg to stream into OBS.
// Build: ./build.sh   Run: ./gba rom.gba | ffmpeg -f rawvideo -pix_fmt rgb0 -s 240x160 -r 60 -i - ...
#include <mgba/core/core.h>
#include <mgba/core/log.h>
#include <mgba/core/serialize.h>
#include <mgba-util/vfs.h>

#include <arpa/inet.h>
#include <errno.h>
#include <fcntl.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>

#define W 240
#define H 160
#define PORT 8742

static color_t frame[W * H];
static int lsock = -1, csock = -1;
static char inbuf[4096];
static size_t inlen = 0;
static int turbo = 1; // frames per tick; 1 = real time for the stream

static void quietLog(struct mLogger* l, int c, enum mLogLevel lv, const char* f, va_list a) {
	(void) l; (void) c; (void) lv; (void) f; (void) a;
}

static void reply(const char* s) {
	if (csock >= 0) {
		send(csock, s, strlen(s), 0);
		send(csock, "\n", 1, 0);
	}
}

static void command(struct mCore* core, char* line) {
	char op[16] = {0}, arg[1024] = {0};
	unsigned a = 0, n = 0;
	char out[4200];
	sscanf(line, "%15s %1023s", op, arg);
	if (!strcmp(op, "keys")) { // held-key bitmask, GBA order: A B Sel Start > < ^ v R L
		core->setKeys(core, strtoul(arg, NULL, 0));
		reply("ok");
	} else if (!strcmp(op, "r8") || !strcmp(op, "r16") || !strcmp(op, "r32")) {
		a = strtoul(arg, NULL, 0);
		uint32_t v = op[1] == '8' ? core->busRead8(core, a) : op[1] == '1' ? core->busRead16(core, a) : core->busRead32(core, a);
		snprintf(out, sizeof(out), "%u", v);
		reply(out);
	} else if (!strcmp(op, "rd")) { // rd <addr> <len<=2048> -> hex
		sscanf(line, "%*s %i %u", (int*) &a, &n);
		if (n > 2048) n = 2048;
		for (unsigned i = 0; i < n; ++i) snprintf(out + i * 2, 3, "%02x", core->busRead8(core, a + i));
		out[n * 2] = 0;
		reply(out);
	} else if (!strcmp(op, "frame")) {
		snprintf(out, sizeof(out), "%u", core->frameCounter(core));
		reply(out);
	} else if (!strcmp(op, "shot") || !strcmp(op, "save") || !strcmp(op, "load")) {
		struct VFile* vf = VFileOpen(arg, op[0] == 'l' ? O_RDONLY : O_RDWR | O_CREAT | O_TRUNC);
		bool ok = vf && (op[0] == 's' && op[1] == 'h' ? mCoreTakeScreenshotVF(core, vf)
		               : op[0] == 's' ? mCoreSaveStateNamed(core, vf, SAVESTATE_SAVEDATA | SAVESTATE_RTC)
		               : mCoreLoadStateNamed(core, vf, SAVESTATE_RTC));
		if (vf) vf->close(vf);
		reply(ok ? "ok" : "error");
	} else if (!strcmp(op, "turbo")) {
		turbo = atoi(arg) > 0 ? atoi(arg) : 1;
		reply("ok");
	} else {
		reply("error unknown op");
	}
}

static void pollSocket(struct mCore* core) {
	if (csock < 0) {
		csock = accept(lsock, NULL, NULL);
		if (csock < 0) return;
		fcntl(csock, F_SETFL, O_NONBLOCK);
		inlen = 0;
	}
	ssize_t got = recv(csock, inbuf + inlen, sizeof(inbuf) - 1 - inlen, 0);
	if (got == 0 || (got < 0 && errno != EAGAIN)) {
		close(csock);
		csock = -1;
		return;
	}
	if (got > 0) inlen += got;
	inbuf[inlen] = 0;
	char* nl;
	while ((nl = strchr(inbuf, '\n'))) {
		*nl = 0;
		command(core, inbuf);
		memmove(inbuf, nl + 1, inlen - (nl + 1 - inbuf) + 1);
		inlen = strlen(inbuf);
	}
	if (inlen == sizeof(inbuf) - 1) inlen = 0; // ponytail: overlong line dropped
}

int main(int argc, char** argv) {
	if (argc < 2) {
		fprintf(stderr, "usage: gba rom.gba\n");
		return 1;
	}
	signal(SIGPIPE, SIG_IGN); // keep playing if the stream pipe closes
	static struct mLogger logger = { .log = quietLog };
	mLogSetDefaultLogger(&logger);

	struct mCore* core = mCoreFind(argv[1]);
	if (!core || !core->init(core)) return 1;
	mCoreInitConfig(core, NULL);
	core->setVideoBuffer(core, frame, W);
	if (!mCoreLoadFile(core, argv[1])) return 1;
	mCoreAutoloadSave(core); // battery save sits next to the ROM (.sav)
	core->reset(core);

	lsock = socket(AF_INET, SOCK_STREAM, 0);
	int one = 1;
	setsockopt(lsock, SOL_SOCKET, SO_REUSEADDR, &one, sizeof(one));
	struct sockaddr_in addr = { .sin_family = AF_INET, .sin_port = htons(PORT), .sin_addr.s_addr = htonl(INADDR_LOOPBACK) };
	if (bind(lsock, (struct sockaddr*) &addr, sizeof(addr)) || listen(lsock, 1)) {
		perror("bind");
		return 1;
	}
	fcntl(lsock, F_SETFL, O_NONBLOCK);
	fprintf(stderr, "gba: listening on 127.0.0.1:%d\n", PORT);

	const long tick = 16742706; // ns per GBA frame (59.7275 Hz)
	struct timespec next;
	clock_gettime(CLOCK_MONOTONIC, &next);
	for (;;) {
		pollSocket(core);
		for (int i = 0; i < turbo; ++i) core->runFrame(core);
		fwrite(frame, sizeof(frame), 1, stdout);
		fflush(stdout);
		next.tv_nsec += tick;
		if (next.tv_nsec >= 1000000000L) {
			next.tv_nsec -= 1000000000L;
			next.tv_sec++;
		}
		struct timespec now, wait;
		clock_gettime(CLOCK_MONOTONIC, &now);
		long ns = (next.tv_sec - now.tv_sec) * 1000000000L + (next.tv_nsec - now.tv_nsec);
		if (ns > 0) {
			wait.tv_sec = ns / 1000000000L;
			wait.tv_nsec = ns % 1000000000L;
			nanosleep(&wait, NULL);
		} else if (ns < -100000000L) {
			next = now; // fell behind (turbo or a stall): don't race to catch up
		}
	}
}
