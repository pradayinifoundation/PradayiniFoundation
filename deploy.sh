#!/bin/zsh
set -euo pipefail

if [ $# -gt 0 ]; then
  MESSAGE="$*"
else
  echo -n "Commit message: "
  read -r MESSAGE
  [ -z "$MESSAGE" ] && MESSAGE="Website update"
fi

git add .
if git diff --cached --quiet; then
  echo "No staged changes to commit."
  exit 0
fi

git commit -m "$MESSAGE"
git pull --rebase origin main
git push origin main
echo "Done. Netlify auto-deploy should start."
