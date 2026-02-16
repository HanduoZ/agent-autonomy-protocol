#!/usr/bin/env python3
"""
A2AP Permission Model Example

Demonstrates how agents can grant and verify permissions
before executing capability trades.

This is exploratory code for the formal permission model
(mentioned in Issue #? - see GOVERNANCE.md for context).
"""

from enum import Enum
from dataclasses import dataclass
from typing import List, Optional, Dict
import json


class PermissionLevel(Enum):
    """Permission levels for capability trades"""
    NONE = "none"              # No access
    PREVIEW = "preview"        # Can see capability details
    LIMITED = "limited"        # Can purchase up to a limit
    UNLIMITED = "unlimited"    # Full access


class PermissionScope(Enum):
    """What the permission applies to"""
    SINGLE_TRANSACTION = "single"      # One-time use
    DAILY_LIMIT = "daily"              # Up to N transactions/day
    CAPABILITY = "capability"          # This specific capability
    CATEGORY = "category"              # All capabilities in category
    AGENT = "agent"                    # All capabilities from this agent
    GLOBAL = "global"                  # All marketplace access


@dataclass
class Permission:
    """Permission grant from one agent to another"""
    grantor_id: str                 # Agent granting permission
    grantee_id: str                 # Agent receiving permission
    level: PermissionLevel          # What level of access
    scope: PermissionScope          # What it applies to
    target_id: Optional[str] = None # Capability/category/agent ID (if applicable)
    
    max_transactions_per_day: Optional[int] = None
    max_tokens_per_transaction: Optional[int] = None
    expires_at: Optional[str] = None  # ISO timestamp
    
    metadata: Dict = None           # Custom data (reason, notes, etc.)
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}
    
    def to_dict(self):
        return {
            "grantor_id": self.grantor_id,
            "grantee_id": self.grantee_id,
            "level": self.level.value,
            "scope": self.scope.value,
            "target_id": self.target_id,
            "max_transactions_per_day": self.max_transactions_per_day,
            "max_tokens_per_transaction": self.max_tokens_per_transaction,
            "expires_at": self.expires_at,
            "metadata": self.metadata
        }


class PermissionModel:
    """
    Formal permission model for A2AP marketplace.
    
    Agents control who can purchase their capabilities
    and under what conditions.
    """
    
    def __init__(self):
        # In real impl: stored in database
        self.permissions: List[Permission] = []
    
    def grant_permission(self, permission: Permission) -> bool:
        """Grant a permission"""
        self.permissions.append(permission)
        print(f"✅ Granted {permission.level.value} access")
        print(f"   {permission.grantee_id} -> {permission.grantor_id}")
        print(f"   Scope: {permission.scope.value}")
        if permission.target_id:
            print(f"   Target: {permission.target_id}")
        return True
    
    def revoke_permission(
        self, 
        grantor_id: str, 
        grantee_id: str,
        scope: PermissionScope,
        target_id: Optional[str] = None
    ) -> bool:
        """Revoke a permission"""
        self.permissions = [
            p for p in self.permissions
            if not (
                p.grantor_id == grantor_id and
                p.grantee_id == grantee_id and
                p.scope == scope and
                p.target_id == target_id
            )
        ]
        print(f"✅ Revoked permission")
        return True
    
    def check_permission(
        self,
        grantor_id: str,
        grantee_id: str,
        scope: PermissionScope,
        target_id: Optional[str] = None,
        tokens: Optional[int] = None
    ) -> bool:
        """Check if grantee has permission to act"""
        for perm in self.permissions:
            if (perm.grantor_id == grantor_id and
                perm.grantee_id == grantee_id and
                perm.scope == scope and
                (perm.target_id is None or perm.target_id == target_id)):
                
                # Check token limit
                if tokens and perm.max_tokens_per_transaction:
                    if tokens > perm.max_tokens_per_transaction:
                        return False
                
                # Check expiry
                # (In real impl: compare with current time)
                
                return True
        
        return False
    
    def list_permissions(self, agent_id: str, as_grantor: bool = True) -> List[Permission]:
        """List permissions (granted by or granted to agent)"""
        if as_grantor:
            return [p for p in self.permissions if p.grantor_id == agent_id]
        else:
            return [p for p in self.permissions if p.grantee_id == agent_id]


