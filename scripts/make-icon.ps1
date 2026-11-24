# Outlaw County - regenerates the pixel-art game icon (PNG + multi-size ICO).
# Usage (Windows PowerShell):  powershell -ExecutionPolicy Bypass -File scripts/make-icon.ps1
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$assets = Join-Path $root 'assets'
$buildDir = Join-Path $root 'build'
New-Item -ItemType Directory -Force $assets, $buildDir | Out-Null

function C($hex) { return [System.Drawing.ColorTranslator]::FromHtml($hex) }

# ---- 32x32 pixel-art master ----
$base = New-Object System.Drawing.Bitmap 32, 32
$g = [System.Drawing.Graphics]::FromImage($base)
$g.SmoothingMode = 'None'
$g.Clear([System.Drawing.Color]::Transparent)

# rounded dark-wood tile
$wood = New-Object System.Drawing.SolidBrush (C '#2a1a0e')
$g.FillRectangle($wood, 2, 1, 28, 30); $g.FillRectangle($wood, 1, 2, 30, 28)
$plank = New-Object System.Drawing.SolidBrush (C '#3a2414')
for ($y = 4; $y -lt 30; $y += 5) { $g.FillRectangle($plank, 2, $y, 28, 2) }
$rim = New-Object System.Drawing.Pen (C '#a8742a'), 1
$g.DrawRectangle($rim, 1, 1, 29, 29)

# sheriff star with ball tips
$cx = 16.0; $cy = 16.5; $ro = 12.5; $ri = 5.6
$pts = New-Object 'System.Drawing.PointF[]' 10
for ($i = 0; $i -lt 10; $i++) {
  $a = -[Math]::PI / 2 + $i * [Math]::PI / 5
  $r = if ($i % 2 -eq 0) { $ro } else { $ri }
  $pts[$i] = New-Object System.Drawing.PointF ([float]($cx + [Math]::Cos($a) * $r)), ([float]($cy + [Math]::Sin($a) * $r))
}
$g.FillPolygon((New-Object System.Drawing.SolidBrush (C '#e3b54f')), $pts)
$g.DrawPolygon((New-Object System.Drawing.Pen (C '#5a3410'), 1), $pts)
$tip = New-Object System.Drawing.SolidBrush (C '#f6d98a')
for ($i = 0; $i -lt 10; $i += 2) { $g.FillRectangle($tip, [int]$pts[$i].X - 1, [int]$pts[$i].Y - 1, 2, 2) }
# center seal
$g.FillEllipse((New-Object System.Drawing.SolidBrush (C '#8e2414')), 12, 12, 9, 9)
$g.FillRectangle((New-Object System.Drawing.SolidBrush (C '#f6d98a')), 15, 14, 3, 1)
$g.FillRectangle((New-Object System.Drawing.SolidBrush (C '#f6d98a')), 15, 16, 3, 1)
$g.FillRectangle((New-Object System.Drawing.SolidBrush (C '#f6d98a')), 15, 18, 3, 1)
# bullet hole
$g.FillRectangle((New-Object System.Drawing.SolidBrush (C '#120806')), 22, 7, 2, 2)
$g.Dispose()

function Scale($src, $size, $nearest) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $gg = [System.Drawing.Graphics]::FromImage($bmp)
  if ($nearest) { $gg.InterpolationMode = 'NearestNeighbor'; $gg.PixelOffsetMode = 'Half' } else { $gg.InterpolationMode = 'HighQualityBicubic' }
  $gg.DrawImage($src, 0, 0, $size, $size); $gg.Dispose()
  return $bmp
}

$big = Scale $base 256 $true
$big.Save((Join-Path $assets 'icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$big.Save((Join-Path $buildDir 'icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)

# ---- multi-size ICO (PNG-compressed entries) ----
$sizes = @(16, 32, 48, 64, 128, 256)
$blobs = @()
foreach ($s in $sizes) {
  $bm = if ($s % 32 -eq 0) { Scale $base $s $true } else { Scale $base $s $false }
  $ms = New-Object System.IO.MemoryStream
  $bm.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $blobs += , $ms.ToArray()
}
$out = New-Object System.IO.MemoryStream
$w = New-Object System.IO.BinaryWriter $out
$w.Write([UInt16]0); $w.Write([UInt16]1); $w.Write([UInt16]$sizes.Count)
$offset = 6 + 16 * $sizes.Count
for ($i = 0; $i -lt $sizes.Count; $i++) {
  $s = $sizes[$i]; $len = $blobs[$i].Length
  $dim = if ($s -ge 256) { 0 } else { $s }
  $w.Write([Byte]$dim); $w.Write([Byte]$dim); $w.Write([Byte]0); $w.Write([Byte]0)
  $w.Write([UInt16]1); $w.Write([UInt16]32); $w.Write([UInt32]$len); $w.Write([UInt32]$offset)
  $offset += $len
}
foreach ($b in $blobs) { $w.Write($b) }
$w.Flush()
[System.IO.File]::WriteAllBytes((Join-Path $assets 'icon.ico'), $out.ToArray())
[System.IO.File]::WriteAllBytes((Join-Path $buildDir 'icon.ico'), $out.ToArray())
Write-Output "Icon written to assets/ and build/"
