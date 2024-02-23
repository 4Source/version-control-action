const core = require('@actions/core');
const github = require('@actions/github');
const semver = require('semver');

/**
 * Fetches the Labels attached to a issue or pull request from github.
 * @param {*} octokit Octokit object
 * @param {string} owner The owner name of the repository
 * @param {string} repo The name of the repository
 * @param {string} issue_number The number of the issue or pull request
 * @returns Array of label names
 */
async function fetchLabelsOnIssue(octokit, owner, repo, issue_number) {
  const { data, status } = await octokit.rest.issues.listLabelsOnIssue({
    owner,
    repo,
    issue_number
  });

  // Fetch returned error
  if (status !== 200) {
    core.debug(`Status: ${status}`);
    core.setFailed('Fetch labels got wrong!');
    return;
  }

  // Build label objects
  const labels = data.map(value => {
    return value.name;
  });

  core.info(`Labels: ${JSON.stringify(labels)}`); // debug

  return labels;
}

/**
 * Fetches the tags in the repository from github
 * @param {*} octokit Octokit object
 * @param {string} owner The owner name of the repository
 * @param {string} repo The name of the repository
 * @returns Array of tag objects. tag { name, commit }
 */
async function fetchTags(octokit, owner, repo) {
  const { data, status } = await octokit.rest.repos.listTags({
    owner,
    repo
  });

  // Fetch returned error
  if (status !== 200) {
    core.debug(`Status: ${status}`);
    core.setFailed('Fetch tags got wrong!');
    return;
  }

  // Build tags objects
  const tags = data.map(value => {
    return {
      name: value.name,
      commit: value.commit.sha
    };
  });

  core.info(`Tags: ${JSON.stringify(tags)}`); // debug

  return tags;
}

/**
 * Fetches the releases in the repository from github
 * @param {*} octokit Octokit object
 * @param {string} owner The owner name of the repository
 * @param {string} repo The name of the repository
 * @returns Array of release objects. release { name, draft, prerelease }
 */