def example_scenarios():
    """Real-world permission scenarios"""
    
    model = PermissionModel()
    
    print("=" * 60)
    print("SCENARIO 1: Trust a specific agent")
    print("=" * 60)
    print()
    
    # DataProcessor trusts CodeAnalyzer completely
    perm1 = Permission(
        grantor_id="DataProcessor",
        grantee_id="CodeAnalyzer",
        level=PermissionLevel.UNLIMITED,
        scope=PermissionScope.AGENT,
        target_id="DataProcessor",
        metadata={"reason": "Long-standing partner, proven reliability"}
    )
    model.grant_permission(perm1)
    
    print()
    print("=" * 60)
    print("SCENARIO 2: Limited trial access")
    print("=" * 60)
    print()
    
    # Grant NewAgent limited daily access
    perm2 = Permission(
        grantor_id="PaymentProcessor",
        grantee_id="NewAgent",
        level=PermissionLevel.LIMITED,
        scope=PermissionScope.CAPABILITY,
        target_id="payment-verification",
        max_transactions_per_day=10,
        max_tokens_per_transaction=500,
        metadata={"reason": "Trial period - 7 days", "approval_date": "2026-02-16"}
    )
    model.grant_permission(perm2)
    
    print()
    print("=" * 60)
    print("SCENARIO 3: Category-wide access")
    print("=" * 60)
    print()
    
    # Allow all agents in 'nlp' category to use analysis tools
    perm3 = Permission(
        grantor_id="NLPTools",
        grantee_id="all-nlp-agents",  # Would be agent group in real impl
        level=PermissionLevel.UNLIMITED,
        scope=PermissionScope.CATEGORY,
        target_id="nlp",
        metadata={"reason": "Ecosystem partnership", "auto_renew": True}
    )
    model.grant_permission(perm3)
    
    print()
    print("=" * 60)
    print("CHECKING PERMISSIONS")
    print("=" * 60)
    print()
    
    # Can CodeAnalyzer use DataProcessor's capabilities?
    can_use = model.check_permission(
        grantor_id="DataProcessor",
        grantee_id="CodeAnalyzer",
        scope=PermissionScope.AGENT,
        target_id="DataProcessor"
    )
    print(f"Can CodeAnalyzer use DataProcessor? {can_use}")
    
    # Can NewAgent use payment-verification 100 times in one day?
    can_use = model.check_permission(
        grantor_id="PaymentProcessor",
        grantee_id="NewAgent",
        scope=PermissionScope.CAPABILITY,
        target_id="payment-verification",
        tokens=1000  # Exceeds limit
    )
    print(f"Can NewAgent use payment-verification with 1000 tokens? {can_use}")
    
    print()
    print("=" * 60)
    print("REVOKING PERMISSIONS")
    print("=" * 60)
    print()
    
    # Revoke trial access
    model.revoke_permission(
        grantor_id="PaymentProcessor",
        grantee_id="NewAgent",
        scope=PermissionScope.CAPABILITY,
        target_id="payment-verification"
    )
    
    print()
    print("=" * 60)
    print("OPEN QUESTIONS")
    print("=" * 60)
    print()
    print("1. Should permissions be tradeable? (A grants B access, B grants C access)")
    print("2. What about delegation? (A grants B permission to grant permissions)")
    print("3. How do we prevent permission chains from scaling out of control?")
    print("4. Should permissions be publicly visible? (Privacy vs transparency)")
    print("5. Can permissions be revoked retroactively? (Already completed transactions)")
    print()
    print("Discuss: https://github.com/HanduoZ/agent-autonomy-protocol/discussions")


if __name__ == "__main__":
    example_scenarios()
