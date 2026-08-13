import re

with open('src/components/GlobalPlayer.tsx', 'r') as f:
    content = f.read()

# Extract blocks
similar_block_regex = r'(?s)({\/\* 2\. Find Similar Tracks \*\/\}.*?)(?={\/\* 3\. Toggle Preview \*\/})'
preview_block_regex = r'(?s)({\/\* 3\. Toggle Preview \*\/\}.*?)(?={\/\* 4\. Download and License \*\/})'
volume_block_regex = r'(?s)({\/\* 1\. Volume Controls \*\/\}.*?)(?={\/\* 2\. Find Similar Tracks \*\/})'
download_block_regex = r'(?s)({\/\* 4\. Download and License \*\/\}.*?)(?=<\/div>\s*<\/div>\s*{\/\* Expanded Similar)'

similar_block = re.search(similar_block_regex, content).group(1)
preview_block = re.search(preview_block_regex, content).group(1)
volume_block = re.search(volume_block_regex, content).group(1)
download_block = re.search(download_block_regex, content).group(1)

# Remove these blocks from their original position inside the right-side flex container
right_side_container_regex = r'(?s)<div className="shrink-0 flex items-center gap-4 ml-4">.*?{\/\* 4\. Download and License \*\/\}.*?(?=<\/div>\s*<\/div>\s*{\/\* Expanded Similar)'

def replace_right_side(match):
    return f'<div className="shrink-0 flex items-center gap-4 ml-4">\n        {download_block}'

content = re.sub(right_side_container_regex, replace_right_side, content)

# Insert Similar & Preview BEFORE track controls
track_controls_regex = r'(<div className="flex items-center gap-4 shrink-0">)'
content = re.sub(track_controls_regex, f'{similar_block}\n      {preview_block}\n      \\1', content, count=1)

# Insert Volume AFTER TrackActionButtons
track_action_regex = r'(<TrackActionButtons trackId={currentTrack\.id} \/>\n\s*<\/div>\n\s*)})'
content = re.sub(track_action_regex, f'\\1\n        {volume_block}', content, count=1)

with open('src/components/GlobalPlayer.tsx', 'w') as f:
    f.write(content)
