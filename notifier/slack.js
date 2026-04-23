// Send Slack message via Bot API (chat.postMessage)
// Requires SLACK_BOT_TOKEN (xoxb-...) + SLACK_CHANNEL_ID (Cxxx)

const API_URL = 'https://slack.com/api/chat.postMessage';

export async function sendSlack(text, {channel, blocks} = {}) {
  const token = process.env.SLACK_BOT_TOKEN;
  const defaultChannel = process.env.SLACK_CHANNEL_ID;
  const targetChannel = channel || defaultChannel;

  if (!token || !targetChannel) {
    console.warn('[slack] SLACK_BOT_TOKEN or SLACK_CHANNEL_ID not set, logging to stdout instead');
    console.log('───── SLACK MESSAGE ─────');
    console.log(text);
    console.log('───── END ─────');
    return {ok: false, reason: 'no_credentials'};
  }

  const body = {
    channel: targetChannel,
    text,
    unfurl_links: false,
    unfurl_media: false,
    ...(blocks && {blocks}),
  };

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Slack API failed: ${data.error || 'unknown error'}`);
  }

  return {ok: true, ts: data.ts, channel: data.channel};
}
