const fs = require('fs');
let file = 'src/pages/Browse.tsx';
let content = fs.readFileSync(file, 'utf8');

const startStr = `{loading || !isInitialTracksLoaded || isTypingSearch || isSearching ? (`;
const replaceStart = `{React.useMemo(() => (
              loading || !isInitialTracksLoaded || isTypingSearch || isSearching ? (`;

const endStr = `            ))
            )}`;
const replaceEnd = `            ))
            )), [loading, isInitialTracksLoaded, isTypingSearch, isSearching, displayedTracks, selectedTrackIds, currentTrack, isPlaying, trendingTrackIds, expandedTrackId, expandedTags, profile, isPreviewMode, progress])}`;

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + replaceStart + content.substring(startIndex + startStr.length, endIndex) + replaceEnd + content.substring(endIndex + endStr.length);
  fs.writeFileSync(file, content);
  console.log("useMemo applied correctly!");
} else {
  console.log("Strings not found.", { startIndex, endIndex });
}
