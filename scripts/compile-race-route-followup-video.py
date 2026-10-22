#!/usr/bin/env python3
"""Compile the four exact-route QA clips into a review MP4."""
import json
import subprocess
import sys
from pathlib import Path

folder = Path(sys.argv[1] if len(sys.argv) > 1 else 'qa-artifacts/race-route-followup').resolve()
report = json.loads((folder / 'report.json').read_text())
if report['errors'] or report['external']:
    raise SystemExit('QA report failed')
videos = {item['name']: Path(item['video']) for item in report['caseResults'] if 'video' in item}
names = ('drag-classic', 'drag-analog', 'drift-classic', 'drift-analog')
if any(name not in videos for name in names):
    raise SystemExit('QA report lacks a required control and mode clip')
segments = []
for index, name in enumerate(names):
    target = folder / f'{index:02d}-{name}.mp4'
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', '3.5', '-i', str(videos[name]),
                    '-vf', 'scale=960:720:force_original_aspect_ratio=decrease,pad=960:720:(ow-iw)/2:(oh-ih)/2:black,fps=24,format=yuv420p',
                    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-an', str(target)], check=True)
    segments.append(target)
playlist = folder / 'segments.txt'
playlist.write_text(''.join(f"file '{segment}'\n" for segment in segments))
output = folder / 'race-route-followup.mp4'
subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(playlist),
                '-c', 'copy', '-movflags', '+faststart', str(output)], check=True)
subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,nb_frames',
                '-show_entries', 'format=duration', '-of', 'json', str(output)], check=True)
print(output)
