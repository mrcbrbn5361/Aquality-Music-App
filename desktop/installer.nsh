; Aquality Music - NSIS Installer
Unicode true

!macro customHeader
  !system "echo Aquality Music NSIS custom header loaded"
!macroend

!macro customInit
  SetShellVarContext current
!macroend

!macro customInstall
  SetOutPath "$INSTDIR"
  CreateShortCut "$SMPROGRAMS\Aquality Music.lnk" "$INSTDIR\Aquality Music.exe" "" "$INSTDIR\Aquality Music.exe" 0 SW_SHOWNORMAL "" "Aquality Music - Premium Müzik Deneyimi"
!macroend

!macro customUnInstall
  SetShellVarContext current
  RMDir /r "$TEMP\aquality-music-chrome-profile"
  RMDir /r "$TEMP\aquality-music-*"
  RMDir /r "$LOCALAPPDATA\aquality-music-updater"
  RMDir /r "$APPDATA\Aquality Music\Cache"
  RMDir /r "$APPDATA\Aquality Music\Code Cache"
  RMDir /r "$APPDATA\Aquality Music\GPUCache"
  Delete "$DESKTOP\Aquality Music.lnk"
  Delete "$SMPROGRAMS\Aquality Music.lnk"
!macroend

