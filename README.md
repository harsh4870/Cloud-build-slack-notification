# google-cloud-build-slack

Slack integration for Google Cloud Build, using Google Cloud Functions to post messages to Slack when a build reaches a specific state.

## Setup

1. Create a Slack app, and copy the webhook URL:
```
Add the value in Index.js File SLACK_WEBHOOK_URL=''
```
2.Set a github token to obtain github commit author info in slack messages if applicable.
```
Add the value in Index.js File GITHUB_TOKEN=''
```
4. Create the function with [serverless framework (Option 1)](#serverless)

<a name="script"/></a>
### Option 1: Deploy with serverless framework
1. Install `serverless`
```
npm install serverless -g
```
2. Ensure that the value of `project.credentials` in `serverless.yml` points to [credentials with appropriate roles Serverless can use to create resources in your Project](https://serverless.com/framework/docs/providers/google/guide/credentials#get-credentials--assign-roles).

3. [Deploy](https://serverless.com/framework/docs/providers/google/cli-reference/deploy/)
```
serverless deploy
```

## Teardown

### If deployed with serverless framework
[Remove](https://serverless.com/framework/docs/providers/google/cli-reference/remove/)
```
serverless remove
```

## FAQ

### How much does it cost?
Each build invokes 3 times the function:
- when the build is queued
- when the build starts
- when the build reaches a final status.

## Contributing

Please read [CONTRIBUTING.md]() for details on our code of conduct, and the process for submitting pull requests to us.

## Authors

* **Harsh Manvar** - *Web Developer* - [harsh4870](https://github.com/harsh4870)


## Acknowledgments

* Hat tip to anyone whose code was used
* Inspiration
* etc
