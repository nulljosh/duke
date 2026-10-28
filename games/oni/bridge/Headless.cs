using System;
using System.Runtime.InteropServices;

// Headless: every game window goes fully transparent and click-through, and the app leaves the Dock and Cmd-Tab, so
// nothing of the game shows on Joshua's screen. The windows stay ordered in, so Unity keeps rendering at full speed and
// screenshots come from ScreenCapture instead of the window server.
static class Headless
{
    const string ObjC = "/usr/lib/libobjc.A.dylib";
    [DllImport(ObjC)] static extern IntPtr objc_getClass(string name);
    [DllImport(ObjC)] static extern IntPtr sel_registerName(string name);
    [DllImport(ObjC, EntryPoint = "objc_msgSend")] static extern IntPtr Send(IntPtr self, IntPtr sel);
    [DllImport(ObjC, EntryPoint = "objc_msgSend")] static extern IntPtr SendInt(IntPtr self, IntPtr sel, long a);
    [DllImport(ObjC, EntryPoint = "objc_msgSend")] static extern IntPtr SendDouble(IntPtr self, IntPtr sel, double a);
    [DllImport(ObjC, EntryPoint = "objc_msgSend")] static extern IntPtr SendBool(IntPtr self, IntPtr sel, [MarshalAs(UnmanagedType.I1)] bool a);
    static IntPtr S(string n) => sel_registerName(n);
    public static bool On = true;

    public static int Apply()
    {
        var app = Send(objc_getClass("NSApplication"), S("sharedApplication"));
        var windows = Send(app, S("windows")); long n = (long)Send(windows, S("count"));
        for (long i = 0; i < n; i++)
        {
            var w = SendInt(windows, S("objectAtIndex:"), i);
            SendDouble(w, S("setAlphaValue:"), On ? 0.0 : 1.0);
            SendBool(w, S("setIgnoresMouseEvents:"), On);
            SendBool(w, S("setHasShadow:"), !On);
            SendInt(w, S("setCollectionBehavior:"), On ? 8 | 64 : 0);   // transient (out of Mission Control), ignores Cmd-` cycling
        }
        SendInt(app, S("setActivationPolicy:"), On ? 1 : 0);   // accessory: no Dock icon, no menu bar, not in Cmd-Tab
        if (On) Send(app, S("unhideWithoutActivation"));   // a launch-time Cmd-H would stop the frames; transparent is enough
        return (int)n;
    }
}
