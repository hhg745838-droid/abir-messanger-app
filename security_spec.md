# MyMessenger Security Specification

## 1. Data Invariants
- **Identity Isolation**: A user can only write to their own profile `users/{uid}` and username claim `usernames/{username}`.
- **Mutual Conversation Membership**: A conversation can only be read or written by users whose UIDs are present in `participants`.
- **Message Integrity**: A message in `conversations/{conversationId}/messages/{messageId}` must have `senderId == request.auth.uid`. A user cannot forge messages from another participant.
- **Relational Integrity**: Call sessions `calls/{callId}` are strictly limited to `callerId` and `receiverId`. No third party can read or inject ICE candidates.
- **Strict Keys**: Username documents only contain `uid`, `username`, and `reservedAt`.

## 2. The "Dirty Dozen" Threat Payloads Audited
1. **Ghost Participant Read**: User C queries `conversations/{convId}` where participants are [A, B] -> Denied by `request.auth.uid in resource.data.participants`.
2. **Forged Message Sender**: User A sends message with `senderId: "UserB"` -> Denied by `request.resource.data.senderId == request.auth.uid`.
3. **Non-Participant Message Eavesdrop**: User C listens to `conversations/{convId}/messages` -> Denied by parent conversation participants check.
4. **Username Hijack**: User A writes to `usernames/alice` while authenticated as Bob -> Denied by `request.resource.data.uid == request.auth.uid`.
5. **Username Length Exhaustion**: Attacker submits 50KB string as username -> Denied by `username.size() <= 30`.
6. **User Profile Impersonation**: User A updates `users/{userB}` -> Denied by `request.auth.uid == userId`.
7. **Signal Snooping**: User C listens to WebRTC SDP / ICE candidates on `calls/{callId}` -> Denied by `callerId == auth.uid || receiverId == auth.uid`.
8. **Storage Size Attack**: Uploading a 500MB executable to chat storage -> Denied by `request.resource.size < 25 * 1024 * 1024`.
9. **Avatar Storage Hijack**: User A overwrites `avatars/{userB}/profile.png` -> Denied by `request.auth.uid == userId`.
10. **Shadow Field Injection**: Injecting administrative privilege flags into `User` document -> Profile rules only allow owner mutations and application only reads user profiles.
11. **Conversation Tampering**: Non-participant modifying conversation `typing` or `unreadCount` -> Denied by `request.auth.uid in resource.data.participants`.
12. **Orphan Message Injection**: Sending message to nonexistent conversation -> Denied by `get(/databases/$(database)/documents/conversations/$(convId))` lookup.
