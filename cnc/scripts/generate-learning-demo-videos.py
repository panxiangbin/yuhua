#!/usr/bin/env python3
"""Generate 12 tiny, deterministic CNC teaching MP4 demos for the mobile learning site."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math, shutil, subprocess, tempfile

W,H,FPS,DURATION=320,180,10,6
FRAMES=FPS*DURATION
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'cnc'/'assets'/'videos'/'learning'
OUT.mkdir(parents=True,exist_ok=True)
NAMES=[
'stage01_safety.mp4','stage02_xyz.mp4','stage03_z_tool.mp4','stage04_program.mp4',
'stage05_g90_g91.mp4','stage06_g00_g01.mp4','stage07_sf.mp4','stage08_g02_g03.mp4',
'stage09_milling_direction.mp4','stage10_g41_g42.mp4','stage11_g81_g83.mp4','stage12_first_part.mp4']

def font(size,bold=False):
    paths=['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']
    for p in paths:
        try:return ImageFont.truetype(p,size)
        except OSError:pass
    return ImageFont.load_default()
F16,F18,F20,F22=font(16,True),font(18,True),font(20,True),font(22,True)
BG='#eef3f7'; PANEL='#ffffff'; INK='#243b53'; BLUE='#176fe5'; RED='#d94f45'; GREEN='#3f9363'; GOLD='#d99a31'; LINE='#aebdca'; DARK='#506779'

def base(title):
    im=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(im)
    d.rounded_rectangle((12,12,W-12,H-12),14,fill=PANEL,outline='#c7d2dc',width=2)
    d.text((20,20),title,font=F16,fill=INK)
    return im,d

def arrow(d,a,b,color,width=5):
    d.line((a,b),fill=color,width=width)
    x1,y1=a;x2,y2=b;ang=math.atan2(y2-y1,x2-x1);L=11
    pts=[(x2,y2),(x2+L*math.cos(ang+2.55),y2+L*math.sin(ang+2.55)),(x2+L*math.cos(ang-2.55),y2+L*math.sin(ang-2.55))]
    d.polygon(pts,fill=color)

def lerp(a,b,t):return a+(b-a)*max(0,min(1,t))
def ping(t):return 1-abs((t%2)-1)

def frame(stage,i):
    t=i/(FRAMES-1);phase=t*2
    titles=['SAFE START','XYZ AXES','Z TOOL TOUCH','PROGRAM FLOW','G90 / G91','G00 / G01','S / F','G02 / G03','MILLING DIR','G41 / G42','G81 / G83','FIRST PART']
    im,d=base(titles[stage-1])
    if stage==1:
        labels=['E-STOP','DOOR','LOW FEED'];xs=[32,121,210];active=min(2,int(t*3))
        for j,(x,lbl) in enumerate(zip(xs,labels)):
            fill=['#e5edf4','#ffd273','#9fd8b2'][j] if j<=active else '#e5edf4'
            d.rounded_rectangle((x,72,x+76,124),10,fill=fill,outline=LINE,width=2);d.text((x+8,91),lbl,font=font(11,True),fill=INK)
        d.text((38,142),'CHECK -> CONFIRM -> MOVE',font=font(13,True),fill=DARK)
    elif stage==2:
        o=(160,126);d.ellipse((148,114,172,138),fill=INK)
        arrow(d,o,(270,126),RED);arrow(d,o,(82,78),GREEN);arrow(d,o,(160,52),BLUE)
        d.text((275,116),'X',font=F20,fill=RED);d.text((62,57),'Y',font=F20,fill=GREEN);d.text((169,45),'Z',font=F20,fill=BLUE)
        p=[(lerp(160,270,ping(phase)),126),(lerp(160,82,ping(phase)),lerp(126,78,ping(phase))),(160,lerp(126,52,ping(phase)))][min(2,int(t*3))]
        d.ellipse((p[0]-7,p[1]-7,p[0]+7,p[1]+7),fill='#ffb347')
    elif stage==3:
        d.rectangle((139,50,181,84),fill=DARK);d.rectangle((153,82,167,122),fill=INK)
        y=int(lerp(0,30,ping(phase)));d.rectangle((153,82+y,167,122+y),fill=INK)
        d.rectangle((70,145,250,157),fill='#9bacb9');d.line((54,136,266,136),fill=GOLD,width=3)
        d.text((82,115),'SAFE GAP',font=font(13,True),fill=GOLD);d.text((185,95),'Z-',font=F18,fill=BLUE)
    elif stage==4:
        lines=['T1 M06','G54 G90','S1200 M03','G01 X.. F..','M30'];ys=[54,75,96,117,138];active=min(4,int(t*5))
        d.rounded_rectangle((54,ys[active]-3,266,ys[active]+19),5,fill='#ffe5a4')
        for s,y in zip(lines,ys):d.text((70,y),s,font=font(15,True),fill=INK)
    elif stage==5:
        d.line((42,135,42,62),fill=LINE,width=2);d.line((42,135,135,135),fill=LINE,width=2)
        pts=[(42,135),(105,76),(153,119),(220,66)];d.line(pts,fill=BLUE,width=4)
        k=(t*(len(pts)-1));idx=min(len(pts)-2,int(k));u=k-idx;x=int(lerp(pts[idx][0],pts[idx+1][0],u));y=int(lerp(pts[idx][1],pts[idx+1][1],u));d.ellipse((x-6,y-6,x+6,y+6),fill=BLUE)
        d.text((38,148),'G90: FIXED ZERO',font=font(12,True),fill=INK);d.text((175,148),'G91: INCREMENT',font=font(12,True),fill=INK)
    elif stage==6:
        d.line((42,138,150,60),fill=DARK,width=4);d.line((150,60,275,132),fill=BLUE,width=5)
        p=(lerp(42,150,min(1,t*2)),lerp(138,60,min(1,t*2))) if t<.5 else (lerp(150,275,(t-.5)*2),lerp(60,132,(t-.5)*2))
        d.ellipse((p[0]-7,p[1]-7,p[0]+7,p[1]+7),fill='#ff9f32');d.text((60,55),'G00 RAPID',font=font(13,True),fill=DARK);d.text((190,105),'G01 FEED',font=font(13,True),fill=BLUE)
    elif stage==7:
        c=(105,103);d.ellipse((70,68,140,138),fill='#dbe5ed',outline=DARK,width=5);a=t*math.tau*4;arrow(d,c,(105+29*math.sin(a),103-29*math.cos(a)),INK,4)
        arrow(d,(172,104),(272,104),BLUE,7);d.text((69,145),'S = SPINDLE',font=font(12,True),fill=INK);d.text((185,126),'F = FEED',font=font(12,True),fill=BLUE)
    elif stage==8:
        box=(70,55,250,155);d.arc(box,180,360,fill=BLUE,width=5);d.arc(box,0,180,fill=RED,width=5);ang=math.pi*(1-t);cx=160+90*math.cos(ang);cy=105-50*math.sin(ang);d.ellipse((cx-6,cy-6,cx+6,cy+6),fill=BLUE);ang2=math.pi*t;cx2=160+90*math.cos(ang2);cy2=105+50*math.sin(ang2);d.ellipse((cx2-6,cy2-6,cx2+6,cy2+6),fill=RED);d.text((70,145),'CW / CCW IN ACTIVE PLANE',font=font(12,True),fill=INK)
    elif stage==9:
        c=(125,105);d.ellipse((87,67,163,143),fill='#dce6ee',outline=DARK,width=5);a=t*math.tau*4;arrow(d,c,(125+30*math.sin(a),105-30*math.cos(a)),INK,4);arrow(d,(184,105),(275,105),BLUE,7);d.text((62,148),'ROTATION + FEED',font=font(14,True),fill=INK)
    elif stage==10:
        d.line((45,103,275,103),fill='#8393a0',width=3);d.line((45,70,275,70),fill=BLUE,width=4);d.line((45,136,275,136),fill=RED,width=4);x=int(lerp(50,270,t));d.ellipse((x-7,63,x+7,77),fill=BLUE);d.ellipse((x-7,129,x+7,143),fill=RED);d.text((52,49),'G41 LEFT',font=F16,fill=BLUE);d.text((52,145),'G42 RIGHT',font=F16,fill=RED);d.text((154,92),'PROGRAM PATH',font=font(10,True),fill=DARK)
    elif stage==11:
        d.rectangle((153,50,167,98),fill=INK);d.rectangle((75,145,245,157),fill='#9bacb9');d.line((60,113,260,113),fill=GOLD,width=3)
        seq=[0,38,16,55,25,62,0];q=t*(len(seq)-1);j=min(len(seq)-2,int(q));y=int(lerp(seq[j],seq[j+1],q-j));d.rectangle((153,50+y,167,98+y),fill=INK);d.text((58,128),'R PLANE',font=font(12,True),fill=GOLD);d.text((181,82),'G81 / G83',font=F18,fill=INK)
    else:
        labels=['DRAW','CLAMP','OFFSET','DRY','CUT','MEASURE'];active=min(5,int(t*6));x=19
        for j,lbl in enumerate(labels):
            fill='#ffd273' if j==active else '#dfe9f1';d.rounded_rectangle((x,76,x+43,119),7,fill=fill,outline=LINE);d.text((x+4,91),lbl,font=font(9,True),fill=INK);x+=48
        d.text((50,142),'FIRST-PART CLOSED LOOP',font=font(14,True),fill=INK)
    return im

def generate(stage,name):
    if shutil.which('ffmpeg') is None: raise SystemExit('ffmpeg missing')
    with tempfile.TemporaryDirectory(prefix=f'cnc-stage{stage:02d}-') as tmp:
        td=Path(tmp)
        for i in range(FRAMES):frame(stage,i).save(td/f'{i:04d}.png',optimize=True)
        cmd=['ffmpeg','-y','-loglevel','error','-framerate',str(FPS),'-i',str(td/'%04d.png'),'-c:v','libx264','-pix_fmt','yuv420p','-crf','36','-preset','veryfast','-movflags','+faststart','-map_metadata','-1','-an',str(OUT/name)]
        subprocess.run(cmd,check=True)

for stage,name in enumerate(NAMES,1):generate(stage,name)
print(f'generated {len(NAMES)} videos in {OUT}')
