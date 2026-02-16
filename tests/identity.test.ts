import { describe, it, expect } from 'vitest';
import {
  generateAgentKeypair,
  signRequest,
  verifyRequest,
  extractAgentId
} from '../src/lib/identity';

describe('Identity Verification', () => {
  describe('generateAgentKeypair', () => {
    it('should generate valid Ed25519 keypair', () => {
      const { publicKey, privateKey } = generateAgentKeypair();
      
      expect(publicKey).toContain('BEGIN PUBLIC KEY');
      expect(privateKey).toContain('BEGIN PRIVATE KEY');
      expect(publicKey.length).toBeGreaterThan(100);
      expect(privateKey.length).toBeGreaterThan(100);
    });
    
    it('should generate unique keypairs', () => {
      const pair1 = generateAgentKeypair();
      const pair2 = generateAgentKeypair();
      
      expect(pair1.publicKey).not.toBe(pair2.publicKey);
      expect(pair1.privateKey).not.toBe(pair2.privateKey);
    });
  });
  
  describe('signRequest', () => {
    it('should sign a request with valid signature', () => {
      const { publicKey, privateKey } = generateAgentKeypair();
      const agentId = 'agent-123';
      const payload = { action: 'test', data: 'example' };
      
      const signed = signRequest(agentId, payload, privateKey);
      
      expect(signed.agentId).toBe(agentId);
      expect(signed.payload).toEqual(payload);
      expect(signed.signature).toBeDefined();
      expect(signed.timestamp).toBeGreaterThan(Date.now() - 1000);
    });
    
    it('should produce different signatures for different payloads', () => {
      const { publicKey, privateKey } = generateAgentKeypair();
      
      const signed1 = signRequest('agent-1', { msg: 'hello' }, privateKey);
      const signed2 = signRequest('agent-1', { msg: 'world' }, privateKey);
      
      expect(signed1.signature).not.toBe(signed2.signature);
    });
  });
  
  describe('verifyRequest', () => {
    it('should verify valid signed request', () => {
      const { publicKey, privateKey } = generateAgentKeypair();
      const agentId = 'agent-456';
      const payload = { capability: 'nlp', price: 100 };
      
      const signed = signRequest(agentId, payload, privateKey);
      const isValid = verifyRequest(signed, publicKey);
      
      expect(isValid).toBe(true);
    });
    
    it('should reject request signed with wrong key', () => {
      const pair1 = generateAgentKeypair();
      const pair2 = generateAgentKeypair();
      
      const signed = signRequest('agent-1', { test: true }, pair1.privateKey);
      const isValid = verifyRequest(signed, pair2.publicKey);
      
      expect(isValid).toBe(false);
    });
    
    it('should reject tampered payload', () => {
      const { publicKey, privateKey } = generateAgentKeypair();
      
      const signed = signRequest('agent-1', { amount: 100 }, privateKey);
      // Tamper with payload
      signed.payload.amount = 1000;
      
      const isValid = verifyRequest(signed, publicKey);
      
      expect(isValid).toBe(false);
    });
    
    it('should reject expired request (>5 min old)', () => {
      const { publicKey, privateKey } = generateAgentKeypair();
      
      const signed = signRequest('agent-1', { test: true }, privateKey);
      // Fake old timestamp
      signed.timestamp = Date.now() - (6 * 60 * 1000); // 6 minutes ago
      
      const isValid = verifyRequest(signed, publicKey);
      
      expect(isValid).toBe(false);
    });
    
    it('should reject malformed signature', () => {
      const { publicKey, privateKey } = generateAgentKeypair();
      
      const signed = signRequest('agent-1', { test: true }, privateKey);
      signed.signature = 'invalid-base64-signature';
      
      const isValid = verifyRequest(signed, publicKey);
      
      expect(isValid).toBe(false);
    });
  });
  
  describe('extractAgentId', () => {
    it('should extract agent ID from request', () => {
      const { publicKey, privateKey } = generateAgentKeypair();
      const agentId = 'agent-789';
      
      const signed = signRequest(agentId, { test: true }, privateKey);
      const extracted = extractAgentId(signed);
      
      expect(extracted).toBe(agentId);
    });
  });
});
