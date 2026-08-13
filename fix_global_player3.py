with open('src/components/GlobalPlayer.tsx', 'r') as f:
    content = f.read()

# Extract blocks again
similar_block_regex = r'(?s)({\/\* 2\. Find Similar Tracks \*\/\}.*?)(?={\/\* 3\. Toggle Preview \*\/})'
preview_block_regex = r'(?s)({\/\* 3\. Toggle Preview \*\/\}.*?)(?=<div className="flex items-center gap-4 shrink-0">)'

# We need to find them exactly as they are now. They are currently right BEFORE track controls
import re
similar_match = re.search(similar_block_regex, content)
preview_match = re.search(preview_block_regex, content)

if similar_match and preview_match:
    similar_block = similar_match.group(1)
    preview_block = preview_match.group(1)
    
    # Remove them from their current position
    content = content.replace(similar_block, '')
    content = content.replace(preview_block, '')
    
    # We want to insert them AFTER the track controls, BEFORE the waveform view
    # Track controls block ends right before <div className="flex-grow flex items-center">
    target_point_str = '<div className="flex-grow flex items-center">'
    
    idx_target = content.find(target_point_str)
    if idx_target != -1:
        # We need to insert it inside the flex-grow container, before the waveform
        waveform_str = '<div className="flex-grow mx-8 h-8 flex items-center">'
        idx_waveform = content.find(waveform_str, idx_target)
        if idx_waveform != -1:
            content = content[:idx_waveform] + similar_block + '      ' + preview_block + '      ' + content[idx_waveform:]
    
    with open('src/components/GlobalPlayer.tsx', 'w') as f:
        f.write(content)
    print("Reordered again.")
else:
    print("Could not find blocks")
