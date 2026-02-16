#!/usr/bin/env python3
"""
A2AP Agent with Ed25519 Identity

Demonstrates:
- Agent registration receives keypair
- Signing requests with private key (coming soon in API)
- Identity verification between agents
"""

import requests
import json
from typing import Dict, Optional

class IdentifiedAgent:
    """Agent with Ed25519 identity for sybil resistance"""
    
    def __init__(self, base_url: str = "http://localhost:3000/v1"):
        self.base_url = base_url
        self.agent_id: Optional[str] = None
        self.api_key: Optional[str] = None
        self.public_key: Optional[str] = None
        self.private_key: Optional[str] = None
        
    def register(self, name: str, description: str) -> Dict:
        """
        Register agent - now receives Ed25519 keypair
        ⚠️ SAVE THE PRIVATE KEY! Server won't store it.
        """
        response = requests.post(
            f"{self.base_url}/agents",
            json={
                "name": name,
                "description": description,
                "endpoint": "http://localhost:8000",  # Your agent endpoint
                "wallet_address": "0x1234567890"      # Placeholder
            }
        )
        response.raise_for_status()
        data = response.json()
        
        self.agent_id = data["id"]
        self.api_key = data["api_key"]
        
        # NEW: Identity keypair
        identity = data.get("identity", {})
        self.public_key = identity.get("public_key")
        self.private_key = identity.get("private_key")
        
        print(f"✅ Registered as {name}")
        print(f"   Agent ID: {self.agent_id}")
        print(f"   API Key: {self.api_key[:20]}...")
        print(f"\n🔐 Identity Generated:")
        print(f"   Public Key:  {self.public_key[:50]}...")
        print(f"   Private Key: {self.private_key[:50]}...")
        print(f"\n⚠️  {identity.get('warning', 'Save your private key!')}")
        
        return data
    
    def save_identity(self, filepath: str = "agent_identity.json"):
        """Save identity to file (KEEP THIS SECURE!)"""
        if not self.private_key:
            raise ValueError("No identity to save. Register first.")
        
        identity_data = {
            "agent_id": self.agent_id,
            "api_key": self.api_key,
            "public_key": self.public_key,
            "private_key": self.private_key,
            "algorithm": "ed25519"
        }
        
        with open(filepath, 'w') as f:
            json.dump(identity_data, f, indent=2)
        
        print(f"\n💾 Identity saved to {filepath}")
        print(f"   Keep this file secure!")
        
    @classmethod
    def load_identity(cls, filepath: str = "agent_identity.json") -> 'IdentifiedAgent':
        """Load agent identity from file"""
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        agent = cls()
        agent.agent_id = data["agent_id"]
        agent.api_key = data["api_key"]
        agent.public_key = data["public_key"]
        agent.private_key = data["private_key"]
        
        print(f"✅ Loaded identity for agent {agent.agent_id}")
        return agent
    
    def verify_another_agent(self, other_agent_id: str) -> Dict:
        """
        Get another agent's public key for verification
        (In future: verify signed requests from them)
        """
        response = requests.get(
            f"{self.base_url}/agents/{other_agent_id}",
            headers={"Authorization": f"Bearer {self.api_key}"}
        )
        response.raise_for_status()
        agent_data = response.json()
        
        other_public_key = agent_data.get("public_key")
        
        if other_public_key:
            print(f"\n🔍 Agent {other_agent_id} public key:")
            print(f"   {other_public_key[:60]}...")
            return {"public_key": other_public_key, "verified": True}
        else:
            print(f"\n⚠️  Agent {other_agent_id} has no public key (legacy agent)")
            return {"public_key": None, "verified": False}


def demo_identity_workflow():
    """Demonstrate identity generation and verification"""
    print("=" * 60)
    print("A2AP Agent Identity Demo")
    print("=" * 60)
    print()
    
    # Create first agent
    print("1️⃣  Creating Agent 'AliceBot'")
    print("-" * 60)
    alice = IdentifiedAgent()
    alice.register(
        name="AliceBot",
        description="Demonstrates identity verification"
    )
    
    # Save identity
    alice.save_identity("alice_identity.json")
    
    print("\n" + "=" * 60)
    print("2️⃣  Creating Agent 'BobBot'")
    print("-" * 60)
    bob = IdentifiedAgent()
    bob.register(
        name="BobBot",
        description="Also demonstrates identity"
    )
    bob.save_identity("bob_identity.json")
    
    print("\n" + "=" * 60)
    print("3️⃣  Alice verifies Bob's identity")
    print("-" * 60)
    bob_verification = alice.verify_another_agent(bob.agent_id)
    
    print("\n" + "=" * 60)
    print("4️⃣  Loading identity from file")
    print("-" * 60)
    alice_loaded = IdentifiedAgent.load_identity("alice_identity.json")
    
    print("\n" + "=" * 60)
    print("✅ Demo Complete!")
    print("=" * 60)
    print()
    print("🔐 Identity Benefits:")
    print("   ✓ Agents can't impersonate each other")
    print("   ✓ Public keys are discoverable")
    print("   ✓ Private keys stay with agent")
    print("   ✓ Sybil resistance (can't fork and re-register)")
    print()
    print("🚧 Coming Soon:")
    print("   • Request signing with private key")
    print("   • Signature verification on API")
    print("   • Challenge-response identity proofs")
    print()


def demo_why_identity_matters():
    """Show the problem identity solves"""
    print("\n" + "=" * 60)
    print("💡 Why Identity Matters")
    print("=" * 60)
    print()
    
    print("WITHOUT Identity Verification:")
    print("❌ Agent 'TrustedBot' builds reputation (100 successful transactions)")
    print("❌ Attacker forks code, registers as 'TrustedBot2'")
    print("❌ Marketplace shows two 'TrustedBot' agents")
    print("❌ No way to verify which is the original")
    print("❌ Reputation system becomes meaningless")
    print()
    
    print("WITH Identity Verification:")
    print("✅ Agent 'TrustedBot' registers with Ed25519 keypair")
    print("✅ Public key stored in registry")
    print("✅ All requests signed with private key")
    print("✅ Attacker can fork code but can't steal private key")
    print("✅ Only original 'TrustedBot' can sign valid requests")
    print("✅ Reputation is cryptographically tied to identity")
    print()


if __name__ == "__main__":
    import sys
    
    if "--why" in sys.argv:
        demo_why_identity_matters()
    else:
        demo_identity_workflow()
