# Agent Rules

1. **Strict Skill Usage**: For any bug, unexpected behavior, or troubleshooting request, the agent MUST explicitly invoke and follow the `systematic-debugging` skill before taking any action. 
2. **Proactive Skill Check**: Before starting any task, the agent must quickly scan its available skills and use any that are highly relevant (e.g., `fixing-accessibility`, `modern-web-guidance`, `test-driven-development`).
3. **Design Skills Exclusion**: For the time being, do NOT proactively trigger or use any design-focused skills (such as `design-taste-frontend`, `high-end-visual-design`, `baseline-ui`, `minimalist-ui`, `industrial-brutalist-ui`, `stitch-design-taste`, `brandkit`, `imagegen-*`) unless explicitly requested by the user.
