# Read the source PNG without changing it; generate SVG clip geometry around
# the opaque animal outlines, excluding the connected gray backdrop.
Add-Type -AssemblyName System.Drawing
$items = @()
$eyeBoxes = @{
  'cat-legacy-sleep'=@(@(918,344,27,17),@(968,343,30,18))
  'sauropod-legacy-sleep'=,@(122,666,36,30)
  'trex-legacy-sleep'=,@(524,647,39,20)
  'triceratops-legacy-sleep'=,@(937,678,37,22)
  'fox-legacy-sleep'=,@(163,1033,42,18)
  'duck-legacy-sleep'=,@(547,1014,38,30)
  'elephant-legacy-sleep'=,@(938,1023,42,22)
  'sauropod-sleep'=,@(184,278,24,16)
  'trex-sleep'=,@(544,313,25,14)
  'triceratops-sleep'=,@(925,370,25,15)
  'fox-sleep'=,@(157,680,25,15)
  'duck-sleep'=,@(551,648,23,14)
  'elephant-sleep'=,@(925,690,26,15)
  'cat-sleep'=,@(181,1026,28,16)
}
foreach ($sheet in @('animal-atlas.png','animal-redraw-atlas.png','adult-favicon-atlas.png','adult-sleep-atlas.png')) {
$sourceBitmap = [System.Drawing.Bitmap]::new((Join-Path $PSScriptRoot "../extension/assets/$sheet"))
$regions = @(
  @('sauropod',38,267,242,253,135),
  @('trex',364,311,225,202,355),
  @('duck',701,378,138,147,205),
  @('fox',958,337,250,189,25),
  @('triceratops',27,798,282,176,240),
  @('elephant',363,779,228,187,240),
  @('cat',679,839,183,123,0)
)
if ($sheet -eq 'animal-redraw-atlas.png') {
  $regions = @(
    @('sauropod-redraw',65,115,330,305,120),
    @('triceratops-redraw',432,148,374,274,240),
    @('cat-legacy-sleep',884,242,283,178,0),
    @('sauropod-legacy-sleep',63,558,315,204,120),
    @('trex-legacy-sleep',440,565,363,203,0),
    @('triceratops-legacy-sleep',850,529,347,233,240),
    @('fox-legacy-sleep',69,877,318,265,30),
    @('duck-legacy-sleep',477,954,269,179,60),
    @('elephant-legacy-sleep',837,901,361,233,240)
  )
}
if ($sheet -eq 'adult-favicon-atlas.png') {
  $regions = @(
    @('sauropod-adult',45,110,390,380,135),
    @('trex-adult',440,190,380,305,355),
    @('triceratops-adult',830,235,390,265,240),
    @('fox-adult',55,545,370,285,25),
    @('duck-adult',500,600,245,225,205),
    @('elephant-adult',820,580,400,260,240),
    @('cat-adult',55,900,350,255,0)
  )
}
if ($sheet -eq 'adult-sleep-atlas.png') {
  $regions = @(
    @('sauropod-sleep',45,195,355,255,135),
    @('trex-sleep',430,235,350,215,355),
    @('triceratops-sleep',810,205,400,235,240),
    @('fox-sleep',45,490,350,295,25),
    @('duck-sleep',475,565,270,220,205),
    @('elephant-sleep',800,560,420,230,240),
    @('cat-sleep',70,925,315,230,0)
  )
}
$isAdultSheet = $sheet -eq 'adult-favicon-atlas.png'
foreach ($region in $regions) {
  $name=$region[0]; $left=[int]$region[1]; $top=[int]$region[2]; $width=[int]$region[3]; $height=[int]$region[4]
  $background = [bool[]]::new($width*$height)
  $visited = [bool[]]::new($width*$height)
  $queue = [System.Collections.Generic.Queue[int]]::new()
  for ($y=0; $y -lt $height; $y++) {
    for ($x=0; $x -lt $width; $x++) {
      $pixel=$sourceBitmap.GetPixel($left+$x,$top+$y)
      $high=[Math]::Max($pixel.R,[Math]::Max($pixel.G,$pixel.B)); $low=[Math]::Min($pixel.R,[Math]::Min($pixel.G,$pixel.B))
      $index=$y*$width+$x
      $background[$index]=if($isAdultSheet){$high -lt 115}else{($high-$low -lt 36 -and $low -gt 77 -and $high -lt 239)}
      if (($x -eq 0 -or $y -eq 0 -or $x -eq $width-1 -or $y -eq $height-1) -and $background[$index]) { $queue.Enqueue($index);$visited[$index]=$true }
    }
  }
  while ($queue.Count -gt 0) {
    $index=$queue.Dequeue();$x=$index%$width;$y=[int][Math]::Floor($index/$width)
    $neighbors=@()
    if($x -gt 0){$neighbors+=($index-1)};if($x -lt $width-1){$neighbors+=($index+1)}
    if($y -gt 0){$neighbors+=($index-$width)};if($y -lt $height-1){$neighbors+=($index+$width)}
    foreach($next in $neighbors){if(-not $visited[$next] -and $background[$next]){$visited[$next]=$true;$queue.Enqueue($next)}}
  }
  if($isAdultSheet) {
    # The dark green backdrop and the ink outline both count as dark. Grow the
    # bright body mask by the outline width so the outline remains in the clip.
    $foreground=[bool[]]::new($width*$height)
    for($i=0;$i -lt $foreground.Length;$i++){$foreground[$i]=(-not $visited[$i])}
    for($y=0;$y -lt $height;$y++){
      for($x=0;$x -lt $width;$x++){
        if(-not $foreground[$y*$width+$x]){continue}
        for($oy=-7;$oy -le 7;$oy++){
          for($ox=-7;$ox -le 7;$ox++){
            $nx=$x+$ox;$ny=$y+$oy
            if($nx -ge 0 -and $nx -lt $width -and $ny -ge 0 -and $ny -lt $height){$visited[$ny*$width+$nx]=$false}
          }
        }
      }
    }
  }
  $path=[System.Text.StringBuilder]::new()
  for($y=0;$y -lt $height;$y++){
    $x=0
    while($x -lt $width){
      if($visited[$y*$width+$x]){$x++;continue}
      $start=$x
      while($x -lt $width -and -not $visited[$y*$width+$x]){$x++}
      [void]$path.Append("M${start} ${y}h$($x-$start)v1H${start}Z")
    }
  }
  $eyePath=[System.Text.StringBuilder]::new()
  foreach($box in $eyeBoxes[$name]) {
    for($ey=$box[1];$ey -lt $box[1]+$box[3];$ey++) {
      for($ex=$box[0];$ex -lt $box[0]+$box[2];$ex++) {
        $pixel=$sourceBitmap.GetPixel($ex,$ey)
        if([Math]::Max($pixel.R,[Math]::Max($pixel.G,$pixel.B)) -lt 65) {
          [void]$eyePath.Append("M$($ex-$left) $($ey-$top)h1v1h-1Z")
        }
      }
    }
  }
  $items+=@{id=$name;x=$left;y=$top;width=$width;height=$height;hue=$region[5];clip=$path.ToString();source="assets/$sheet";drawn=($sheet -ne 'animal-atlas.png');eyeClip=$eyePath.ToString()}
}
$sourceBitmap.Dispose()
}
$json=ConvertTo-Json -InputObject $items -Compress
[System.IO.File]::WriteAllText((Join-Path $PSScriptRoot '../extension/atlas-clips.js'),"const atlasClips = $json;",[System.Text.UTF8Encoding]::new($false))
