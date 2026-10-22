#!/usr/bin/env python3
"""Compile the eight Race mode/control captures into one review MP4."""
import json
import subprocess
import sys
from pathlib import Path

folder = Path(sys.argv[1] if len(sys.argv) > 1 else 'qa-artifacts/race-modes').resolve()
report = json.loads((folder / 'report.json').read_text())
videos = {item['name']: Path(item['video']) for item in report['cases'] if 'video' in item}
names = [f'{mode}-{control}' for mode in ('drag', 'drift', 'circuit', 'hill') for control in ('classic', 'analog')]
if report['errors'] or report['external'] or any(name not in videos for name in names):
    raise SystemExit('QA report is incomplete or failed')
segments = []
for index, name in enumerate(names):
    target = folder / f'{index:02d}-{name}.mp4'
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', '3.5', '-i', str(videos[name]),
                    '-vf', 'scale=960:720:force_original_aspect_ratio=decrease,pad=960:720:(ow-iw)/2:(oh-ih)/2:black,fps=24,format=yuv420p',
                    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-an', str(target)], check=True)
    segments.append(target)
playlist = folder / 'segments.txt'
playlist.write_text(''.join(f"file '{segment}'\n" for segment in segments))
output = folder / 'race-modes-classic-analog.mp4'
subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(playlist),
                '-c', 'copy', '-movflags', '+faststart', str(output)], check=True)
subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,nb_frames',
                '-show_entries', 'format=duration', '-of', 'json', str(output)], check=True)
print(output)
