import asyncio
from app.core.schemas import DiffInput
from app.agents.orchestrator import run_parallel_review

# Sample diff with an obvious SQL injection and N+1 query
SAMPLE_DIFF = """
--- a/users.py
+++ b/users.py
@@ -10,4 +10,8 @@
 def get_user_data(user_id):
+    query = f"SELECT * FROM users WHERE id = '{user_id}'"
+    user = db.execute(query)
+    for friend in user.friends:
+        db.execute(f"SELECT * FROM profiles WHERE id = {friend.id}")
     return user
"""

async def test():
    print("Testing 3 parallel subagents...")
    payload = DiffInput(diff_text=SAMPLE_DIFF)
    report = await run_parallel_review(payload)
    
    print("\n--- TEST RESULTS ---")
    print(f"Health Score: {report.health_score}/100")
    print(f"Total Issues Found: {report.total_issues}")
    print(f"Security findings: {len(report.security)}")
    print(f"Performance findings: {len(report.performance)}")
    print(f"Architecture findings: {len(report.architecture)}")
    
    for item in report.security + report.performance + report.architecture:
        print(f"\n[{item.category}] ({item.severity}) Line {item.line_number}: {item.issue}")
        print(f"Patch preview:\n{item.patch}")

if __name__ == "__main__":
    asyncio.run(test())