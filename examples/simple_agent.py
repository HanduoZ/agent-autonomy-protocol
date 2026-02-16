#!/usr/bin/env python3
"""
Simple A2AP Agent Example

Demonstrates:
1. Registering an agent
2. Publishing a capability
3. Discovering other capabilities
4. Recording transactions
"""

import requests
import json
from typing import Dict, Optional

class A2APAgent:
    """Simple agent that interacts with the A2AP marketplace"""
    
    def __init__(self, base_url: str = "http://localhost:3000/v1"):
        self.base_url = base_url
        self.agent_id: Optional[str] = None
        self.api_key: Optional[str] = None
        
    def register(self, name: str, description: str) -> Dict:
        """Register a new agent with the marketplace"""
        response = requests.post(
            f"{self.base_url}/agents",
            json={
                "name": name,
                "description": description
            }
        )
        response.raise_for_status()
        data = response.json()
        
        self.agent_id = data["id"]
        self.api_key = data["api_key"]
        
        print(f"✅ Registered as {name}")
        print(f"   Agent ID: {self.agent_id}")
        print(f"   API Key: {self.api_key[:20]}...")
        
        return data
    
    def _headers(self) -> Dict[str, str]:
        """Get auth headers for API requests"""
        if not self.api_key:
            raise ValueError("Agent not registered. Call register() first.")
        return {"Authorization": f"Bearer {self.api_key}"}
    
    def publish_capability(
        self, 
        name: str, 
        description: str,
        category: str,
        price_per_use: int,
        input_schema: Dict
    ) -> Dict:
        """Publish a capability to the marketplace"""
        response = requests.post(
            f"{self.base_url}/agents/{self.agent_id}/capabilities",
            headers=self._headers(),
            json={
                "name": name,
                "description": description,
                "category": category,
                "price_per_use": price_per_use,
                "input_schema": input_schema
            }
        )
        response.raise_for_status()
        data = response.json()
        
        print(f"✅ Published capability: {name}")
        print(f"   Price: {price_per_use} tokens/use")
        
        return data
    
    def discover_capabilities(self, category: Optional[str] = None) -> list:
        """Search for capabilities in the marketplace"""
        params = {}
        if category:
            params["category"] = category
            
        response = requests.get(
            f"{self.base_url}/capabilities",
            headers=self._headers(),
            params=params
        )
        response.raise_for_status()
        capabilities = response.json()
        
        print(f"\n📊 Found {len(capabilities)} capabilities:")
        for cap in capabilities[:5]:  # Show first 5
            print(f"   - {cap['name']} ({cap['category']}) - {cap['price_per_use']} tokens")
            print(f"     by {cap['agent_name']}")
        
        return capabilities
    
    def record_transaction(
        self,
        seller_id: str,
        capability_id: str,
        amount: int,
        status: str = "completed",
        metadata: Optional[Dict] = None
    ) -> Dict:
        """Record a transaction (purchase of a capability)"""
        response = requests.post(
            f"{self.base_url}/transactions",
            headers=self._headers(),
            json={
                "buyer_id": self.agent_id,
                "seller_id": seller_id,
                "capability_id": capability_id,
                "amount": amount,
                "status": status,
                "metadata": metadata or {}
            }
        )
        response.raise_for_status()
        data = response.json()
        
        print(f"✅ Transaction recorded")
        print(f"   Status: {status}")
        print(f"   Amount: {amount} tokens")
        
        return data
    
    def get_reputation(self) -> Dict:
        """Get agent's reputation score"""
        response = requests.get(
            f"{self.base_url}/agents/{self.agent_id}/reputation",
            headers=self._headers()
        )
        response.raise_for_status()
        return response.json()


def main():
    """Example usage"""
    print("🤖 A2AP Agent Example\n")
    
    # Create an agent
    agent = A2APAgent()
    
    # Register
    agent.register(
        name="ExampleBot",
        description="Demonstrates A2AP marketplace interactions"
    )
    
    print("\n" + "="*50 + "\n")
    
    # Publish a capability
    agent.publish_capability(
        name="Text Summarization",
        description="Summarize long text into key points",
        category="nlp",
        price_per_use=50,
        input_schema={
            "type": "object",
            "properties": {
                "text": {"type": "string"},
                "max_length": {"type": "number"}
            },
            "required": ["text"]
        }
    )
    
    print("\n" + "="*50 + "\n")
    
    # Discover other capabilities
    agent.discover_capabilities(category="nlp")
    
    print("\n" + "="*50 + "\n")
    
    # Check reputation
    rep = agent.get_reputation()
    print(f"📊 Reputation: {rep.get('reputation_score', 'N/A')}")
    print(f"   Successful transactions: {rep.get('successful_transactions', 0)}")
    print(f"   Failed transactions: {rep.get('failed_transactions', 0)}")
    
    print("\n✅ Example complete!")
    print(f"\n💡 Your API key: {agent.api_key}")
    print("   Save this to continue using this agent identity.\n")


if __name__ == "__main__":
    main()
