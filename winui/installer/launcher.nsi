Unicode true
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "FileFunc.nsh"
!include "x64.nsh"
!ifndef PUBLISH_DIR
 !error "PUBLISH_DIR is required"
!endif
!ifndef OUT_FILE
 !error "OUT_FILE is required"
!endif
!ifndef APP_VERSION
 !define APP_VERSION "2.0.0"
!endif
Name "Deadsmile Games Launcher"
OutFile "${OUT_FILE}"
InstallDir "$LOCALAPPDATA\Programs\Deadsmile Games Launcher"
InstallDirRegKey HKCU "Software\Deadsmile Games Launcher" "InstallDir"
RequestExecutionLevel user
ManifestDPIAware true
SetCompressor /SOLID lzma
VIProductVersion "${APP_VERSION}.0"
VIAddVersionKey /LANG=1033 "ProductName" "Deadsmile Games Launcher"
VIAddVersionKey /LANG=1033 "FileDescription" "Deadsmile Games Launcher WinUI Setup"
VIAddVersionKey /LANG=1033 "FileVersion" "${APP_VERSION}"
VIAddVersionKey /LANG=1033 "ProductVersion" "${APP_VERSION}"
!define MUI_ICON "${PUBLISH_DIR}\Assets\Icon.ico"
!define MUI_ABORTWARNING
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "PortugueseBR"
!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_LANGUAGE "Spanish"
Function .onInit
 ${If} ${RunningX64}
 ${Else}
  MessageBox MB_ICONSTOP "This application requires 64-bit Windows."
  Abort
 ${EndIf}
FunctionEnd
Section "Launcher"
 SetShellVarContext current
 FindWindow $0 "" "Deadsmile Games Launcher"
 ${If} $0 != 0
  MessageBox MB_ICONSTOP "Close Deadsmile Games Launcher and its running games before installing."
  Abort
 ${EndIf}
 IfFileExists "$INSTDIR.backup\*.*" 0 +3
 MessageBox MB_ICONSTOP "A previous backup must be recovered before updating: $INSTDIR.backup"
 Abort
 IfFileExists "$INSTDIR\*.*" 0 prepare
 IfFileExists "$INSTDIR\deadsmile.install" prepare 0
 MessageBox MB_ICONSTOP "Choose an empty folder or an existing Deadsmile WinUI installation."
 Abort
 prepare:
 IfFileExists "$INSTDIR.new\*.*" 0 +3
 MessageBox MB_ICONSTOP "A previous staging folder must be reviewed: $INSTDIR.new"
 Abort
 SetOutPath "$INSTDIR.new"
 File /r "${PUBLISH_DIR}\*"
 FileOpen $0 "$INSTDIR.new\deadsmile.install" w
 FileWrite $0 "Deadsmile.WinUI"
 FileClose $0
 WriteUninstaller "$INSTDIR.new\Uninstall.exe"
 SetOutPath "$TEMP"
 IfFileExists "$INSTDIR\deadsmile.install" 0 swap
 ClearErrors
 Rename "$INSTDIR" "$INSTDIR.backup"
 IfErrors rollback_fail
 swap:
 ClearErrors
 Rename "$INSTDIR.new" "$INSTDIR"
 IfErrors rollback
 WriteRegStr HKCU "Software\Deadsmile Games Launcher" "InstallDir" "$INSTDIR"
 WriteRegStr HKCU "Software\Classes\deadsmile" "" "URL:Deadsmile Games Launcher"
 WriteRegStr HKCU "Software\Classes\deadsmile" "URL Protocol" ""
 WriteRegStr HKCU "Software\Classes\deadsmile\DefaultIcon" "" '$\"$INSTDIR\Deadsmile.Launcher.exe$\",0'
 WriteRegStr HKCU "Software\Classes\deadsmile\shell\open\command" "" '$\"$INSTDIR\Deadsmile.Launcher.exe$\" $\"%1$\"'
 CreateShortcut "$DESKTOP\Deadsmile Games Launcher.lnk" "$INSTDIR\Deadsmile.Launcher.exe"
 CreateDirectory "$SMPROGRAMS\Deadsmile Games"
 CreateShortcut "$SMPROGRAMS\Deadsmile Games\Deadsmile Games Launcher.lnk" "$INSTDIR\Deadsmile.Launcher.exe"
 WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\DeadsmileWinUI" "DisplayName" "Deadsmile Games Launcher"
 WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\DeadsmileWinUI" "DisplayVersion" "${APP_VERSION}"
 WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\DeadsmileWinUI" "Publisher" "Deadsmile Games"
 WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\DeadsmileWinUI" "DisplayIcon" "$INSTDIR\Deadsmile.Launcher.exe"
 WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\DeadsmileWinUI" "UninstallString" '$\"$INSTDIR\Uninstall.exe$\"'
 WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\DeadsmileWinUI" "NoModify" 1
 WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\DeadsmileWinUI" "NoRepair" 1
 RMDir /r "$INSTDIR.backup"
 Goto finish
 rollback:
 Rename "$INSTDIR.backup" "$INSTDIR"
 rollback_fail:
 MessageBox MB_ICONSTOP "Installation could not commit. The previous installation or backup was preserved."
 Abort
 finish:
SectionEnd
Section "Uninstall"
 SetShellVarContext current
 IfFileExists "$INSTDIR\deadsmile.install" 0 finish_uninstall
 ReadRegStr $0 HKCU "Software\Classes\deadsmile\shell\open\command" ""
 StrCmp $0 '$\"$INSTDIR\Deadsmile.Launcher.exe$\" $\"%1$\"' 0 +2
 DeleteRegKey HKCU "Software\Classes\deadsmile"
 DeleteRegKey HKCU "Software\Deadsmile Games Launcher"
 DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\DeadsmileWinUI"
 Delete "$DESKTOP\Deadsmile Games Launcher.lnk"
 Delete "$SMPROGRAMS\Deadsmile Games\Deadsmile Games Launcher.lnk"
 RMDir "$SMPROGRAMS\Deadsmile Games"
 RMDir /r "$INSTDIR"
 ; User games, saves and settings are outside INSTDIR and are preserved.
 finish_uninstall:
SectionEnd

