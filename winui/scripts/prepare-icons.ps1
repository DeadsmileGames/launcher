$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$assetDir = Join-Path (Split-Path $PSScriptRoot -Parent) 'src/Deadsmile.Launcher/Assets'
$source = [Drawing.Image]::FromFile((Join-Path $assetDir 'LargeTile.png'))
$sizes = @(16,20,24,30,32,36,40,48,60,64,72,80,96,128,256)
$frames = [Collections.Generic.List[byte[]]]::new()
try {
 foreach ($size in $sizes) {
  $bitmap = [Drawing.Bitmap]::new($size, $size, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [Drawing.Graphics]::FromImage($bitmap)
  $graphics.CompositingMode = [Drawing.Drawing2D.CompositingMode]::SourceCopy
  $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.DrawImage($source, [Drawing.Rectangle]::new(0,0,$size,$size))
  $stream = [IO.MemoryStream]::new()
  $bitmap.Save($stream, [Drawing.Imaging.ImageFormat]::Png)
  $bytes = $stream.ToArray(); $frames.Add($bytes)
  foreach ($variant in @('', '_altform-unplated', '_altform-lightunplated')) {
   [IO.File]::WriteAllBytes((Join-Path $assetDir "Square44x44Logo.targetsize-$size$variant.png"), $bytes)
  }
  $stream.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
 }
 $iconStream = [IO.MemoryStream]::new(); $writer = [IO.BinaryWriter]::new($iconStream)
 $writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]$sizes.Count)
 $offset = 6 + 16 * $sizes.Count
 for ($i=0; $i -lt $sizes.Count; $i++) {
  $dimension = if ($sizes[$i] -eq 256) { 0 } else { $sizes[$i] }
  $writer.Write([byte]$dimension); $writer.Write([byte]$dimension); $writer.Write([byte]0); $writer.Write([byte]0)
  $writer.Write([uint16]1); $writer.Write([uint16]32); $writer.Write([uint32]$frames[$i].Length); $writer.Write([uint32]$offset)
  $offset += $frames[$i].Length
 }
 foreach ($frame in $frames) { $writer.Write($frame) }
 [IO.File]::WriteAllBytes((Join-Path $assetDir 'Icon.ico'), $iconStream.ToArray())
 $writer.Dispose(); $iconStream.Dispose()
 Write-Host "Prepared $($sizes.Count) ICO frames and $($sizes.Count * 3) MSIX target-size assets."
}
finally { $source.Dispose() }
