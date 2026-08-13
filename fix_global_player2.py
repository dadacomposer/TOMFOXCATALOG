with open('src/components/GlobalPlayer.tsx', 'r') as f:
    content = f.read()

# Locate the blocks
idx_vol_start = content.find('{/* 1. Volume Controls */}')
idx_sim_start = content.find('{/* 2. Find Similar Tracks */}')
idx_prev_start = content.find('{/* 3. Toggle Preview */}')
idx_dl_start = content.find('{/* 4. Download and License */}')

if idx_vol_start != -1 and idx_sim_start != -1 and idx_prev_start != -1 and idx_dl_start != -1:
    volume_block = content[idx_vol_start:idx_sim_start]
    similar_block = content[idx_sim_start:idx_prev_start]
    preview_block = content[idx_prev_start:idx_dl_start]
    
    # Remove these blocks from their original location
    # They are located inside: <div className="shrink-0 flex items-center gap-4 ml-4">
    # We remove them by replacing them with empty string
    content = content[:idx_vol_start] + content[idx_dl_start:]
    
    # Now insert similar_block and preview_block BEFORE track controls
    # Track controls start at: <div className="flex items-center gap-4 shrink-0">
    # We find the first occurrence of this string.
    track_ctrl_str = '<div className="flex items-center gap-4 shrink-0">'
    idx_track_ctrl = content.find(track_ctrl_str)
    if idx_track_ctrl != -1:
        content = content[:idx_track_ctrl] + similar_block + preview_block + content[idx_track_ctrl:]
        
    # Now insert volume_block AFTER TrackActionButtons
    # Find: <TrackActionButtons trackId={currentTrack.id} />
    #             </div>
    #           )}
    # And insert right after it.
    track_action_str = '<TrackActionButtons trackId={currentTrack.id} />\n          </div>\n        )}'
    idx_track_action = content.find(track_action_str)
    if idx_track_action != -1:
        insert_idx = idx_track_action + len(track_action_str)
        content = content[:insert_idx] + '\n        ' + volume_block + content[insert_idx:]
    
    with open('src/components/GlobalPlayer.tsx', 'w') as f:
        f.write(content)
    print("Successfully updated GlobalPlayer.tsx")
else:
    print("Could not find one of the blocks")
