// Headless input for Papers, Please: loaded into the game with DYLD_INSERT_LIBRARIES (its entitlements allow it).
// Listens on /tmp/papers-input.sock for cliclick-style lines ("m:x,y dd:x,y du:x,y c:x,y w:ms", "q" quits), x,y in
// window points from the frame's top-left (title bar included, same as the screenshot). Mouse events go straight
// into the app's queue and the cursor queries answer with the virtual pointer, so Joshua's real cursor never moves
// and the game plays behind his other windows.
// Build: clang -dynamiclib -fobjc-arc -framework Cocoa -o headless.dylib headless.m
#import <Cocoa/Cocoa.h>
#import <objc/runtime.h>
#include <sys/socket.h>
#include <sys/un.h>

static NSPoint vpos;            // window points, top-left origin
static NSUInteger vbuttons;
static id activity;

static NSWindow *game(void) {
    NSWindow *best = nil;
    for (NSWindow *w in NSApp.windows) if (w.isVisible && w.frame.size.width > (best ? best.frame.size.width : 100)) best = w;
    return best;
}
static NSPoint base(NSWindow *w) { return NSMakePoint(vpos.x, w.frame.size.height - vpos.y); }   // window base coords

static void post(NSEventType t) {
    NSWindow *w = game(); if (!w) return;
    NSEvent *e = [NSEvent mouseEventWithType:t location:base(w) modifierFlags:0 timestamp:NSProcessInfo.processInfo.systemUptime
                                windowNumber:w.windowNumber context:nil eventNumber:0 clickCount:1 pressure:(vbuttons ? 1 : 0)];
    [w sendEvent:e];   // straight to the window: queued through NSApp, an inactive app drops the click
}

static void run(NSString *tok) {
    if ([tok isEqualToString:@"q"]) { dispatch_async(dispatch_get_main_queue(), ^{ [NSApp terminate:nil]; }); return; }
    NSArray *kv = [tok componentsSeparatedByString:@":"]; if (kv.count != 2) return;
    NSString *k = kv[0]; NSArray *xy = [kv[1] componentsSeparatedByString:@","];
    if ([k isEqualToString:@"w"]) { usleep([kv[1] intValue] * 1000); return; }
    if (xy.count != 2) return;
    NSPoint p = NSMakePoint([xy[0] doubleValue], [xy[1] doubleValue]);
    dispatch_sync(dispatch_get_main_queue(), ^{
        vpos = p;
        if ([k isEqualToString:@"m"]) post(vbuttons ? NSEventTypeLeftMouseDragged : NSEventTypeMouseMoved);
        else if ([k isEqualToString:@"dd"]) { vbuttons = 1; post(NSEventTypeLeftMouseDown); }
        else if ([k isEqualToString:@"du"]) { vbuttons = 0; post(NSEventTypeLeftMouseUp); }
        else if ([k isEqualToString:@"c"]) { post(NSEventTypeMouseMoved); vbuttons = 1; post(NSEventTypeLeftMouseDown); }
    });
    if ([k isEqualToString:@"c"]) { usleep(90000); dispatch_sync(dispatch_get_main_queue(), ^{ vbuttons = 0; post(NSEventTypeLeftMouseUp); }); }
    usleep(100000);   // cliclick's own spacing: Unity samples the pointer once a frame
}

static void serve(void) {
    const char *path = "/tmp/papers-input.sock"; unlink(path);
    int s = socket(AF_UNIX, SOCK_STREAM, 0); struct sockaddr_un a = {.sun_family = AF_UNIX};
    strncpy(a.sun_path, path, sizeof a.sun_path - 1);
    if (bind(s, (struct sockaddr *)&a, sizeof a) || listen(s, 4)) return;
    for (;;) {
        int c = accept(s, NULL, NULL); if (c < 0) continue;
        FILE *f = fdopen(c, "r+"); char line[4096];
        while (fgets(line, sizeof line, f)) {
            for (NSString *tok in [@(line) componentsSeparatedByCharactersInSet:NSCharacterSet.whitespaceAndNewlineCharacterSet])
                if (tok.length) run(tok);
            fputs("ok\n", f); fflush(f);
        }
        fclose(f);
    }
}

// The pointer and focus queries answer as if the game were in front under the virtual cursor.
static NSPoint mouseLocation(id self, SEL _cmd) { NSWindow *w = game(); return w ? [w convertPointToScreen:base(w)] : NSZeroPoint; }
static NSUInteger pressedMouseButtons(id self, SEL _cmd) { return vbuttons; }
static NSPoint outside(NSWindow *self, SEL _cmd) { return base(self); }
static BOOL yes(id self, SEL _cmd) { return YES; }
static NSWindowOcclusionState visible(id self, SEL _cmd) { return NSWindowOcclusionStateVisible; }

static void swap(Class c, SEL s, IMP i) { Method m = class_getInstanceMethod(c, s); if (m) method_setImplementation(m, i); }

__attribute__((constructor)) static void init(void) {
    swap(object_getClass(NSEvent.class), @selector(mouseLocation), (IMP)mouseLocation);
    swap(object_getClass(NSEvent.class), @selector(pressedMouseButtons), (IMP)pressedMouseButtons);
    swap(NSWindow.class, @selector(mouseLocationOutsideOfEventStream), (IMP)outside);
    swap(NSWindow.class, @selector(isKeyWindow), (IMP)yes);
    swap(NSWindow.class, @selector(occlusionState), (IMP)visible);
    swap(NSApplication.class, @selector(isActive), (IMP)yes);
    activity = [NSProcessInfo.processInfo beginActivityWithOptions:NSActivityUserInitiated | NSActivityLatencyCritical reason:@"headless play"];   // no App Nap behind other windows
    [NSThread detachNewThreadWithBlock:^{ serve(); }];
}
