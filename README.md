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
    permissions: 
        pull-requests: write
        contents: write

    steps: 
      - name: Checkout
        id: checkout
        uses: actions/checkout@v4

      - name: Bump version
        uses: 4Source/version-control-action@v1
        with: 
          github_token: ${{ secrets.GITHUB_TOKEN }}
          owner: ${{ github.repository_owner }}
          repository:  ${{ github.event.repository.name }}
          pr_number: ${{ github.event.number }}
```
## Inputs
- **github_token** (_requiered_) - Required for permission to tag the repository. Usually ``${{ secrets.GITHUB_TOKEN }}``.
- **owner** (_requiered_) - Required for fetching. Usually ``${{ github.repository_owner }}``.
- **repository** (_requiered_) - Required for fetching. Usually ``${{ github.event.repository.name }}``.
- **pr_number** (_requiered_) - Required for fetching. Usually ``${{ github.event.number }}``.
- **label_major** (_optional_) - The name of the label the pull request is labeled with for a major version change. **Default:** major
- **label_minor** (_optional_) - The name of the label the pull request is labeled with for a minor version change. **Default:** minor
- **label_patch** (_optional_) - The name of the label the pull request is labeled with for a patch version change. **Default:** patch
- **label_docs** (_optional_) - The name of the label the pull request is labeled with for a doc change this will not create a new tag. **Default:** documentation
- **tag_prefix** (_optional_) - A prefix to the tag name (default: v).
- **dry_run** (_optional_) - Do not perform taging, just calculate next version, then exit. **Default:** false
## Outputs
- **new_tag** - The value of the newly created tag. Note that if there hasn't been any new commit, this will be undefined.
- **new_version** - The value of the newly created tag without the prefix. Note that if there hasn't been any new commit, this will be undefined.

# Credits
[laputansoft/github-tag-action](https://github.com/laputansoft/github-tag-action)