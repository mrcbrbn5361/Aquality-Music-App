; Aquality Music - Professional NSIS Installer
Unicode true

!macro customHeader
  !system "echo Aquality Music NSIS custom header loaded"
!macroend

!macro customInit
  StrCpy $INSTDIR "$LOCALAPPDATA\Aquality Music"
  SetShellVarContext current
!macroend

!macro customInstall
  CreateShortCut "$SMPROGRAMS\Aquality Music.lnk" "$INSTDIR\Aquality Music.exe" "" "$INSTDIR\resources\assets\icon.ico"
!macroend

!macro customUnInstall
  ; Sadece gecici profil ve kisayollari sil — kullanici verisi korunur (deleteAppDataOnUninstall:false)
  RMDir /r "$TEMP\aquality-music-chrome-profile"
  Delete "$DESKTOP\Aquality Music.lnk"
  Delete "$SMPROGRAMS\Aquality Music.lnk"
!macroend
