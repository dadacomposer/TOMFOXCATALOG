const fs = require('fs');
let file = 'src/pages/Browse.tsx';
let content = fs.readFileSync(file, 'utf8');

const trackListStart = 'displayedTracks.map((track) => (';
const trackListEndMarker = '})()}'; // end of tags logic
// Wait, the trackList ends at the end of the map. Let's find the closing brace.
// Instead of complex regex, I can replace the start and end of the map block.

const replaceStart = `displayedTracks.map((track) => (`;
const replaceWithStart = `React.useMemo(() => displayedTracks.map((track) => (`;

const replaceEndStr = `                  </div>
                </div>
              ))
            )}
              </div>
            </div>`;

// I need to be very precise.
// Let's use string manipulation.
const startIndex = content.indexOf(replaceStart);
if (startIndex !== -1) {
  // Find the end of the map function.
  // The structure is:
  // displayedTracks.map((track) => (
  //   <React.Fragment key={track.id}>
  //      ...
  //   </React.Fragment>
  // ))
  // ) : (
  
  const endFragment = `</React.Fragment>\n              ))`;
  const endIndex = content.indexOf(endFragment, startIndex);
  
  if (endIndex !== -1) {
    const before = content.substring(0, startIndex);
    const middle = content.substring(startIndex, endIndex + endFragment.length);
    const after = content.substring(endIndex + endFragment.length);
    
    const newMiddle = middle.replace('displayedTracks.map((track) => (', 'React.useMemo(() => displayedTracks.map((track) => (') + 
    `), [
      displayedTracks, 
      selectedTrackIds, 
      currentTrack, 
      isPlaying, 
      trendingTrackIds, 
      expandedTrackId, 
      expandedTags, 
      profile, 
      isPreviewMode, 
      progress
    ])`;
    
    content = before + newMiddle + after;
    fs.writeFileSync(file, content);
    console.log("useMemo applied!");
  } else {
    console.log("Could not find end of track list map");
  }
} else {
  console.log("Could not find start of track list map");
}
