from pathlib import Path
from PIL import Image
from math import sin,pi
src=Path(__file__).resolve().parent/'source/nitrous-flame-atlas-generated-v1.webp'
root=Path(__file__).resolve().parents[2]
out=root/'qa-artifacts/race-cinematic-effects/blender-bakeoff'
runtime=root/'src/assets/effects/race/v1'
runtime.mkdir(parents=True,exist_ok=True)
raw=Image.open(src).convert('RGBA')
source_rects=[(28,174,300,301),(435,128,840,346),(870,100,1324,357),(1328,82,1773,375),(18,534,478,795),(486,546,920,799),(938,568,1327,772),(1350,561,1740,773)]
rects=[tuple(round(value*(raw.width/1774 if index%2==0 else raw.height/887)) for index,value in enumerate(box)) for box in source_rects]
cell=(256,128);atlas=Image.new('RGBA',(1024,256))
for i,box in enumerate(rects):
    crop=raw.crop(box)
    # Dismiss faint cross-cell bleed and feather the hard crop edge.
    pix=crop.load();w,h=crop.size
    for y in range(h):
      for x in range(w):
        r,g,b,a=pix[x,y]
        if a<12:a=0
        edge=min(x,w-1-x,y,h-1-y)
        if edge<12:a=round(a*edge/12)
        pix[x,y]=(r,g,b,a)
    ratio=min((cell[0]-8)/w,(cell[1]-8)/h)
    resized=crop.resize((round(w*ratio),round(h*ratio)),Image.Resampling.LANCZOS)
    x0=(cell[0]-resized.width)//2;y0=(cell[1]-resized.height)//2
    tile=Image.new('RGBA',cell);tile.alpha_composite(resized,(x0,y0))
    atlas.alpha_composite(tile,((i%4)*cell[0],(i//4)*cell[1]))
    tile.save(out/f'flame-frame-{i}.png',optimize=True)
atlas.save(out/'nitrous-flame-candidate-1024x256.png',optimize=True)
atlas.save(runtime/'nitrous-flame-atlas.webp','WEBP',quality=75,method=6,exact=True)
print(runtime/'nitrous-flame-atlas.webp',(runtime/'nitrous-flame-atlas.webp').stat().st_size)
