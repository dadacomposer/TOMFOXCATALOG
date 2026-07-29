import re

with open("src/components/admin/AdminUploadModal.tsx", "r") as f:
    content = f.read()

# We need to change StagedTrack type
content = re.sub(
    r"status: 'pending' \| 'processing' \| 'done' \| 'error';",
    r"status: 'pending' | 'uploading_r2' | 'tagging' | 'done' | 'error';",
    content
)

# ... actually writing a Python regex script for a 500 line React component is very error-prone.
# Better to use multi_replace_file_content or write the whole file.
