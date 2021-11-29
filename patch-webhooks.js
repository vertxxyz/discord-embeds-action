// const core = require('@actions/core');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Parse webhook csv
const webhook_secret = process.env.WEBHOOKS_SECRET;
const webhooks = webhook_secret.trim()
	.split(/\r?\n/)
	.map(line => line.split(',').map(v => v.trim()));

// Gather valid modified files
let modifiedFiles =
	process.env.MODIFIED_FILES
	.split(',')
	.filter(
		file => file &&
		file.length !== 0 &&
		(
			file.startsWith('embeds/') ||
			file.includes('/embeds/')
		)
	);

const regexId = /[0-9]{18}/;
let threwError = false;

// Parse modified files into channel ids to post objects (containing ids and json)
let channelIdToPostObject = {};
for (var filePath of modifiedFiles) {
	filePath = filePath.toLowerCase();
	if (!filePath.endsWith('.json'))
		continue;

	// Get post ID
	let filePathWithoutExtension = filePath.slice(0, -'.json'.length);
	let metaFilePath = `${filePathWithoutExtension}.meta`;
	if (!fs.existsSync(metaFilePath)) {
		console.error(`Post file did not have an associated .meta file: "${metaFilePath}", from "${filePath}"`);
		threwError = true;
		continue;
	}

	let postId = fs.readFileSync(metaFilePath, 'utf-8').trim();
	if (!regexId.test(postId)) {
		console.error(`Parsed ID in post file was not valid: "${postId}", from "${metaFilePath}"`);
		threwError = true;
		continue;
	}

	// Get channel ID
	let directory = path.dirname(filePath);
	let directoryMetaFilePath = `${directory}.meta`;
	if (!fs.existsSync(directoryMetaFilePath)) {
		console.error(`Directory did not have an associated .meta file: "${directory}", from "${filePath}"`);
		threwError = true;
		continue;
	}
	let channelId = fs.readFileSync(directoryMetaFilePath, 'utf-8').trim();
	if (!regexId.test(channelId)) {
		console.error(`Parsed directory was not a valid channel ID: "${channelId}", from "${directoryMetaFilePath}"`);
		threwError = true;
		continue;
	}

	// Add to lookup
	channelIdToPostObject[channelId] = {
		id: postId,
		json: fs.readFileSync(filePath, 'utf-8')
	};
}

let noChanges = Object.keys(channelIdToPostObject).length === 0;
if (!noChanges) {
	// Collect channel IDs to webhook URLs.
	let channelIdToWebhookUrl = {};
	for (let channelIdAndWebhookUrl of webhooks) {
		if (channelIdAndWebhookUrl.length < 2) {
			console.error(`WEBHOOKS secret was not formatted as "ChannelId,WebhookURL..." CSV.`);
			threwError = true;
			break;
		}
		let channelId = channelIdAndWebhookUrl[0];
		if (!regexId.test(channelId)) {
			console.error(`Channel ID in WEBHOOKS secret was not valid. Perhaps an incorrectly formatted "ChannelId,WebhookURL..." CSV was provided?`);
			threwError = true;
			break;
		}

		channelIdToWebhookUrl[channelId] = channelIdAndWebhookUrl[1];
	}

	if (!threwError) {
		// Collect webhook URLs for post objects. (.webhookUrl)
		for (let channelId in channelIdToPostObject) {
			if (channelId in channelIdToWebhookUrl) {
				let postObject = channelIdToPostObject[channelId];
				postObject.webhookUrl = channelIdToWebhookUrl[channelId];
				continue;
			}
			console.error(`${channelId} was not found in WEBHOOKS secret.`);
			threwError = true;
			continue;
		}
	}
}

if (threwError) {
	process.exit(1);
}

if (noChanges) {
	console.log('No post changes found, no requests sent.');
	process.exit(0);
}

// Edit all webhooks.
var promises = [];

for (let channelId in channelIdToPostObject) {
	let postObject = channelIdToPostObject[channelId];
	let postId = postObject.id;
	let payload = postObject.json;
	let webhookUrl = postObject.webhookUrl;
	let url = `${webhookUrl}/messages/${postId}?wait=true`;

	promises.push(axios.patch(
		url,
		payload, {
			headers: {
				'Content-Type': 'application/json',
			},
		},
	));
}

Promise.all(promises).catch(err => {
	console.error(err.response);
	process.exit(1);
});