#!/bin/bash

# Git Sentinel - Auto-commit daemon for Mimicry Protocol
# Monitors for changes every 20 seconds and commits with detailed messages

REPO_DIR="/Users/arshdeepsingh/Developer/mimicry-protocol"
CHECK_INTERVAL=20
LOG_FILE="$REPO_DIR/.agent/sentinel.log"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Ensure we're in the right directory
cd "$REPO_DIR" || exit 1

# Create log file if it doesn't exist
touch "$LOG_FILE"

log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${CYAN}[$timestamp]${NC} $1"
    echo "[$timestamp] $1" >> "$LOG_FILE"
}

generate_commit_message() {
    local staged_files=$(git diff --cached --name-only)
    local file_count=$(echo "$staged_files" | grep -c '^')
    
    # Categorize changes
    local added_files=$(git diff --cached --name-only --diff-filter=A)
    local modified_files=$(git diff --cached --name-only --diff-filter=M)
    local deleted_files=$(git diff --cached --name-only --diff-filter=D)
    
    local added_count=$(echo "$added_files" | grep -c '^' 2>/dev/null || echo 0)
    local modified_count=$(echo "$modified_files" | grep -c '^' 2>/dev/null || echo 0)
    local deleted_count=$(echo "$deleted_files" | grep -c '^' 2>/dev/null || echo 0)
    
    # Determine the primary type of change
    local commit_type="chore"
    local scope=""
    local description=""
    
    # Analyze file patterns for smarter commit messages
    if echo "$staged_files" | grep -q "\.tsx\|\.ts"; then
        if echo "$staged_files" | grep -q "components"; then
            commit_type="feat"
            scope="components"
        elif echo "$staged_files" | grep -q "hooks"; then
            commit_type="feat"
            scope="hooks"
        elif echo "$staged_files" | grep -q "page\.tsx\|layout\.tsx"; then
            commit_type="feat"
            scope="pages"
        else
            commit_type="feat"
            scope="frontend"
        fi
    fi
    
    if echo "$staged_files" | grep -q "\.py"; then
        commit_type="feat"
        scope="backend"
    fi
    
    if echo "$staged_files" | grep -q "\.css\|\.scss"; then
        commit_type="style"
        scope="styles"
    fi
    
    if echo "$staged_files" | grep -q "\.md"; then
        commit_type="docs"
        scope="docs"
    fi
    
    if echo "$staged_files" | grep -q "package\.json\|requirements\.txt\|\.lock"; then
        commit_type="chore"
        scope="deps"
    fi
    
    if echo "$staged_files" | grep -q "\.sh\|\.agent\|\.config"; then
        commit_type="chore"
        scope="config"
    fi
    
    if echo "$staged_files" | grep -q "test\|spec"; then
        commit_type="test"
        scope="tests"
    fi
    
    # Build description based on changes
    local details=""
    
    if [ "$added_count" -gt 0 ] && [ -n "$added_files" ]; then
        local first_added=$(echo "$added_files" | head -1 | xargs basename 2>/dev/null)
        if [ "$added_count" -eq 1 ]; then
            details="add $first_added"
        else
            details="add $first_added and $((added_count - 1)) more files"
        fi
    elif [ "$modified_count" -gt 0 ] && [ -n "$modified_files" ]; then
        local first_modified=$(echo "$modified_files" | head -1 | xargs basename 2>/dev/null)
        if [ "$modified_count" -eq 1 ]; then
            details="update $first_modified"
        else
            details="update $first_modified and $((modified_count - 1)) more files"
        fi
    elif [ "$deleted_count" -gt 0 ] && [ -n "$deleted_files" ]; then
        local first_deleted=$(echo "$deleted_files" | head -1 | xargs basename 2>/dev/null)
        if [ "$deleted_count" -eq 1 ]; then
            details="remove $first_deleted"
        else
            details="remove $first_deleted and $((deleted_count - 1)) more files"
        fi
    else
        details="update project files"
    fi
    
    # Construct final message
    if [ -n "$scope" ]; then
        echo "${commit_type}(${scope}): ${details}"
    else
        echo "${commit_type}: ${details}"
    fi
}

generate_commit_body() {
    local staged_files=$(git diff --cached --name-only)
    local body="Auto-committed by Git Sentinel\n\nFiles changed:\n"
    
    while IFS= read -r file; do
        if [ -n "$file" ]; then
            local status=$(git diff --cached --name-status "$file" 2>/dev/null | cut -f1)
            case "$status" in
                A) body+="  + $file (added)\n" ;;
                M) body+="  ~ $file (modified)\n" ;;
                D) body+="  - $file (deleted)\n" ;;
                *) body+="  * $file\n" ;;
            esac
        fi
    done <<< "$staged_files"
    
    echo -e "$body"
}

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}       ${YELLOW}🛡️  GIT SENTINEL ACTIVATED  🛡️${NC}              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}       ${BLUE}Monitoring: ${NC}mimicry-protocol              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}       ${BLUE}Interval:${NC} ${CHECK_INTERVAL}s                              ${GREEN}║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════╝${NC}"
echo ""

log "🚀 Git Sentinel started - watching for changes every ${CHECK_INTERVAL}s"

while true; do
    # Check for any changes (staged, unstaged, or untracked), excluding sentinel.log
    if [ -n "$(git status --porcelain | grep -v 'sentinel.log')" ]; then
        log "${YELLOW}📝 Changes detected!${NC}"
        
        # Stage all changes EXCEPT sentinel.log
        git add -A -- ':!.agent/sentinel.log' ':!*sentinel.log'
        
        # Generate commit message
        commit_msg=$(generate_commit_message)
        commit_body=$(generate_commit_body)
        
        # Show what we're committing
        log "${BLUE}Staged files:${NC}"
        git diff --cached --stat | while read line; do
            echo -e "   ${CYAN}$line${NC}"
        done
        
        # Commit with detailed message
        if git commit -m "$commit_msg" -m "$commit_body" 2>/dev/null; then
            log "${GREEN}✅ Committed: ${NC}$commit_msg"
        else
            log "${RED}❌ Commit failed (maybe no changes to commit)${NC}"
        fi
    else
        # Silent when no changes (just show a dot for heartbeat)
        echo -ne "${BLUE}.${NC}"
    fi
    
    sleep $CHECK_INTERVAL
done
