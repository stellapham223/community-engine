// Next.js App Router endpoint cho Inngest webhook
import {serve} from 'inngest/next';
import {inngest} from '../../../inngest/client.js';
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
