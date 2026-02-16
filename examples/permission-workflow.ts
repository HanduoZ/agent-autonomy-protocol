/**
 * Permission Workflow Example
 * 
 * Demonstrates how agents request, receive, and use permissions in A2AP.
 * This example shows a realistic workflow for a content-publishing agent.
 */

import { A2APClient } from '../src/client';

interface AgentIdentity {
  agentId: string;
  publicKey: string;
  capabilities: string[];
}

interface PermissionGrant {
  resource: string;
  scope: string[];
  expiresAt?: Date;
  conditions?: Record<string, any>;
}

/**
 * Step 1: Agent Registration & Identity
 */
async function registerAgent(): Promise<AgentIdentity> {
  const client = new A2APClient({
    registryUrl: 'https://registry.a2ap.network',
    agentName: 'ContentPublisher',
    version: '1.0.0'
  });

  // Register with public key for verification
  const identity = await client.register({
    publicKey: await generatePublicKey(),
    capabilities: [
      'social.post',
      'social.delete',
      'analytics.read'
    ],
    metadata: {
      purpose: 'Automated content publishing with analytics',
      creator: 'user@example.com',
      governanceUrl: 'https://github.com/example/agent/GOVERNANCE.md'
    }
  });

  console.log('✅ Agent registered:', identity.agentId);
  return identity;
}

/**
 * Step 2: Request Permission from User
 */
async function requestPermission(
  agentId: string,
  resource: string,
  scope: string[]
): Promise<PermissionGrant> {
  const client = new A2APClient({ agentId });

  // Create permission request
  const request = await client.permissions.request({
    resource,
    scope,
    justification: {
      reason: 'Need to post weekly summary articles',
      frequency: 'Once per week',
      dataAccess: 'Read-only analytics for engagement metrics'
    },
    expiresIn: '30d' // Request 30-day grant
  });

  console.log('📋 Permission request created:', request.requestId);
  console.log('   User approval URL:', request.approvalUrl);

  // Wait for user approval (polling in real scenario)
  const grant = await client.permissions.waitForApproval(request.requestId, {
    timeout: 300000, // 5 minutes
    pollInterval: 2000
  });

  console.log('✅ Permission granted:', grant);
  return grant;
}

/**
 * Step 3: Use Permission with Proof
 */
async function usePermission(
  agentId: string,
  grant: PermissionGrant
): Promise<void> {
  const client = new A2APClient({ agentId });

  // Perform action with permission proof
  const result = await client.execute({
    action: 'social.post',
    resource: grant.resource,
    payload: {
      content: 'Weekly AI Agent Report: 127 successful tasks this week! 📊',
      visibility: 'public'
    },
    proof: {
      grantId: grant.id,
      signature: await signRequest({
        action: 'social.post',
        timestamp: Date.now(),
        nonce: generateNonce()
      })
    }
  });

  console.log('✅ Action completed:', result.actionId);
  console.log('   Recorded at:', result.timestamp);
}

/**
 * Step 4: Graceful Permission Failure
 */
async function handlePermissionDenied(agentId: string): Promise<void> {
  const client = new A2APClient({ agentId });

  try {
    await client.execute({
      action: 'social.delete',
      resource: 'twitter:@example',
      payload: { postId: '123456' }
    });
  } catch (error) {
    if (error.code === 'PERMISSION_DENIED') {
      // Log the denial (increases reputation for transparency)
      await client.audit.logFailure({
        action: 'social.delete',
        reason: 'Permission denied by user',
        gracefulFallback: 'Notified user via email instead',
        escalation: false
      });

      console.log('⚠️  Permission denied - gracefully handled');
      console.log('   Reputation impact: +0.1 (transparent failure)');
      
      // Fallback: request human intervention
      await notifyUser({
        subject: 'Action requires approval',
        message: 'Your agent tried to delete a post but lacks permission. Review?'
      });
    }
  }
}

/**
 * Step 5: Permission Revocation & Cleanup
 */
async function handleRevocation(agentId: string, grantId: string): Promise<void> {
  const client = new A2APClient({ agentId });

  // Agent receives revocation notification
  client.on('permission.revoked', async (event) => {
    console.log('🔴 Permission revoked:', event.grantId);
    
    // Clean up any cached credentials
    await client.cache.invalidate(event.grantId);
    
    // Stop scheduled tasks that depend on this permission
    await stopScheduledTasks(event.resource, event.scope);
    
    // Log the cleanup for audit trail
    await client.audit.log({
      event: 'permission.revoked.handled',
      grantId: event.grantId,
      cleanupActions: ['cache.cleared', 'tasks.stopped'],
      timestamp: Date.now()
    });

    console.log('✅ Gracefully handled revocation');
  });
}

/**
 * Step 6: Audit & Transparency
 */
async function queryAuditLog(agentId: string): Promise<void> {
  const client = new A2APClient({ agentId });

  // User queries what their agent has done
  const actions = await client.audit.query({
    agentId,
    timeRange: { start: Date.now() - 7 * 24 * 60 * 60 * 1000 }, // Last 7 days
    limit: 50
  });

  console.log('📊 Audit Log (last 7 days):');
  actions.forEach(action => {
    console.log(`   ${action.timestamp}: ${action.action}`);
    console.log(`      Resource: ${action.resource}`);
    console.log(`      Result: ${action.result}`);
    console.log(`      Proof: ${action.proofUrl}`);
  });
}

/**
 * Complete Workflow Example
 */
async function main() {
  console.log('🚀 A2AP Permission Workflow Demo\n');

  // 1. Register agent
  const identity = await registerAgent();
  
  // 2. Request permission from user
  const grant = await requestPermission(
    identity.agentId,
    'twitter:@example',
    ['post', 'read_analytics']
  );
  
  // 3. Use the permission
  await usePermission(identity.agentId, grant);
  
  // 4. Handle failures gracefully
  await handlePermissionDenied(identity.agentId);
  
  // 5. Handle revocation
  await handleRevocation(identity.agentId, grant.id);
  
  // 6. Provide audit trail
  await queryAuditLog(identity.agentId);
  
  console.log('\n✅ Workflow complete - all actions recorded on-chain');
}

// Utility functions (simplified for example)
async function generatePublicKey(): Promise<string> {
  return 'ed25519:abc123...'; // Real implementation uses crypto
}

async function signRequest(data: any): Promise<string> {
  return 'signature:xyz789...'; // Real implementation uses Ed25519
}

function generateNonce(): string {
  return Math.random().toString(36).substring(7);
}

async function stopScheduledTasks(resource: string, scope: string[]): Promise<void> {
  // Implementation: cancel cron jobs, clear queues, etc.
}

async function notifyUser(notification: { subject: string; message: string }): Promise<void> {
  // Implementation: email, push notification, etc.
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

export {
  registerAgent,
  requestPermission,
  usePermission,
  handlePermissionDenied,
  handleRevocation,
  queryAuditLog
};
