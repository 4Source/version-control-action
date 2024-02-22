const core = require('@actions/core');
const exec = require('@actions/exec');
const github = require('@actions/github');
const semver = require('semver');

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
  try {
    const github_token = core.getInput('github_token', { required: true });
    const label_major = core.getInput('label_major', { required: false });
    const label_minor = core.getInput('label_minor', { required: false });
    const label_patch = core.getInput('label_patch', { required: false });
    const label_beta = core.getInput('label_beta', { required: false });
    const label_alpha = core.getInput('label_alpha', { required: false });
    const label_docs = core.getInput('label_docs', { required: false });
    const tag_prefix = core.getInput('tag_prefix', { required: false });
    const dry_run = core.getInput('dry_run', { required: false });

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
        core.debug('No new commits since previous tag. Skipping...');
        return;
      }
    } else {
      tag = '0.0.0';

      core.debug('No previous tag.');
    }

    // // for some reason the commits start and end with a `'` on the CI so we ignore it
    // const commits = logs
    //   .split(SEPARATOR)
    //   .map((x) => ({
    //     message: x.trim().replace(/^'\n'/g, "").replace(/^'/g, ""),
    //   }))
    //   .filter((x) => !!x.message);
    // const bump = await analyzeCommits(
    //   {},
    //   { commits, logger: { log: console.info.bind(console) } }
    // );

    // if (!bump) {
    //   core.debug("No commit specifies the version bump. Skipping...");
    //   return;
    // }
    // inc(tag, )

    // const newVersion = `${inc(tag, bump || defaultBump)}${
    //   preRelease ? `-${GITHUB_SHA.slice(0, 7)}` : ""
    // }`;
    // const newTag = `${tagPrefix}${newVersion}`;

    // core.setOutput("new_version", newVersion);
    // core.setOutput("new_tag", newTag);

    // core.debug(`New tag: ${newTag}`);
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(error.message);
  }
}

module.exports = {
  run
};