async function fetchReleases(octokit, owner, repo) {
  const { data: releasesData, status: releasesStatus } =
    await octokit.rest.repos.listReleases({
      owner,
      repo
    });

  // Fetch returned error
  if (releasesStatus !== 200) {
    core.debug(`Status: ${releasesStatus}`);
    core.setFailed('Fetch releases got wrong!');
    return;
  }

  const { data: latestData, status: latestStatus } =
    await octokit.rest.repos.getLatestRelease({
      owner,
      repo
    });

  core.info(`Latest: ${JSON.stringify(latestData)}`); // debug

  // Fetch returned error
  if (latestStatus !== 200) {
    core.debug(`Status: ${latestStatus}`);
    core.setFailed('Fetch latest releases got wrong!');
    return;
  }

  // Build release objects
  const releases = releasesData.map(value => {
    return {
      name: value.tag_name,
      draft: value.draft,
      prerelease: value.prerelease
    };
  });

  core.info(`Releases: ${JSON.stringify(releases)}`); // debug

  return releases;
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
  try {
    // Get the inputs from workflow
    const github_token = core.getInput('github_token', { required: true });
    const owner = core.getInput('owner', { required: true });
    const repo = core.getInput('repository', { required: true });
    const pr_number = core.getInput('pr_number', { required: true });
    const label_major = core.getInput('label_major', { required: false });
    const label_minor = core.getInput('label_minor', { required: false });
    const label_patch = core.getInput('label_patch', { required: false });
    const label_beta = core.getInput('label_beta', { required: false });
    const label_alpha = core.getInput('label_alpha', { required: false });
    const label_docs = core.getInput('label_docs', { required: false });
    const tag_prefix = core.getInput('tag_prefix', { required: false });
    const dry_run = core.getInput('dry_run', { required: false });

    const { GITHUB_REF, GITHUB_SHA } = process.env;

    // Check all requiered inputs present
    if (!GITHUB_REF) {
      core.setFailed('Missing GITHUB_REF');
      return;
    }
    core.debug(`GITHUB_REF: ${GITHUB_REF}`);

    if (!GITHUB_SHA) {
      core.setFailed('Missing GITHUB_SHA');
      return;
    }
    core.debug(`GITHUB_SHA: ${GITHUB_SHA}`);

    // Octokit rest api (https://octokit.github.io/rest.js)
    const octokit = new github.getOctokit(github_token);

    // Fetch labels on pull request
    const labels = await fetchLabelsOnIssue(octokit, owner, repo, pr_number);

    // Fetch all tags
    const tags = await fetchTags(octokit, owner, repo);

    let tag = '';
    let bump = '';
    let identifier = '';
    let preRelease = false;

    // Is major change
    if (label_major && labels.includes(label_major)) {
      if (label_beta && labels.includes(label_beta)) {
        bump = 'premajor';
        identifier = 'beta';
        preRelease = true;
      } else if (label_alpha && labels.includes(label_alpha)) {
        bump = 'premajor';
        identifier = 'alpha';
        preRelease = true;
      } else {
        bump = 'major';
      }
    }
    // Is minor change
    else if (label_minor && labels.includes(label_minor)) {
      if (label_beta && labels.includes(label_beta)) {
        bump = 'preminor';
        identifier = 'beta';
        preRelease = true;
      } else if (label_alpha && labels.includes(label_alpha)) {
        bump = 'preminor';
        identifier = 'alpha';
        preRelease = true;
      } else {
        bump = 'minor';
      }
    }
    // Is patch change
    else if (label_patch && labels.includes(label_patch)) {
      if (label_beta && labels.includes(label_beta)) {
        bump = 'prepatch';
        identifier = 'beta';
        preRelease = true;
      } else if (label_alpha && labels.includes(label_alpha)) {
        bump = 'prepatch';
        identifier = 'alpha';
        preRelease = true;
      } else {
        bump = 'patch';
      }
    }
    // Is docs change
    else if (label_docs && labels.includes(label_docs)) {
      core.info('Is docs change do not requiere a new version. Skipping...');
      return;
    } else {
      core.setFailed('None of the version labels are set in the pull request!');
      return;
    }

    // Fetch all releases
    const releases = await fetchReleases(octokit, owner, repo);

    // if (latest) {
    //   tag = latest;
    // } else {
    tag = 'v0.0.0';

    //   core.debug('No previous tag.');
    // }

    core.setOutput('pre_release', preRelease);

    const newVersion = `${semver.inc(tag, bump, identifier)}`;
    const newTag = `${tag_prefix}${newVersion}`;

    core.info(`New version: ${newVersion}`);
    core.info(`New tag: ${newTag}`);

    core.setOutput('new_version', newVersion);
    core.setOutput('new_tag', newTag);

    // Exist newTag allready
    if (tags.map(value => value.name).includes(newTag)) {
      core.setFailed('This tag already exists. Skipping...');
      return;
    }

    if (dry_run === 'true') {
      core.info('Dry run: not performing tag creation.');
      return;
    }

    core.debug(`Creating annotated tag.`);

    const tagCreateResponse = await octokit.rest.git.createTag({
      ...github.context.repo,
      tag: newTag,
      message: newTag,
      object: GITHUB_SHA,
      type: 'commit'
    });

    core.debug(`Pushing annotated tag to the repo`);

    await octokit.rest.git.createRef({
      ...github.context.repo,
      ref: `refs/tags/${newTag}`,
      sha: tagCreateResponse.data.sha
    });

    // octokit.rest.repos.createRelease({
    //   owner,
    //   repo,
    //   tag_name,
    //   name: tag_name,
    //   draft,
    //   prerelease,
    //   make_latest
    // });

    return;
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(error.message);
  }
}

module.exports = {
  run
};
