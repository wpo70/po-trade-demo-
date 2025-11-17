#!/bin/bash

# Set the following parameters before running

pm2Name="potrade"

# End setup params

rootDir=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

tag=""
branch=""
noFlags=false

validate() {
    if [ -z "$1" ] || [[ "$1" == -* ]]; then
        echo "Invalid flag and value combination provided."
        exit 1
    fi
}

handleFlags() {
    if [ "$#" -eq 0 ]; then
        noFlags=true
    else
        while [[ "$#" -gt 0 ]]; do
            key="$1"
            case $key in
                -t | --tag)
                    validate "$2"
                    tag="$2"
                    shift
                    shift
                    ;;
                -b | --branch)
                    validate "$2"
                    branch="$2"
                    shift
                    shift
                    ;;
                *) # unknown option/flag
                    printf "Please specify '-t' followed by the tag name or '-b' followed by the branch name.\nAlternatively, do not specify any flags and the deployment process will reload the most up to date version of the current tag/branch.\n\n"
                    exit 1
            esac
        done
    fi
}

cd $rootDir

handleFlags "$@"

git fetch
if [ "$noFlags" == true ]; then
    if ! git diff-index --quiet HEAD --; then
        git stash save --keep-index --include-untracked
        git pull
        git stash pop | grep -q "Changes not staged for commit:" || {
            echo "Merge conflict detected. Please resolve it manually."
            exit 1
        }
    else
        git pull
    fi
else
    git reset --head
    if [ -n "$tag" ]; then
        git checkout tags/$tag
    else if [ -n "$branch" ]; then
        git switch $branch
    fi
    git pull
    npm install
fi

npm run build

pm2 restart $pm2Name

chmod u+x deploy.sh