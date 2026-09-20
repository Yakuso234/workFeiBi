Option Explicit
Dim fso, base, exe, sh
Set fso = CreateObject("Scripting.FileSystemObject")
base = fso.GetParentFolderName(WScript.ScriptFullName)
exe = fso.BuildPath(base, "release\workFeiBi\workFeiBi.exe")
Set sh = CreateObject("WScript.Shell")
sh.Environment("PROCESS")("ELECTRON_RUN_AS_NODE") = ""
If fso.FileExists(exe) Then
  sh.Run Chr(34) & exe & Chr(34), 1, False
Else
  MsgBox "Please build workFeiBi first, or run npm start.", 48, "workFeiBi"
End If
