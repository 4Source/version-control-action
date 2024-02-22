# GitHub version control action
## Usage
```yaml
name: Bump version
on: 
  pull_request:
    types: 
      - closed

jobs:
  versioning:
    runs-on: ubuntu-latest
    steps: 
      - name: Checkout
        id: checkout
        uses: actions/checkout@v4

      - name: Bump version
        uses: 4Source/version-control-action@v1
        with: 
          github_token: ${{ secrets.GITHUB_TOKEN }}
```
## Inputs
- **github_token** (_requiered_) - Required for permission to tag the repo. Usually ``${{ secrets.GITHUB_TOKEN }}``.
- **label_major** (_optional_) - The name of the label the pull request is labeled with for a major version change. **Default:** major
- **label_minor** (_optional_) - The name of the label the pull request is labeled with for a minor version change. **Default:** minor
- **label_patch** (_optional_) - The name of the label the pull request is labeled with for a patch version change. **Default:** patch
- **label_beta** (_optional_) - The name of the label the pull request is labeled with for a beta version change. Requiers the pull request also has a label of major, minor or path. **Default:** beta
- **label_alpha** (_optional_) - The name of the label the pull request is labeled with for a alpha version change. Requiers the pull request also has a label of major, minor or path. **Default:** alpha
- **label_docs** (_optional_) - The name of the label the pull request is labeled with for a doc change this will not create a new tag. **Default:** docs
- **tag_prefix** (_optional_) - A prefix to the tag name (default: v).
- **dry_run** (_optional_) - Do not perform taging, just calculate next version, then exit.
## Outputs
- **new_tag** - The value of the newly created tag. Note that if there hasn't been any new commit, this will be undefined.
- **new_version** - The value of the newly created tag without the prefix. Note that if there hasn't been any new commit, this will be undefined.
# Credits
[laputansoft/github-tag-action](https://github.com/laputansoft/github-tag-action)