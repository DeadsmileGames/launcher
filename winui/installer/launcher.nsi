Unicode true
!ifndef SETUP_DIR
!error "SETUP_DIR is required"
!endif
!ifndef OUT_FILE
!error "OUT_FILE is required"
!endif
!ifndef APP_VERSION
!define APP_VERSION "1.0.0"
!endif

Name "Deadsmile Games Launcher"
OutFile "${OUT_FILE}"
Icon "${SETUP_DIR}\Assets\Icon.ico"
RequestExecutionLevel user
SilentInstall silent
ShowInstDetails hide
SetCompressor /SOLID lzma
VIProductVersion "${APP_VERSION}.0"
VIAddVersionKey /LANG=1046 "ProductName" "Deadsmile Games Launcher"
VIAddVersionKey /LANG=1046 "CompanyName" "Deadsmile Games"
VIAddVersionKey /LANG=1046 "FileDescription" "Deadsmile Games Launcher Setup"
VIAddVersionKey /LANG=1046 "ProductVersion" "${APP_VERSION}"

Section "Launch native WinUI setup"
  InitPluginsDir
  SetOutPath "$PLUGINSDIR\DeadsmileSetup"
  File /r "${SETUP_DIR}\*"
  ExecWait '"$PLUGINSDIR\DeadsmileSetup\Deadsmile.Setup.exe" $CMDLINE' $0
  SetErrorLevel $0
SectionEnd
