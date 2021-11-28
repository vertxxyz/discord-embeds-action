# Discord Embeds Action
:octocat: Github action to update embeds through Discord webhooks

## Setup Details
Webhook json embed documents must be under a folder named `embeds`.  
**Folders** are channels. Eg. `channel-name`.  
`channel-name.meta` files contain the `ChannelId`, and must be next to the folder.  
**Files** are embeds. Eg. `post-name.json`.  
`post-name.meta` files contain `PostId`, and must be next to the file.  
```
embeds
├──channel-name-1
│   └──post-name-1.json
│   └──post-name-1.meta
│   └──post-name-2.json
│   └──post-name-2.meta
├──channel-name-1.meta
├──channel-name-2
│   └──post-name-1.json
│   └──post-name-1.meta
├──channel-name-1.meta
┆
```
If the files are not in this format they will not be parsed or updated.  

The webhook URLs are secrets keyed by `WEBHOOKS`, and are stored as csv:  
```csv
ChannelId1,WebhookURL1
ChannelId2,WebhookURL2
```  
Each channel needs an associated webhook url listed in the secret or none of the posts under it will be updated.  

## Usage
This action does not support *making* posts, only editing them.  

#### Workflow
```yaml
name: edit webhooks (main)

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  edit-webhooks:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
      with:
        ref: ${{ github.head_ref }}
        fetch-depth: 0
    - name: Update Discord embeds
      uses: vertxxyz/discord-embeds-action@main
      with:
        webhooks_secret: ${{ secrets.WEBHOOKS }}
```

This action uses [tj-actions/changed-files](https://github.com/tj-actions/changed-files) to gather the edited json files.  

#### Authoring editable posts
1. Author and post a webhook embed using a service like [Discohook](https://discohook.org)
2. Add a channel folder under the `embeds` folder.
3. Add a `channel-name.meta` file next to that folder with the same name as the folder
4. Edit the file with the channel ID only. Find the ID by right-clicking on the channel and pressing Copy ID (requires: User Settings > App Settings > Advanced > Developer Mode).
5. Add a file under the channel folder, `post-name.json`, and edit it with the JSON Data of the embed.
6. Add a `post-name.meta` file next to the `post-name.json` file with the same name.
7. Edit the file with the post ID only. Find the ID by right-clicking on the post and pressing Copy ID.
8. Inside of the repo's secrets (Settings > Secrets), ensure there is a secret named `WEBHOOKS` that contains a CSV pair: `ChannelId,WebhookURL` on a new line. Channels only need to be added once.  
	Keep a copy of the secret locally to append to it. Secrets cannot be edited through github, only re-submitted entirely.
9. Next time you edit `post-name.json`, the changes should update the discord post.

---  

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/Z8Z42ZYHB)