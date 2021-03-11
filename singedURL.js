const { IncomingWebhook } = require('@slack/client');
const humanizeDuration = require('humanize-duration');
const Octokit = require('@octokit/rest');
const config = require('./config.json');
const {Storage} = require('@google-cloud/storage');
const BUCKET_NAME = '<CLOUD BUCKET>';
const PROJECT_ID = '<PROJECT PATH>';
const KEY_FILENAME = '<JSON FILE PATH>'

const GITHUB_ACCESS_TOKEN = '<GITHUB ACCESS TOKEN>';

const token = GITHUB_ACCESS_TOKEN;
const octokit = require('@octokit/rest')({
  auth: `token ${token}`
})

var gcs =  new Storage({
  projectId: PROJECT_ID,
  keyFilename: KEY_FILENAME
});

module.exports.webhook = new IncomingWebhook(config.SLACK_WEBHOOK_URL);
module.exports.status = config.GC_SLACK_STATUS;

module.exports.getGithubCommit = async (build, octokit) => {
    try {
        console.log("Inside Github function");
        const githubRepo   = build.substitutions.REPO_NAME;
        const githubBranch = build.substitutions.BRANCH_NAME;
        const commitSha    = build.substitutions.COMMIT_SHA;
        const githubCommit = await octokit.git.getCommit({
            commit_sha: commitSha,
            owner: '<GITHUB OWNER NAME>',
            repo: githubRepo,
        });
        console.log("Github commit value",githubCommit);
        return githubCommit;
    } catch (err) {
        console.log('error',err);
        return err;
    }
};


module.exports.subscribe = async (event) => {
  try {
    const build = module.exports.eventToBuild(event.data);
    var filename ='log-' + build.id + '.txt';
    var file = gcs.bucket(BUCKET_NAME).file(filename);
    const getURL = async () => {
  return new Promise((resolve, reject) => {
    file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 76000000
    }, (err, url) => {
      if (err) {
        console.error(err);
        reject(err);
      }
      console.log("URL");
      resolve(url);
    });
  })
}
    const singedUrl = await getURL();
    // Skip if the current status is not in the status list.
    const status = module.exports.status || ['QUEUED', 'SUCCESS', 'FAILURE', 'INTERNAL_ERROR', 'TIMEOUT'];
    if (status.indexOf(build.status) === -1) {
      return;
    }
    console.log('Github commit calling');
    const githubCommit = await module.exports.getGithubCommit(build, octokit);
    const message = await module.exports.createSlackMessage(build, githubCommit, singedUrl);
    if (build.substitutions.BRANCH_NAME === 'development'){
      module.exports.webhook.send(message);
    }
    console.log('Message value', message);
    // Send message to slack.
  } catch (err) {
    console.log('function error',err)
    module.exports.webhook.send(`Error: ${err}`);
  }
};

// eventToBuild transforms pubsub event message to a build object.
module.exports.eventToBuild = data => JSON.parse(Buffer.from(data, 'base64').toString());

const DEFAULT_COLOR = '#4285F4'; // blue
const STATUS_COLOR = {
  QUEUED: DEFAULT_COLOR,
  WORKING: DEFAULT_COLOR,
  SUCCESS: '#34A853', // green
  FAILURE: '#EA4335', // red
  TIMEOUT: '#FBBC05', // yellow
  INTERNAL_ERROR: '#EA4335', // red
};

// createSlackMessage create a message from a build object.
module.exports.createSlackMessage = async (build, githubCommit, singedUrl) => {

  


  const buildFinishTime = new Date(build.finishTime);
  const buildStartTime = new Date(build.startTime);

  const isWorking = build.status === 'WORKING';
  const timestamp = Math.round(((isWorking) ? buildStartTime : buildFinishTime).getTime() / 1000);

  const text = (isWorking)
    ? `Build \`${build.id}\` started`
    : `Build \`${build.id}\` finished`;

  const fields = [{
    title: 'Status',
    value: build.status,
  }];

  if (!isWorking) {
    const buildTime = humanizeDuration(buildFinishTime - buildStartTime);

    fields.push({
      title: 'Duration',
      value: buildTime,
    });
  }

  const message = {
    text,
    mrkdwn: true,
    attachments: [
      {
        color: STATUS_COLOR[build.status] || DEFAULT_COLOR,
        title: 'Build logs',
        title_link: singedUrl,
        fields,
        footer: 'WotNot',
        footer_icon: 'https://cdn.example.io/assets/icon.png',
        ts: timestamp,
      },
    ],
  };

  let repoName, branchName;
  if (build.source && build.source.repoSource) {
    ({ repoName, branchName } = build.source.repoSource);
    console.log("inside IF");
  }
  else if (build.substitutions) {
    repoName = build.substitutions.REPO_NAME;
    branchName = build.substitutions.BRANCH_NAME;
    console.log("inside else");
    console.log("Repo Name",repoName);
    console.log("Branch Name",branchName);
  }

  // Add source information to the message.
  console.log(build);
  if (repoName && branchName) {
    message.attachments[0].fields.push({
      title: 'Repository',
      value: repoName,
    });

    message.attachments[0].fields.push({
      title: 'Branch',
      value: branchName,
    });
    
  }
  

  if (githubCommit) {    
      message.attachments[0].fields.push({
        title: 'Author Name',
        value: githubCommit.data.author.name,
      });
    
     message.attachments[0].fields.push({
        title: 'Committer Name',
        value: githubCommit.data.committer.name,
      });
    
      message.attachments[0].fields.push({
        title: 'Comment',
        value: githubCommit.data.message,
      });
    
    message.attachments[0].fields.push({
        title: 'Commit URL',
        value: githubCommit.data.html_url,
      });
 }

  // Add image(s) to the message.
  const images = build.images || [];
  if (images.length) {
    message.attachments[0].fields.push({
      title: `Image${(images.length > 1) ? 's' : ''}`,
      value: images.join('\n'),
    });
  }
  
  console.log("Final message",message);
  return message;
};
