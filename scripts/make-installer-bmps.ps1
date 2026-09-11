Add-Type -AssemblyName System.Drawing

$baseDir = Split-Path -Parent $PSScriptRoot
if (-not $baseDir -or -not (Test-Path $baseDir)) {
    $baseDir = (Get-Location).Path
}
$iconPath = Join-Path $baseDir "desktop\assets\icon.png"
$headerPath = Join-Path $baseDir "desktop\assets\installerHeader.bmp"
$sidebarPath = Join-Path $baseDir "desktop\assets\installerSidebar.bmp"

if (-not (Test-Path $iconPath)) {
    Write-Error "icon.png bulunamadi: $iconPath"
    exit 1
}

$iconImg = [System.Drawing.Image]::FromFile($iconPath)

# -------------------------------------------------------------
# 1. installerHeader.bmp (150x57, NSIS MUI2 standardi)
# Header arka plani beyaz (#ffffff), sagda temiz 48x48 logo
# -------------------------------------------------------------
$headerBmp = New-Object System.Drawing.Bitmap 150, 57, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$gHeader = [System.Drawing.Graphics]::FromImage($headerBmp)
$gHeader.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gHeader.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gHeader.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 255))
$gHeader.FillRectangle($whiteBrush, 0, 0, 150, 57)
$whiteBrush.Dispose()

$gHeader.DrawImage($iconImg, 96, 4, 48, 48)
$gHeader.Dispose()

$headerBmp.Save($headerPath, [System.Drawing.Imaging.ImageFormat]::Bmp)
$headerBmp.Dispose()
Write-Output "installerHeader.bmp olusturuldu (150x57)"

# -------------------------------------------------------------
# 2. installerSidebar.bmp (164x314, NSIS MUI2 standardi)
# Tum alani kaplayan modern koyu zümrüt / lacivert degrade + logo + typography
# -------------------------------------------------------------
$sidebarBmp = New-Object System.Drawing.Bitmap 164, 314, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$gSidebar = [System.Drawing.Graphics]::FromImage($sidebarBmp)
$gSidebar.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gSidebar.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gSidebar.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

$rect = New-Object System.Drawing.Rectangle 0, 0, 164, 314
$colorTop = [System.Drawing.Color]::FromArgb(11, 26, 22)
$colorBottom = [System.Drawing.Color]::FromArgb(7, 13, 16)
$gradBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush ($rect, $colorTop, $colorBottom, [System.Drawing.Drawing2D.LinearGradientMode]::Vertical)
$gSidebar.FillRectangle($gradBrush, $rect)
$gradBrush.Dispose()

$glowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(25, 29, 185, 84))
$gSidebar.FillEllipse($glowBrush, 12, 30, 140, 140)
$glowBrush.Dispose()

$gSidebar.DrawImage($iconImg, 32, 50, 100, 100)

$titleFont = New-Object System.Drawing.Font ("Segoe UI", [float]13, [System.Drawing.FontStyle]::Bold)
$textBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 255))
$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center

$gSidebar.DrawString("AQUALITY", $titleFont, $textBrush, [float]82, [float]165, $format)

$subFont = New-Object System.Drawing.Font ("Segoe UI", [float]10, [System.Drawing.FontStyle]::Bold)
$greenBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(29, 185, 84))
$gSidebar.DrawString("MUSIC", $subFont, $greenBrush, [float]82, [float]188, $format)

# İnce ayırıcı çizgi
$pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(40, 255, 255, 255))
$gSidebar.DrawLine($pen, [float]30, [float]215, [float]134, [float]215)
$pen.Dispose()

$descFont = New-Object System.Drawing.Font ("Segoe UI", [float]7, [System.Drawing.FontStyle]::Regular)
$descBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(160, 175, 180))
$gSidebar.DrawString("Premium Ses Deneyimi", $descFont, $descBrush, [float]82, [float]230, $format)

$descBrush.Dispose()
$descFont.Dispose()
$greenBrush.Dispose()
$subFont.Dispose()
$textBrush.Dispose()
$titleFont.Dispose()
$format.Dispose()
$gSidebar.Dispose()

$sidebarBmp.Save($sidebarPath, [System.Drawing.Imaging.ImageFormat]::Bmp)
$sidebarBmp.Dispose()
$iconImg.Dispose()

Write-Output "installerSidebar.bmp olusturuldu (164x314)"
