const core = require('@actions/core');
const _exec = require('@actions/exec');
const github = require('@actions/github');
const semver = require('semver');

async function exec(command) {
  let stdout = '';
  let stderr = '';

  try {
    const options = {
      listeners: {
        stdout: data => {
          stdout += data.toString();
        },
        stderr: data => {
          stderr += data.toString();
        }
      }
    };

    const code = await _exec(command, undefined, options);

    return {
      code,
      stdout,
      stderr
    };
  } catch (err) {
    return {
      code: 1,
      stdout,
      stderr,
      error: err
    };
  }
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
  try {
    const github_token = core.getInput('github_token', { required: true });
    const owner = core.getInput('owner', { required: true });
    const repository = core.getInput('repository', { required: true });
    const pr_number = core.getInput('pr_number', { required: true });
    const label_major = core.getInput('label_major', { required: false });
    const label_minor = core.getInput('label_minor', { required: false });
    const label_patch = core.getInput('label_patch', { required: false });
    const label_beta = core.getInput('label_beta', { required: false });
    const label_alpha = core.getInput('label_alpha', { required: false });
    const label_docs = core.getInput('label_docs', { required: false });
    const tag_prefix = core.getInput('tag_prefix', { required: false });
    const dry_run = core.getInput('dry_run', { required: false });

    core.debug(`github_token: ${github_token}`);
    core.debug(`owner: ${owner}`);
    core.debug(`repository: ${repository}`);
    core.debug(`pr_number: ${pr_number}`);
    core.debug(`label_major: ${label_major}`);
    core.debug(`label_minor: ${label_minor}`);
    core.debug(`label_patch: ${label_patch}`);
    core.debug(`label_beta: ${label_beta}`);
    core.debug(`label_alpha: ${label_alpha}`);
    core.debug(`label_docs: ${label_docs}`);
    core.debug(`tag_prefix: ${tag_prefix}`);
    core.debug(`dry_run: ${dry_run}`);

    const { GITHUB_REF, GITHUB_SHA } = process.env;

    if (!GITHUB_REF) {
      core.setFailed('Missing GITHUB_REF');
      return;
    }

    if (!GITHUB_SHA) {
      core.setFailed('Missing GITHUB_SHA');
      return;
    }

    core.debug(GITHUB_REF);
    core.debug(GITHUB_SHA);

    await exec('git fetch --tags');

    const hasTag = !!(await exec('git tag')).stdout.trim();
    let tag = '';

    if (hasTag) {
      const previousTagSha = (
        await exec('git rev-list --tags --topo-order --max-count=1')
      ).stdout.trim();
      tag = (await exec(`git describe --tags ${previousTagSha}`)).stdout.trim();

      core.debug(`Previous tag is: ${tag}`);

      if (previousTagSha === GITHUB_SHA) {
        core.info('No new commits since previous tag. Skipping...');
        return;
      }
    } else {
      tag = '0.0.0';

      core.debug('No previous tag.');
    }

    const octokit = new github.getOctokit(github_token);

    const { data: labels } = await octokit.rest.issues.listLabelsOnIssue({
      owner,
      repo: repository,
      issue_number: pr_number
    });

    const labelsNames = labels.map(value => {
      return value.name;
    });

    core.info(`Labels at pull request: ${labelsNames}`);

    let bump = '';
    let identifier = '';

    // Is major change
    if (labelsNames.includes(label_major)) {
      if (labelsNames.includes(label_beta)) {
        bump = 'premajor';
        identifier = 'beta';
      } else if (labelsNames.includes(label_alpha)) {
        bump = 'premajor';
        identifier = 'alpha';
      } else {
        bump = 'major';
      }
    }
    // Is minor change
    else if (labelsNames.includes(label_minor)) {
      if (labelsNames.includes(label_beta)) {
        bump = 'preminor';
        identifier = 'beta';
      } else if (labelsNames.includes(label_alpha)) {
        bump = 'preminor';
        identifier = 'alpha';
      } else {
        bump = 'minor';
      }
    }
    // Is patch change
    else if (labelsNames.includes(label_patch)) {
      if (labelsNames.includes(label_beta)) {
        bump = 'prepatch';
        identifier = 'beta';
      } else if (labelsNames.includes(label_alpha)) {
        bump = 'prepatch';
        identifier = 'alpha';
      } else {
        bump = 'patch';
      }
    }
    // Is docs change
    else if (labelsNames.includes(label_docs)) {
      core.info('Is docs change do not requiere a new version. Skipping...');
      return;
    } else {
      core.error('None of the version labels are set in the pull request!');
    }

    const newVersion = `${semver.inc(tag, bump, identifier)}`;
    const newTag = `${tag_prefix}${newVersion}`;

    core.info(`New version: ${newVersion}`);

    core.setOutput('new_version', newVersion);
    core.setOutput('new_tag', newTag);

    // core.debug(`New tag: ${newTag}`);
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(error.message);
  }
}

module.exports = {
  run
};
