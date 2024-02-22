const core = require('@actions/core')
const github = require('@actions/github')

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
  try {
    const owner = core.getInput('owner', { required: true })
    const repo = core.getInput('repo', { required: true })
    const pr_number = core.getInput('pr_number', { required: true })
    const token = core.getInput('token', { required: true })

    const octokit = new github.getOctokit(token)

    const { data: changedFiles } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: pr_number
    })

    let diffData = {
      additions: 0,
      deletions: 0,
      changes: 0
    }

    diffData = changedFiles.reduce((acc, file) => {
      acc.additions += file.additions
      acc.deletions += file.deletions
      acc.changes += file.changes
      return acc
    }, diffData)

    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: pr_number,
      body: `
      Pull request #${pr_number} has be updated with: \n
      - ${diffData.additions} additions \n
      - ${diffData.deletions} deletions \n
      - ${diffData.changes} changes \n
      `
    })

    for (const file of changedFiles) {
      const fileExtension = file.filename.split('.').pop()
      let label = ''
      switch (fileExtension) {
        case 'md':
          label = 'markdown'
          break
        case 'js':
          label = 'javascript'
          break
        case 'ts':
          label = 'typescript'
          break
        case '':
          label = 'noextension'
          break
        default:
          label = 'nomatch'
          break
      }

      await octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number: pr_number,
        labels: [label]
      })
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(error.message)
  }
}

module.exports = {
  run
}
