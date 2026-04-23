// Next.js App Router endpoint cho Inngest webhook
import {serve} from 'inngest/next';
import {inngest} from '../../../inngest/client.js';

// Inngest splits work via step.run(), each webhook invocation = 1 step.
// 60s covers single-step scrape (Reddit RSS + Discourse) on both Hobby + Pro.
export const maxDuration = 60;
import {communityMonitorDaily} from '../../../inngest/functions/communityMonitor.js';
import {mentionMonitor} from '../../../inngest/functions/mentionMonitor.js';
import {karmaSnapshotDaily} from '../../../inngest/functions/karmaSnapshot.js';
import {givebackDiscoveryDaily} from '../../../inngest/functions/givebackDiscovery.js';
import {evergreenRevisitWeekly} from '../../../inngest/functions/evergreenRevisit.js';

export const {GET, POST, PUT} = serve({
  client: inngest,
  functions: [
    communityMonitorDaily,
    mentionMonitor,
    karmaSnapshotDaily,
    givebackDiscoveryDaily,
    evergreenRevisitWeekly,
  ],
});
